require("dotenv").config();
const Order = require("../model/orderModel");

const Cart = require("../model/cartModel");
const Product = require("../model/productModel");
const Address = require("../model/addressModel")
const User = require("../model/userModel");
const Coupon = require("../model/couponModel");
const CategoryOffer = require('../model/categoryOfferModel');
const PDFDocument = require("pdfkit");
const path = require("path");
const crypto = require('crypto');
const fs = require("fs");
require("dotenv").config();
const uniqid = require('uniqid');
const Razorpay = require('razorpay');
const instance = new Razorpay({
  key_id:process.env.RAZORPAY_KEY,
  key_secret:process.env.RAZORPAY_SECRET
})
//=====quantity===========//
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
//===================place order===========================/
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
      const status = paymentMethod === "COD" || paymentMethod === "wallet" ? "placed" : "Pending";
      const existingAddress = await Address.findOne({ user: user_id });
      const address = req.body.formData.address;
      if (existingAddress && existingAddress.address.length === 0) {
        existingAddress.address.push({
          fullName: address.fullName,
          mobile: address.mobile,
          email: address.email,
          houseName: address.houseName,
          city: address.city,
          state: address.state,
          pin: address.pin
        });
        await existingAddress.save();
      } else {
        const newAddress = new Address({
          user: user_id,
          address: [
            {
              fullName: address.fullName,
              mobile: address.mobile,
              email: address.email,
              houseName: address.houseName,
              city: address.city,
              state: address.state,
              pin: address.pin
            }
          ]
        });
        console.log('New address collection created');
        await newAddress.save();
      } 
      let totalAmount = 0;
      const orderProducts = cartData.products.map(product => {
        const originalPrice = product.productId.price;
        const offerPrice = product.productId.offerprice;
        const productDiscount = originalPrice - offerPrice;
        const discountedPrice = originalPrice - productDiscount;


        const totalProductPrice = discountedPrice * product.count;
        couponDiscount=cartData.couponDiscount
      
      totalAmount =+ cartData.totalPrice;

        return {
          productId: product.productId._id,
          count: product.count,
          productPrice: discountedPrice,
          totalPrice: totalProductPrice,
        };
      });
      let  total = orderProducts.reduce((total, product) => total + product.totalPrice, 0);
    const subtotal = total- (cartData.couponDiscount || 0); // Deduct coupon discount from subtotal
    

      const uniqId = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);

      const order = new Order({
        user: user_id,
        orderId: uniqId,
        deliveryDetails: address,
        products: orderProducts,
        date: new Date(),
        orderStatus: status,
        couponDiscount: couponDiscount,
        totalAmount: totalAmount,
        subtotal: subtotal,
        paymentMethod: paymentMethod,
      });

      const orderData = await order.save();
      const orderId = orderData._id;
      req.session.order_id = orderData._id;

      if (paymentMethod === "razorpay") {
        const options = {
          amount: totalAmount * 100, 
          currency: 'INR',
          receipt: '' + orderId,
        };

        instance.orders.create(options, async function (err, order) {
          if (err) {
            console.log("Razorpay error:", err, err?.message);
            return res.status(500).json({ error: 'Failed to create Razorpay order' });
          }
          res.json({ razorpay: true, order });
        });
      } else if (paymentMethod === "COD") {
        await decreaseProductQuantity(cartData.products); // Decrement for COD only
        await Cart.deleteOne({ user: user_id });
        res.json({ codsuccess: true });
      } else {
        if (userData.wallet >= totalAmount) {
          await User.findOneAndUpdate(
            { _id: user_id },
            {
              $inc: { wallet: -totalAmount },
              $push: {
                walletHistory: {
                  date: new Date(),
                  amount: -totalAmount,
                  direction: "Debit",
                },
              },
            },
            { new: true }
          );

          await decreaseProductQuantity(cartData.products); 
          await Cart.deleteOne({ user: user_id });
          return res.json({ wallet: true });
        } else {
          return res.json({ walletAmount: true });
        }
      }
    } catch (error) {
      console.error("while order placing", error);
    
      res.status(200).render("error") 
    ;
    }
  };
