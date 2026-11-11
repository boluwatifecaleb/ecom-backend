import Order from '../models/order.js';
import Cart from '../models/cart.js';
import User from '../models/users.js';
import redis, { invalidateProductCache } from '../config/redis.js';
import { invoiceQueue } from '../queues/invoiceQueue.js';
import { createOrderWithItems, markPgOrderPaid, setPgOrderStatus } from '../db/orderRepo.js';
import Product from '../models/product.js';  
// this is the controller that handles the checkout process(places an order), it 
// takes the items in the user's cart and creates an order with 
// them, then it clears the cart.

const restoreStock = async (reserved) => {
  for (const item of reserved) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
  await invalidateProductCache().catch((e) => console.error('Cache invalidation failed:', e.message));
};

export const checkout = async (req, res) => {
    const reserved = [];
    let order = null;
    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
        }));
        const totalAmount = orderItems.reduce(
            (total, item) => total + item.price * item.quantity, 0);

        // 1. reserve stock atomically, item by item
        for (const item of orderItems) {
            const updated = await Product.findOneAndUpdate(
                { _id: item.product, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } }
            );
            if (!updated) {
                await restoreStock(reserved);   // undo only what we already took
                return res.status(400).json({ message: `Insufficient stock for ${item.name}` });
            }
            reserved.push({ product: item.product, quantity: item.quantity });
        }
        await invalidateProductCache().catch((e) => console.error('Cache invalidation failed:', e.message));

        // 2. create the Mongo order
        order = await Order.create({
            user: req.user.id,
            items: orderItems,
            totalAmount
        });

        // 3. write to Postgres; on failure, undo everything
        try {
            const pgOrderId = await createOrderWithItems({
                mongoOrderId: order._id.toString(),
                userId: req.user.id,
                totalAmount,
                items: orderItems,
            });
            order.pgOrderId = pgOrderId;
            await order.save();
        } catch (pgError) {
            console.error('Postgres write failed:', pgError.message);
            order.status = 'failed';
            await order.save();
            await restoreStock(reserved);
            return res.status(502).json({ message: 'Could not complete order, please try again' });
        }

        cart.items = [];
        await cart.save();

        res.status(201).json({ message: 'Order placed successfully', order });
    } catch (error) {
        if (!order) await restoreStock(reserved).catch(() => {});
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({user: req.user.id}).populate('items.product');
        res.status(200).json({orders});
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message});
    }
};

export const initializePayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const user = await User.findById(req.user.id);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(order.totalAmount * 100),
        metadata: { orderId: order._id.toString() },
      }),
    });

    const data = await response.json();
    console.log('Paystack response:', data);

    order.paymentReference = data.data.reference;
    await order.save();

    res.status(200).json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const fulfillPaidOrder = async (orderId) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { status: 'paid' },
    { new: true }
  );
  if (!order) return null;   // already paid, or not payable: do nothing

  await invoiceQueue.add('generateInvoice', {
    orderId: order._id.toString(),
    userId: order.user.toString(),
  });

  if (order.pgOrderId) {
    try {
      await markPgOrderPaid(order.pgOrderId);
    } catch (err) {
      console.error('Postgres status update failed:', err.message);
    }
  }
  return order;
};

export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (data.data.status === 'success') {
      const order = await Order.findOne({ paymentReference: reference });
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (data.data.amount !== Math.round(order.totalAmount * 100)) {
        return res.status(400).json({ message: 'Amount paid does not match order total' });
      }
      await fulfillPaidOrder(order._id);
      const current = await Order.findById(order._id);
      return res.status(200).json({ message: 'Payment verified', order: current });
    }

    res.status(400).json({ message: 'Payment not successful', data: data.data });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const handleWebhook = async (req, res) => {
  let dedupeKey;
  try {
    const event = JSON.parse(req.body.toString());

    if (event.event !== 'charge.success') {
      return res.sendStatus(200);
    }

    const reference = event.data.reference;
    dedupeKey = `webhook:${event.event}:${reference}`;

    const firstTime = await redis.set(dedupeKey, 'done', { nx: true, ex: 60 * 60 * 24 * 7 });
    if (!firstTime) {
      console.log('Duplicate webhook ignored:', dedupeKey);
      return res.sendStatus(200);
    }

    const order = await Order.findOne({ paymentReference: reference });
    if (!order) {
      await redis.del(dedupeKey);
      return res.sendStatus(404);
    }

    if (event.data.amount !== Math.round(order.totalAmount * 100)) {
      console.error('Webhook amount mismatch for', reference);
      return res.sendStatus(200);
    }

    await fulfillPaidOrder(order._id);
    res.sendStatus(200);
  } catch (error) {
    if (dedupeKey) await redis.del(dedupeKey).catch(() => {});
    res.sendStatus(500);
  }
};

export const cancelOrder = async (req, res) => {
  try {
    // atomic: only a pending order owned by this user can flip, and only once
    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, user: req.user.id, status: 'pending' },
      { status: 'cancelled' },
      { returnDocument: 'after' }
    );
    if (!order) return res.status(404).json({ message: 'Pending order not found' });

    await restoreStock(order.items.map((i) => ({ product: i.product, quantity: i.quantity })));
    if (order.pgOrderId) {
      await setPgOrderStatus(order.pgOrderId, 'cancelled').catch((e) => console.error(e.message));
    }
    res.status(200).json({ message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};