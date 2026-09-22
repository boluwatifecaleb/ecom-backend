import Order from '../models/order.js';
import Cart from '../models/cart.js';
import User from '../models/users.js';
import { invoiceQueue } from '../queues/invoiceQueue.js';

// this is the controller that handles the checkout process(places an order), it 
// takes the items in the user's cart and creates an order with 
// them, then it clears the cart.
export const checkout = async (req, res) => {
    try {
        const cart = await Cart.findOne({user: req.user.id}).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({message: 'Cart is empty'});
        }
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
        }));
        const totalAmount = orderItems.reduce(
            (total, item) => total + item.price * item.quantity, 
            0);

        // let totalAmt = 0;
        // for (const item of orderItems) {
        //     totalAmt += item.price * item.quantity;
        // }

        const order = await Order.create({
            user: req.user.id,
            items: orderItems,
            totalAmount
        });

        cart.items = [];
        await cart.save();

        res.status(201).json({
            message: 'Order placed successfully', 
            order});
    }catch (error) {
        res.status(500).json({message: 'Server error', error: error.message});
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
      order.status = 'paid';
      await order.save();

      await invoiceQueue.add('generateInvoice', {
        orderId: order._id.toString(),
        userId: order.user.toString(),
      });

      return res.status(200).json({ message: 'Payment verified', order });
    }

    res.status(400).json({ message: 'Payment not successful', data: data.data });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};