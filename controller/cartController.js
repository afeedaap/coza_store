const Cart = require('../model/cartModel')
const Product = require('../model/productModel')
const User = require('../model/userModel')
const Address = require('../model/addressModel')
const Category = require('../model/categoryModel')
const CategoryOffer = require('../model/categoryOfferModel');

const Coupon = require("../model/couponModel");

//===============load cart==========================================///
const cartLoad = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const cartData = await Cart.findOne({ user: user_id }).populate('products.productId');

    if (!cartData || !cartData.products || cartData.products.length === 0) {
      return res.render("cart", { user: user_id, cart: null, message: "No products available in your cart." });
    }
    let subTotal = 0;
    let totalDiscount = 0;
    
   
    for (const product of cartData.products) {
      if (!product.productId) {
        console.error('productId is null or undefined for a product in the cart');
        continue;
      }
      
      const originalPrice = product.productId.price;
      const offerPrice = product.productId.offerprice;
      const totalPrice = (offerPrice && offerPrice < originalPrice) 
        ? offerPrice * product.count
        : originalPrice * product.count;

    
      subTotal += totalPrice;

      
      // Update product totalPrice
      product.totalPrice = totalPrice; 
    }
     subTotal = cartData.products.reduce(
      (total, product) => total + (product.totalPrice || 0),
      0
    );
     console.log("subtotal",   subTotal )
 
    const grandTotal = subTotal - totalDiscount;
    console.log("totalDiscount",totalDiscount);
    console.log("grandTotal at cartload",grandTotal)

    // Update the cart's total price and save it
    cartData.totalPrice = grandTotal;
    await cartData.save();

    const categories = await Category.find({});

    // Render the cart page with all necessary data
    res.render("cart", {
      user: user_id,
      cart: cartData,
      grandTotal: grandTotal,
      subTotal: subTotal,
      categories: categories,
      totalDiscount: totalDiscount,
    });
  } catch (e) {
    console.log("Error while loading cart", e);
    res.status(500).render("error");  // Changed to status 500 for a server error
  }
};

//=================add  to cart=========================//
const addToCart = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    if (!user_id) {
      console.log("No user ID");
      return res.status(401).json({ error: "User not authenticated" });
    }
    const productId = req.query.id;
    let quantity = req.body.quantity || 1; 
    const productData = await Product.findOne({ _id: productId }).select('name price image stock');
    if (!productData) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (productData.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock available" });
    }
    let cart = await Cart.findOne({ user: user_id });
    if (!cart) {
      cart = new Cart({
        user: user_id,
        products: [{
          productId: productId,
          productName: productData.name,
          count: quantity,
          price: productData.price,
          image: productData.image,
          totalPrice: productData.price * quantity
        }]
      });
    } else {
      const existingProductIndex = cart.products.findIndex(product => product.productId.equals(productId));

      if (existingProductIndex !== -1) {
        return res.redirect('/cart');
      } else {
        cart.products.push({
          productId: productId,
          productName: productData.name,
          count: quantity,
          price: productData.price,
          image: productData.image,
          totalPrice: productData.price * quantity
        });
      }
    }
    productData.stock -= quantity;
    await productData.save();

    await cart.save();
    return res.redirect('/cart');

  } catch (error) {
    console.log("Error adding to cart:", error);
    res.status(200).render("error") 
  }
};


