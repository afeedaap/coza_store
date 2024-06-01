const Order = require("../model/orderModel");
const Cart = require("../model/cartModel");
const Product = require("../model/productModel");
const Address = require("../model/addressModel")
const User = require("../model/userModel");
const Coupon = require("../model/couponModel");
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');
const {checkAllOffer,calculateDiscountedPrice } = require("../config/offer"); 
const path = require("path");
const crypto = require('crypto');
const easyInvoice = require("easyinvoice");
const PDFDocument = require("pdfkit");
const fs = require("fs");
require("dotenv").config();
const uniqid = require('uniqid');
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id:process.env.RAZORPAY_KEY,
  key_secret:process.env.RAZORPAY_SECRET
})
const placeOrder = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const userData = await User.findById({ _id: user_id });
    const cartData = await Cart.findOne({ user: user_id }).populate("products.productId");

    if (!cartData || !cartData.products || cartData.products.length === 0) {
      return res.status(404).json({ error: "Cart data not found" });
    }

    const isValidOrder = cartData.products.every(product => {
      const productInCart = product.productId;
      return productInCart.quantity >= product.count;
    });

    if (!isValidOrder) {
      return res.json({ stock: true });
    }

    const paymentMethod = req.body.formData.payment;
    const status = paymentMethod == "COD" || paymentMethod == "wallet" ? "placed" : "Pending";
    const existingAddress = await Address.findOne({ user: user_id });
    let address = req.body.formData.address;

    if (existingAddress && existingAddress.address.length == 0) {
      existingAddress.address.push(address);
      await existingAddress.save();
    } else {
      const newAddress = new Address({ user: user_id, address: [address] });
      await newAddress.save();
    }

    // Calculate total amount and product prices
    let totalAmount = 0;
    const orderProducts = cartData.products.map(product => {
      const productPrice = product.productId.price;
      const totalPrice = cartData.totalPrice;
      totalAmount = totalPrice;

      return {
        productId: product.productId._id,
        count: product.count,
        productPrice,
        totalPrice
      };
    });

    const orderId = uniqid();
    const order = new Order({
      user: user_id,
      orderId: orderId,
      deliveryDetails: address,
      products: orderProducts,
      date: new Date(),
      orderStatus: status,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
    });

    const orderData = await order.save();
    req.session.order_id = orderData._id;

    if (paymentMethod == "razorpay") {
      var options = {
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: 'apafeeda@gmail.com',
      };

      instance.orders.create(options, async function (err, order) {
        if (err) {
          console.log("Razorpay error:", err, err?.message);
          return res.status(500).json({ error: 'Failed to create Razorpay order' });
        }
        res.json({ razorpay: true, order });
      });
    } else if (paymentMethod == "COD") {
      await Cart.deleteOne({ user: user_id });
      res.json({ codsuccess: true });
    } else {
      if (userData.wallet >= totalAmount) {
        const walletUpdate = await User.findOneAndUpdate(
          { _id: user_id },
          {
            $inc: { wallet:-totalAmount },
            $push: {
              walletHistory: {
                date: new Date(),
                amount:-totalAmount,
                direction: "Debit",
              },
            },
          },
          { new: true }
        );

        await Cart.deleteOne({ user: user_id });
        return res.json({ wallet: true });
      } else {
        return res.json({ walletAmount: true });
      }
    }
  } catch (error) {
    console.error("while order placing", error);
    res.status(500).render("500");
  }
};

