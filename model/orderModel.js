const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String, required: true },
  deliveryDetails: { 
    fullName: String,
    mobile: String,
    email: String,
    houseName: String,
    city: String,
    state: String,
    pin: String
  },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: {
      type: String,
    },
    count: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    productPrice: { type: Number, required: true },
    productStatus: {
      type: String,
    },
    
  }],
  couponDiscount: {
    type: Number,
    default: 0
  },
  subtotal : {
    type: Number,
  required: true 
  },
  returnReason: {
    type: String,
 },
  date: { type: Date, default: Date.now },
  orderStatus: { type: String, required: true },
  totalAmount: { type: Number, required: true },
 
  paymentMethod: { type: String, required: true },
},{
  timestamps: true, 
 });

const Order = mongoose.model('Order', OrderSchema);
module.exports = Order;