const removeCartItem = async (req, res) => {
    try {
      console.log("remove");
      const userId = req.session.user_id;
      const productId = req.body.product;
      const cartData = await Cart.findOne({ user: userId });
      if (cartData) {
        await Cart.findOneAndUpdate(
          { user: userId },
          {
            $pull: { products: { productId: productId } },
          }
        );
        res.json({ success: true });
      }
      console.log(cartData);
    } catch (error) {
      console.error("Error removing item from cart:", error);
      res.status(200).render("error") 
    }
  };

  const updateCart = async (req, res) => {
    try {
      const productId = req.body.productId; 
      const userId = req.session.user_id; 
      const increment = parseInt(req.body.count); 
  
      if (isNaN(increment)) {
        return res.status(400).json({ error: "Invalid count provided" });
      }
  
      
      const cartData = await Cart.findOne({ user: userId }).populate('products.productId');
      if (!cartData) {
        return res.status(404).json({ error: "Cart not found" });
      }
  
      
      const productIndex = cartData.products.findIndex(
        (obj) => obj.productId._id.toString() === productId
      );
      if (productIndex === -1) {
        return res.status(404).json({ error: "Product not found in cart" });
      }
  
     
      const productData = await Product.findById(productId);
      if (!productData) {
        return res.status(404).json({ error: "Product not found in database" });
      }
  
      const product = cartData.products[productIndex]; 
      let newQuantity = product.count + increment; 
  
      
      if (newQuantity < 1 || (increment > 0 && newQuantity > productData.quantity)) {
        return res.json({ stock: true });
      }
  
     
      cartData.products[productIndex].count = newQuantity;
  
      
      for (const cartProduct of cartData.products) {
        if (!cartProduct.productId) {
          console.error('productId is null or undefined for a product in the cart');
          continue;
        }
  
        const originalPrice = cartProduct.productId.price || 0; 
        const offerPrice = cartProduct.productId.offerprice || 0; 
  
      
        const totalPrice =
          offerPrice && offerPrice < originalPrice
            ? offerPrice * cartProduct.count
            : originalPrice * cartProduct.count;
  
        cartProduct.totalPrice = totalPrice; 
      }
  
    
      await cartData.save();
  
      const grandTotal = cartData.products.reduce(
        (total, product) => total + (product.totalPrice || 0),
        0
      );
  
      cartData.totalPrice = grandTotal; 
      await cartData.save(); 
  
      console.log(grandTotal, "grandTotal after updating cart");
  
    
      res.json({
        newQuantity,
        newSubTotal: grandTotal, 
        newGrandTotal: grandTotal,
        productId: productId,
        totalPrice: cartData.products[productIndex].totalPrice, 
      });
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
    
const checkoutLoad = async (req, res) => {
  try {
      const user_id = req.session.user_id;
      const cartData = await Cart.findOne({ user: user_id }).populate("products.productId");
      const coupons = await Coupon.find({});
      if (cartData) {
          const addressData = await Address.findOne({ user: user_id });

          let subTotal = 0;
          let totalDiscount = 0;

          for (const product of cartData.products) {
              if (product && product.productId && product.productId.price && product.count) {
                  const originalPrice = product.productId.price * product.count;
                  const offerPrice = product.productId.offerprice || product.productId.price;
                  const totalPrice = offerPrice * product.count;

                  subTotal += originalPrice;
                  console.log(subTotal, "subTotal");
                  totalDiscount += (originalPrice - totalPrice);
                  console.log(totalDiscount, "totalDiscount in checkout");
              }
          }
         cartData.totalDiscount=totalDiscount
          let grandTotal = subTotal - totalDiscount;
          let couponDiscount = 0
          if (cartData.appliedCouponcode) {
              const appliedCoupon = await Coupon.findOne({ code: cartData.appliedCouponcode });
              if (appliedCoupon) {
                  couponDiscount = appliedCoupon.discount;
                  grandTotal -= couponDiscount;
                  
              }
          }
          cartData.totalDiscount=totalDiscount
          cartData.totalPrice = grandTotal;
          cartData.couponDiscount = couponDiscount; 
          const eachTotal = cartData.products.map(product => {
              const offerPrice = product.productId.offerprice || product.productId.price;
              return offerPrice * product.count;
          });

          const eachQuantity = cartData.products.map(product => product.count);

          res.render("checkout", {
              addressData,
              cart: cartData,
              subTotal,
              totalDiscount,
              grandTotal,
              user: user_id,
              coupons,
              eachTotal,
              eachQuantity
          });
      } else {
          res.redirect("/cart");
      }
  } catch (error) {
      console.log(error.message);
      res.status(200).render("error") 
  }
};







module.exports = {
    cartLoad,
    addToCart,
    removeCartItem,
    updateCart,
    checkoutLoad
    
    
    

}