//===========verify payement===========//
const verifyPayment = async (req, res) => {
  try {
    const { response, order } = req.body;
    const user_id = req.session.user_id;
    const cartData = await Cart.findOne({ user: user_id }).populate("products.productId");

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET); 
    hmac.update(response.razorpay_order_id + '|' + response.razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === response.razorpay_signature) {
      console.log('Payment verified successfully!');

      const orderData = await Order.findOne({_id: order.receipt}, {products: 1});

      for (const item of orderData.products) {
        await Order.findOneAndUpdate(
          { _id: order.receipt, 'products.productId': item.productId },
          {
            $set: {
              'products.$.productStatus': 'placed',
              orderStatus: 'placed'
            }
          }
        );
      }

      if (cartData) {
        await decreaseProductQuantity(cartData.products);
        await Cart.deleteOne({ user: user_id });
      }
    
      res.json({statusChanged: true});
    }
  } catch (error) {
    console.error("error at verify payement",error);
    res.status(200).render("error") 
   ;;
  }
};

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
    console.error("error at razorpay payment ",error);
    res.status(200).render("error") 
   ;
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
    console.error("error at ordersucess",error);
    res.status(200).render("error") 
   
   ;

  }
};

const orderDetails = async (req, res) => {
  try {
    const userId = req.body.user_id;
    const orderDetails = await Order.find({ _id: req.query._id }).populate(
      "products.productId"
    );
    let subtotal;
    if (orderDetails.length > 0) {
      subtotal = orderDetails[0].totalAmount; // Assuming totalAmount is on the first object in the array
    }

    console.log(subtotal, "subtotalllll");
    console.log(subtotal,"subtotalllll")
    res.render("orderDetails", { order: orderDetails, user: userId,subtotal });
  } catch (error) {
    console.error("error orderdetails ",error);
    res.status(200).render("error") 
   ;;
  }
};
//=====cancel order=============//
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
    console.log("Ordered Product:", orderedProduct.totalPrice);

    // Subtract cancelled product price from the total
    const newTotalAmount = orderedData.totalAmount - orderedProduct.totalPrice;

    const updateOrder = await Order.findOneAndUpdate(
      { _id: orderId, "products._id": productId },
      { 
        $set: { 
          "products.$.productStatus": "Cancelled",
          totalAmount: newTotalAmount // Update total amount
        }
      },
      { new: true }
    );

    const updateProductQuantity = await Product.updateOne(
      { _id: orderedProduct.productId },
      { $inc: { quantity: orderedProduct.count } }
    );

    if (
      orderedData.paymentMethod == "wallet" || 
      orderedData.paymentMethod == "razorpay"
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
    return res.status(500).render("500");
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
    console.error("error at orderfailure",error);
    
   ;
    res.status(200).render("error")
  }
}
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
    
     if (orderData) {
       const totalItems = orderData.products.reduce((total, product) => total + product.count, 0);
       const subtotal = orderData.products.reduce((total, product) => total + product.totalPrice, 0);
       
      
      console.log(subtotal,"subtotal");
     
       const totalAmount = subtotal 
       console.log(totalAmount,"totalamount at orderdetailloa")
 
       res.render('orderDetails', {orderData, totalItems, subtotal,  totalAmount,order:orderDetails });
     } else {
       res.render('orderDetails', { userId: req.session.user_id });
     }
  } catch (error) {
     console.log('Error while loading orderManagement:', error);
 
     res.status(200).render("error");
  }
 };
 const updateOrder = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const orderStatus = req.body.status;

    const orderData = await Order.findOne({ "products._id": orderId });
    console.log("orderData:", orderData);

    const orderProductIndex = orderData.products.findIndex(
      (product) => product._id.toString() === orderId
    );
    console.log("orderProductindex:", orderProductIndex);

    const productCount = orderData.products[orderProductIndex].count;
    orderData.products[orderProductIndex].productStatus = orderStatus;
    orderData.products[orderProductIndex].date = new Date();
    console.log("count", productCount);

    if (orderStatus === "accepted") {
      const productId = orderData.products[orderProductIndex].productId;
      const productTotalPrice =
        orderData.products[orderProductIndex].totalPrice;
      const newTotalAmount = orderData.totalAmount - productTotalPrice;
      console.log("asdkkkkkkkkkkkkkkk", productTotalPrice, newTotalAmount);

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
      console.log("updateWallet", updateWallet);

      const updatedProduct = await Product.updateOne(
        { _id: productId },
        { $inc: { quantity: productCount } }
      );
      console.log("quantityyy productttttttttt", updatedProduct);

      const updatedOrderTotal = await Order.findByIdAndUpdate(
        orderId,
        { $set: { totalAmount: newTotalAmount } },
        { new: true }
      );
      console.log("updatedOrderTotal:", updatedOrderTotal);

      orderData.totalAmount = newTotalAmount;
    }

    const updated = await orderData.save();
    console.log("saved newwwwwww", updated);

    res.json({ success: true, orderData });
  } catch (error) {
    console.log("Error while updating order:", error);
    res.status(500).render("500")
  }
};

