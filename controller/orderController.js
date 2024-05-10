const Order = require('../model/orderModel')
const Cart = require('../model/cartModel')
const Product = require('../model/productModel')
const crypto = require("crypto")
const path = require('path')
const Razorpay=require('razorpay')
const env = require("dotenv").config();

const razorpayInstance = new Razorpay({
  key_id: 'process.env.RAZORPAY_ID_KEY',
  key_secret: 'process.env.RAZORPAY_SECRET_KEY',
});



const decreaseProductQuantity = async (products) => {
  for (let i = 0; i < products.length; i++) {
    let product = products[i].productId;
    let count = products[i].count;
    await Product.updateOne(
      { _id: product },
      { $inc: { quantity: -count } },
    );
  }
};
//===========order place=====================//
const placeOrder = async (req, res) => {
  try {
      const user_id = req.session.user_id;
      console.log(user_id);
      const userData = await User.findById({ _id: user_id });
      const cartData = await Cart.findOne({ user: user_id }).populate("products.productId");
      if (!cartData) {
        res.status(404).json({ error: "Cart data not found" });
        return;
      }
  
      const paymentMethod = req.body.formData.payment;
      const status = paymentMethod === 'COD' ? 'Placed' : 'Pending';
      const address = req.body.formData.address;
  
      let totalAmount = cartData.products.reduce(
        (acc, val) => acc + (val.productId.price * val.count || 0),
        0,
      );
      let shippingAmount = totalAmount > 1500 ? 90 : 0; // Correctly calculate shipping amount based on totalAmount
  
      // Correctly calculate totalAmount including shipping
      totalAmount += shippingAmount;
  
      const uniqId = crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()
        .slice(0, 8);
  
      const productIds = cartData.products.map(product => product.productId);
      const products = await Product.find({ _id: { $in: productIds } });
      const productData = cartData.products.map(cartProduct => {
        const productDetails = products.find(p => p._id.toString() === cartProduct.productId._id.toString());
        console.log('log', productDetails);
  
        if (cartProduct.count > productDetails.quantity) {
          return res.status(400).json({ quantity: true });
        }
        console.log('image', productDetails.images);
        return {
          productId: cartProduct.productId._id,
          count: cartProduct.count,
          productPrice: productDetails ? productDetails.price : 0,
          image: productDetails.images ? productDetails.images : '',
          totalPrice: productDetails.price * cartProduct.count,
          status: status,
          name: productDetails ? productDetails.name : '',
        };
      });
  
      const order = new Order({
        user: user_id,
        orderId: uniqId,
        deliveryDetails: address,
        products: productData,
        date: new Date(),
        totalAmount: totalAmount, 
        paymentMethod: paymentMethod,
        shippingMethod: cartData.shippingMethod,
        shippingAmount: shippingAmount, // Correctly set shippingAmount
      });
  
      const orderData = await order.save();
      const orderId = orderData._id;
      await decreaseProductQuantity(cartData.products);
  
      if (orderData.paymentMethod === 'COD') {
        await Cart.deleteOne({ user: user_id });
        return res.json({ codsuccess: true, orderId });
      }
  } catch (error) {
      console.error(error.message);
      res.status(500).render('500');
  }
 };
 
 
 
//===========order sucess==================//
const orderSuccess = async (req, res) => {
  try {
    res.render('orderSuccess')
  } catch (error) {
    console.log(error);
  }
}

const orderDetails = async (req, res) => {
  try {

    const userId = req.body.user_id
    const orderDetails = await Order.find({ _id: req.query._id }).populate("products.productId")
    res.render('orderDetails', { order: orderDetails,user:userId })
  } catch (error) {
    console.log(error);
  }
}
/////=================cancel order=====================//
const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user_id
    console.log(req.session.user_id)
    const orderId = req.body.orderId
    const productId = req.body.productId
    console.log(req.body);

    const orderedData = await Order.findOne({ _id: orderId })
    console.log('ordeeredataaaaa', orderedData);
    console.log('ordereddddproductsdetails', orderedData.products);
    const orderedProduct = orderedData.products.find(product => {
      return product._id.toString() === productId;
    })
 
    const updateOrder = await Order.findOneAndUpdate(
      { _id: orderId, 'products._id': productId },
      { $set: { 'products.$.status': 'Cancelled' } },
      { new: true }
    );


    console.log('statuss', updateOrder);

    const updateProductQuantity = await Product.updateOne(
      { _id: orderedProduct.productId },
      { $inc: { quantity: orderedProduct.count } }
    )

    console.log('quantiryyyy', updateProductQuantity);
    return res.json({ success: true })

  } catch (error) {
    console.log(error, "while cancelling the order");
  }
}
//==================adminside order===========================================//
 
const loadOrder = async (req, res) => {
  try {
      const admin = req.session.admin;
     
      const page = parseInt(req.query.page) || 1;
      const limit = 6;
      const skip = (page - 1) * limit;
      const totalOrders = await Order.countDocuments({
        'products.status': { $nin: ['pending'] },
      });
 
      const totalPages = Math.ceil(totalOrders / limit);
  
      
      const orderData = await Order.find({
        'products.status': { $nin: ['pending'] },
      }).sort({ date: -1 }).skip(skip).limit(limit);
  
      res.render("order", {
        orderData,
        currentPage: page,
        totalPages: totalPages
      })
      
  } catch (error) {
      res.redirect("/error")
      console.log('error at loadOrder at admin',error);
  }
};

//=================order details==============//

const orderdetailsLoad = async (req, res) => {
  try {
     const orderId = req.query._id;
     console.log(orderId, "Order ID");
 
     const orderData = await Order.findOne({ _id: orderId }).populate({
       path: 'products.productId',
       populate: {
         path: 'category',
         select:'name'
       }
     });
     const orderDetails = await Order.find({ _id: req.query._id }).populate("products.productId")
     console.log("orderdetaiiiiiiiils",orderDetails)
     if (orderData) {
       const totalItems = orderData.products.reduce((total, product) => total + product.count, 0);
       const subtotal = orderData.products.reduce((total, product) => total + product.totalPrice, 0);
       const tax = subtotal * 0.1;
       const shippingCharge = orderData.shippingAmount; // Assuming shippingAmount is part of the order details
 
       // Include shipping charge in the total amount
       const totalAmount = subtotal + tax + shippingCharge;
 
       res.render('orderDetails', {orderData, totalItems, subtotal, tax, shippingCharge, totalAmount,order:orderDetails });
     } else {
       res.render('orderDetails', { userId: req.session.user_id });
     }
  } catch (error) {
     console.log('Error while loading orderManagement:', error);
     res.status(500).send('Internal Server Error');
  }
 };
 






module.exports = {
  placeOrder,
  orderSuccess,
  orderDetails,
  cancelOrder,

  //admin side
  loadOrder,
  orderdetailsLoad

}