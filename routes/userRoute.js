const express = require('express');
const user_route = express(); // Use express.Router() to create a router instance

const User = require('../model/userModel');
const productController = require('../controller/productController');
const userController = require('../controller/userController');
const cartController = require('../controller/cartController');
const addressController = require('../controller/addressController');
const orderController = require('../controller/orderController');

const auth = require('../middleware/userAuth');
const passport = require('passport');
const path = require('path');
const session = require('express-session');

const multer1 = require('multer');
const upload = multer1();
const { isLogin, isLogout } = require("../middleware/userAuth"); // Destructure middleware

// View engine setup
user_route.set('view engine', 'ejs');
user_route.set('views', './views/user');

require('../utils/gpassport'); // Assuming this is for passport configuration

user_route.use(passport.initialize());
user_route.use(passport.session());

user_route.use(session({
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: true
}));

user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));
user_route.use(express.static(path.join(__dirname, 'public')));

// Load home
user_route.get("/", userController.loadHome);
user_route.get("/home", userController.loadHome);

// Load signup
user_route.get('/sign-up', auth.isLogout, userController.loadSignup);
user_route.post('/sign-up', userController.insertUser);


// OTP
user_route.get('/otp', userController.otpLoad);
user_route.post('/verify-otp', userController.verifyOtp);
user_route.get('/resend-otp', isLogout, userController.resendOtp);


// Google authentication
user_route.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
user_route.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/success',
  failureRedirect: '/failure'
}));
user_route.get("/success", userController.successLoad);
user_route.get('/failure', userController.failureLoad);

// Profile
user_route.get("/profile", isLogin, userController.profileLoad);
 user_route.post('/edit-profile', userController.editProfile);
 user_route.get('/change-password',userController.changePasswordLoad)
 user_route.post('/change-password',userController.changePassword)
 user_route.get('/forgot-password',userController.forgotPassword)
 user_route.post('/password-change',userController.passwordChange)
 user_route.post('/get-email',userController.getEmail)

 //===============addresssss====================================
 user_route.post('/add-address',addressController.addAddress);
user_route.post('/edit-address',addressController.editAddress)
user_route.post('/delete-address',addressController.deleteAddress)
// Cart==================================================

user_route.get('/cart',auth.isLogin,cartController.cartLoad)
user_route.get('/add-to-cart',auth.isLogin,cartController.addToCart)
 user_route.post("/removeCartItem",auth.isLogin,cartController.removeCartItem)
user_route.post("/update-cart",auth.isLogin,cartController.updateCart)
 user_route.get('/checkout',auth.isLogin,cartController.checkoutLoad)
 //============order===============================================//
 user_route.post("/place-order",auth.isLogin,orderController.placeOrder)
 user_route.get('/order-success',auth.isLogin,orderController.orderSuccess)
 user_route.get('/order-details',auth.isLogin,orderController.orderDetails)
 user_route.post('/cancel-order', auth.isLogin, orderController.cancelOrder)

 
//================produts===============================================//
user_route.get('/shop', productController.shop);
user_route.get('/productview', userController.productview);
user_route.get('/product-details', productController.productview);




// Load login
user_route.get('/login', auth.isLogout, userController.loadLogin);
user_route.post('/login', userController.verifyLogin);

user_route.get('/logout', isLogin, userController.logoutUser);
  

// Export router
module.exports = user_route;