const returnOrder = async (req, res) => {
  try {
    console.log("body", req.body);
    const productId = req.body.id;
    const orderId = req.body.order;
    const returnReason = req.body.returnReason;
    console.log("id", orderId);

    const order = await Order.findById(orderId).populate("products");
    console.log("orderrrr", order);
    const returnedProduct = order.products.find(
      (val) => val._id.toString() === productId
    );

    console.log("retunedd prooooo", returnedProduct);
    const productTotalPrice = returnedProduct.totalPrice;
    const newTotalAmount = order.totalAmount - productTotalPrice;
    const count = returnedProduct.count;

    console.log(
      "asdjfjdkljkljjfjfjjfjfjfjfj",
      productTotalPrice,
      newTotalAmount
    );

    const updatedOrder = await Order.updateOne(
      { _id: orderId, "products._id": productId },
      {
        $set: {
          "products.$.productStatus": "requested",
          returnReason: returnReason,
        },
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("500");
  }
};
const generateInvoicePDF = async (req, res) => {
  try {
    const orderId = req.query.id;
    const orderDetails = await Order.findById(orderId).populate('products.productId');

    if (!orderDetails) {
      return res.status(404).json({ error: "Order not found" });
    }

    let document = new PDFDocument({ margin: 50 });
    let y = 220;

    // Use a font that supports the rupee symbol
    document.font('./public/fonts/DejaVuSans.ttf'); // Load your custom font

    function generateHeader(document) {
      document.image("./public/user/images/logo/logo-01.png", 50, 40, { width: 100 });
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString();
      const formattedTime = currentDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      document.fontSize(12).text("Date: " + formattedDate, 50, 100, { align: "right" });
      document.fontSize(12).text("Time: " + formattedTime, 50, 120, { align: "right" });
      document.fontSize(18).text("Order Details", 50, 120, { align: "left" });
      document.moveTo(50, y + 20).lineTo(550, y + 20).stroke();
    }

    function generateOrderDetails(document, orderDetails) {
      const headers = [
        "No",
        "Product",
        "Quantity",
        "Price",
        "Total",
        "Status",
        "Payment Method",
      ];
      const rows = orderDetails.products.map((product, index) => {
        const productName = product.productId.name ? product.productId.name.toString() : "N/A";
        const productCount = product.count ? product.count.toString() : "0";
        const productPrice = product.productPrice ? "₹" + product.productPrice.toString() : "₹0";
        const totalPrice = product.totalPrice ? "₹" + product.totalPrice.toString() : "₹0";
        const productStatus = product.productStatus ? product.productStatus.toString() : "N/A";
        const paymentMethod = orderDetails.paymentMethod ? orderDetails.paymentMethod.toString() : "N/A";

        return [
          (index + 1).toString(),
          productName,
          productCount,
          productPrice,
          totalPrice,
          productStatus,
          paymentMethod,
        ];
      });

      const columnWidths = [20, 130, 60, 60, 60, 60, 130];

      headers.forEach((header, columnIndex) => {
        document.fontSize(12).text(header, 50 + columnWidths.slice(0, columnIndex).reduce((acc, width) => acc + width, 0), y, { width: columnWidths[columnIndex], align: "center" });
      });

      document.moveTo(50, y + 20).lineTo(550, y + 20).stroke();

      rows.forEach((row, rowIndex) => {
        y += 30;
        row.forEach((cell, columnIndex) => {
          document.fontSize(12).text(cell, 50 + columnWidths.slice(0, columnIndex).reduce((acc, width) => acc + width, 0), y, { width: columnWidths[columnIndex], align: "center" });
        });
        document.moveTo(50, y + 20).lineTo(550, y + 20).stroke();
      });

      const totalAmountText = "Total Amount: ₹" + orderDetails.totalAmount;
      document.fontSize(15).text(totalAmountText, 50, y + 40, { align: "right" });
    }

    generateHeader(document);
    generateOrderDetails(document, orderDetails);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");

    document.pipe(res);
    document.end();

    document.on("end", () => {
      console.log("PDF generation completed");
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).render("error"); // Use 500 status code for server errors
  }
};
const invoiceSuccess = async (req, res) => {
  res.json({ invoice: true });
};




module.exports = {
  placeOrder,
  verifyPayment,
 
  rayNow,
  orderSuccess,
  cancelOrder,
  returnOrder,
  orderDetails,
  loadOrder,
  orderdetailsLoad,
  updateOrder,
  orderFailure,
  generateInvoicePDF ,



};