import Order from '../models/order.js';

export const getRevenueByStatus = async (req, res) => {
  try {
    const revenueByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);
// so this is the response the user receives on the frontend
// the sum of the revenue and the count of the orders for each status (pending, paid, shipped, delivered, cancelled)
    res.status(200).json({ revenueByStatus });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
// arranges the totalSold in descending order, so the product with the highest totalSold comes first
// and keeps the tops best 5 seeling products
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({ topProducts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};