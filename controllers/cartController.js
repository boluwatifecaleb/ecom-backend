import Cart from '../models/cart.js';

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

export const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await cart.populate('items.product');

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// check if product exists in cart, if yes update quantity, if not add new item
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const cart = await getOrCreateCart(req.user.id);
    const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json(cart);
} catch (error) {
    res.status(500).json({message: 'Server error', error: error.message});
    }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await getOrCreateCart(req.user.id);

    cart.items = cart.items.filter(
      (item) => item.product?.toString() !== productId
    );

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};