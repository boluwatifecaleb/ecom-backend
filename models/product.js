// in this I reference other schemas, the category schema to be specific, 
// so I need to import mongoose to use the ObjectId type for the category field.
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    // SKU, stock keeping Unit is a unique alphanumeric 
    // code assigned to a product to identify its exact variant, size, color, and manufacturer details
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
},
}, { timestamps: true });

productSchema.index({ category: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;