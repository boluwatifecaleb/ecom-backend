import Product from '../models/product.js';
// invalidateProductCache is a custom helper function I created to clear the product cache 
// whenever a product is created, updated, or deleted. This 
// ensures that users always see the most up-to-date product information.
import redis, {invalidateProductCache} from '../config/redis.js';

export const createProduct = async (req, res) => {
    try {
        const {name, description, price, stock, category, sku} = req.body;
        const product = new Product({name, description, price, stock, category, sku});
        await product.save();

        // Invalidate the product cache
        await invalidateProductCache();

        res.status(201).json({message: 'Product created successfully', product});
    } catch (error) {
        res.status(500).json({message:'Server Error', 
            error: error.message});
    }
};

export const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    // this is a partial search, it will return products that contain 
    // the search term in their name, case insensitive
    if (req.query.search) filter.name = { 
      $regex: req.query.search, 
// $options: 'i' marks it case-insensitive (e.g., matching both "Nike" and "nike")
      $options: 'i' };

// If user A searches for page=1&search=hat and user B searches for page=2&search=shoes, they cannot share a cache key. 
// This line generates a custom key matching their exact parameters
    const cacheKey = `products:page=${page}:limit=${limit}:category=${req.query.category || ''}:search=${req.query.search || ''}`;

// Queries Redis In-Memory DB for this specific string key.
    const cached = await redis.get(cacheKey);
// If the string exists, it bypasses MongoDB completely and returns the 
// cached data to the user, saving time and resources.
    if (cached) {
      console.log('Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('Cache MISS:', cacheKey);

    const products = await Product.find(filter)
      .populate('category')
      .skip(skip)
      .limit(limit);

// Counts the absolute total number of rows matching the query. This is 
// required so the frontend knows how many page numbers to render.
    const totalProducts = await Product.countDocuments(filter);

    const responseData = {
      products,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
    };

// okk, so within the 60 seceonds, what the first user has cached, if other users 
// search for it, it comes from redis rather than from mongoDB
// EACH HAVING UIQUE CACHE key 
    await redis.set(cacheKey, responseData, { ex: 60 }); // cache for 60s

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProductsFeed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor; // last seen _id from previous page

    const filter = {};
    if (cursor) {
      filter._id = { $gt: cursor };
    }

    const products = await Product.find(filter)
      .sort({ _id: 1 })
      .limit(limit);

    const nextCursor = products.length > 0 ? products[products.length - 1]._id : null;

    res.status(200).json({
      products,
      nextCursor,
      hasMore: products.length === limit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await invalidateProductCache(); // Invalidate the product cache after update

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await invalidateProductCache(); // Invalidate the product cache after deletion

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};