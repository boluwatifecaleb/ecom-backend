import mongoose from 'mongoose';
// this is our snapshot of the order, it contains the product 
// name and price at the time of the order, so that if the 
// product price changes later, we still have a record of what 
// the user paid for it.
const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                    min: 0
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'shipped', 
                    'delivered', 'cancelled'],
            default: 'pending'
        },
//This is where you'll store the unique transaction ID Paystack gives you — it's how you'll later 
// ask Paystack "did this specific transaction actually succeed?
        paymentReference: {
            type: String,
        }
    },
    {timestamps: true}
);

const Order = mongoose.model('Order', orderSchema);
export default Order;