const verifyPayment = async (req, res) => {
  try {
    console.log('verify payment route reached!!');
    const { response, order } = req.body;
    console.log('Request body:', req.body);

    const user_id = req.session.user_id;
    const cartData = await Cart.findOne({ user: user_id }).populate("products.productId");

    const hmac = crypto.createHmac('sha256', '0EHrXlWbOUcjY2KT7U8ehPeG'); 
    hmac.update(response.razorpay_order_id + '|' + response.razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === response.razorpay_signature) {
      console.log('Payment verified successfully!');

      // Find the order and update its status
      const orderData = await Order.findOne({ _id: order._id });
      if (orderData) {
        orderData.orderStatus = 'placed'; // Update the order status
        await orderData.save(); // Save the updated order
      }

      // Clear the user's cart
      await Cart.deleteOne({ user: user_id });

      res.json({ statusChanged: true });
    } else {
      console.log('Payment verification failed');
      res.json({ statusChanged: false });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render('500');
  }
};

const orderFailure = async (req,res) => {
  try {
    const query = req.query.id
    if(query){
    const user_id = req.session.user_id
    const cartData = await Cart.findOne({ user: user_id }).populate(
      "products.productId"
    );
    await decreaseProductQuantity(cartData.products);
    await Cart.deleteOne({ user: user_id });
    res.render("orderFailed")
  }else{
    res.render("orderFailed")
  }

  } catch (error) {
    res.status(500).render("500")
  }
}




const rayNow = async (req, res) => {
  try {
    const orderData = await Order.findById(req.body.orderId);
    if (!orderData) {
      console.log('Order not found');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    var options = {
      amount: orderData.totalAmount * 100,
      currency: 'INR',
      receipt: '' + orderData._id,
    };
    console.log('Options:', options);

    instance.orders.create(options, async function (err, order) {
      if (err) {
        console.log("Error creating order:", err);
        return res.status(500).json({ error: 'Failed to create order' });
      }
      console.log("New Order:", order);
      res.json({ razorpay: true, order });
    });
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};




const orderSuccess = async (req, res) => {
  try {
   if(req.query){
    const user_id = req.session.user_id
    const cartData = await Cart.findOne({ user: user_id }).populate(
      "products.productId"
    );
    if(cartData){
    await decreaseProductQuantity(cartData.products);
    await Cart.deleteOne({ user: user_id });
    }
      } else {
        console.log("Order not found");
      }
    
    res.render("orderSuccess");
  } catch (error) {
    console.log(error);
  }
};

const orderDetails = async (req, res) => {
  try {
    const userId = req.body.user_id;
    const orderDetails = await Order.find({ _id: req.query._id }).populate(
      "products.productId"
    );
    res.render("orderDetails", { order: orderDetails, user: userId });
  } catch (error) {
    console.log(error);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const user_Id = req.session.user_id;
    console.log("User ID:", user_Id);

    const orderId = req.body.orderId;
    const productId = req.body.productId;

    const orderedData = await Order.findOne({ _id: orderId });
    console.log("Ordered Data:", orderedData);

    const orderedProduct = orderedData.products.find((product) => {
      return product._id.toString() === productId;
    });
    console.log("oredered producttt", orderedProduct.totalPrice);

    const updateOrder = await Order.findOneAndUpdate(
      { _id: orderId, "products._id": productId },
      { $set: { "products.$.productStatus": "Cancelled" } },
      { new: true }
    );

    const updateProductQuantity = await Product.updateOne(
      { _id: orderedProduct.productId },
      { $inc: { quantity: orderedProduct.count } }
    );
    if (    
      orderedData.paymentMethod == "wallet"
    ) {
      const date = new Date();
      const UpdateWallet = await User.findOneAndUpdate(
        { _id: user_Id },
        {
          $inc: { wallet: orderedProduct.totalPrice },
          $push: {
            walletHistory: {
              date: date,
              amount: orderedProduct.totalPrice,
              direction: "Credit",
            },
          },
        },
        { new: true }
      );
      console.log("Updated Wallet:", UpdateWallet);
    }

    console.log("Product Quantity Update:", updateProductQuantity);
    return res.json({ success: true });
  } catch (error) {
    console.log("Error while cancelling the order:", error);
    return res
      .status(500)
      .render("500")
  }
};

// ------------------admin side ordersss =======================================//

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
      
 
       // Include shipping charge in the total amount
       const totalAmount = subtotal 
       console.log(totalAmount,"jkdvfkj vbgl")
 
       res.render('orderDetails', {orderData, totalItems, subtotal,  totalAmount,order:orderDetails });
     } else {
       res.render('orderDetails', { userId: req.session.user_id });
     }
  } catch (error) {
     console.log('Error while loading orderManagement:', error);
     res.status(500).send('Internal Server Error');
  }
 };
 



 const updateOrder = async (req, res) => {
  try {
      const { orderId, status } = req.body;

      // Find the order containing the product by its product ID
      const orderData = await Order.findOne({ "products._id": orderId });
      if (!orderData) {
          return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Find the product in the order
      const orderProductIndex = orderData.products.findIndex(
          (product) => product._id.toString() === orderId
      );
      if (orderProductIndex === -1) {
          return res.status(404).json({ success: false, message: "Product not found in order" });
      }

      const product = orderData.products[orderProductIndex];
      const productCount = product.count;
      product.productStatus = status;
      product.date = new Date();

      if (status === "accepted") {
          const productId = product.productId;
          const productTotalPrice = product.totalPrice;
          const newTotalAmount = orderData.totalAmount - productTotalPrice;

          // Update user's wallet
          const date = new Date();
          const updateWallet = await User.findOneAndUpdate(
              { _id: orderData.user },
              {
                  $inc: { wallet: productTotalPrice },
                  $push: {
                      walletHistory: {
                          date: date,
                          amount: productTotalPrice,
                          direction: "Credit",
                      },
                  },
              },
              { new: true }
          );

          // Update product quantity
          await Product.updateOne(
              { _id: productId },
              { $inc: { quantity: productCount } }
          );

          // Update order's total amount
          orderData.totalAmount = newTotalAmount;
      }

      // Save the updated order data
      await orderData.save();

      res.json({ success: true, orderData });
  } catch (error) {
      console.error("Error while updating order:", error);
      res.status(500).render("500");
  }
};
const returnOrder = async (req, res) => {
  try {
    const { id: productId, order: orderId, returnReason } = req.body;

    const order = await Order.findById(orderId).populate("products");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const returnedProduct = order.products.find(
      (val) => val._id.toString() === productId
    );
    if (!returnedProduct) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }

    const productTotalPrice = returnedProduct.totalPrice;
    const newTotalAmount = order.totalAmount - productTotalPrice;

    // Update the product status and return reason in the order
    await Order.updateOne(
      { _id: orderId, "products._id": productId },
      {
        $set: {
          "products.$.productStatus": "requested",
          returnReason: returnReason,
        },
      }
    );

    // Update the order's total amount
    await Order.findByIdAndUpdate(
      orderId,
      { $set: { totalAmount: newTotalAmount } },
      { new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error while returning order:", error);
    res.status(500).render("500");
  }
};



module.exports = {
  placeOrder,
  verifyPayment,
  orderFailure,
  rayNow,
  orderSuccess,
  cancelOrder,
  returnOrder,
  orderDetails,
  loadOrder,
  orderdetailsLoad,
  updateOrder,



};
