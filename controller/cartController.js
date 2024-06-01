const Cart = require('../model/cartModel')
const Product = require('../model/productModel')
const User = require('../model/userModel')
const Address = require('../model/addressModel')
const Category = require('../model/categoryModel')
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');
const Coupon = require("../model/couponModel");


const cartLoad = async (req, res) => {
  try {
      const user_id = req.session.user_id;
      const cartData = await Cart.findOne({ user: user_id }).populate('products.productId');
      console.log("cartData", cartData);

      if (!cartData || !cartData.products || cartData.products.length === 0) {
          return res.render("cart", { user: user_id, cart: null, message: "No products available in your cart." });
      }

      let subTotal = 0;

      for (const product of cartData.products) {
          if (!product.productId) {
              console.error('productId is null or undefined for a product in the cart');
              continue;
          }
          product.totalPrice = product.productId.price * product.count;
          subTotal += product.totalPrice;

          product.offerPrice = await checkAllOffer(product.productId);
      }

      const grandTotal = subTotal;

      const categories = await Category.find({});

      res.render("cart", {
          user: user_id,
          cart: cartData,
          grandTotal: grandTotal,
          subTotal: subTotal,
          categories: categories,
          
      });
  } catch (e) {
      console.log("Error while loading cart", e);
      res.status(500).send("Error loading cart");
  }
};

const checkAllOffer = async (product) => {
  const categoryOffer = await CategoryOffer.findOne({ category: product.category });
  const productOffer = await ProductOffer.findOne({ product: product._id });

  if (categoryOffer && productOffer) {
      return Math.max(
          calculateDiscountedPrice(product.price, categoryOffer.discountPercentage),
          calculateDiscountedPrice(product.price, productOffer.discountPercentage)
      );
  } else if (categoryOffer) {
      return calculateDiscountedPrice(product.price, categoryOffer.discountPercentage);
  } else if (productOffer) {
      return calculateDiscountedPrice(product.price, productOffer.discountPercentage);
  } else {
      return product.price;
  }
};

const calculateDiscountedPrice = (originalPrice, discountValue) => {
  return originalPrice - (originalPrice * discountValue) / 100; // For percentage-based discount
};



const addToCart = async (req, res) => {
  try {
      console.log("Entered add to cart controller");

      const user_id = req.session.user_id;

      if (!user_id) {
          console.log("No user ID");
          return res.status(401).json({ error: "User not authenticated" });
      }

      const productId = req.query.id;
      console.log("Cart product ID:", productId);

      let quantity = req.body.quantity || 1; 
      console.log("Quantity:", quantity);

      const productData = await Product.findOne({ _id: productId }).select('name price image');
      console.log("Product datass:", productData);

      let cart = await Cart.findOne({ user: user_id });
      if (!cart) {
          
          cart = new Cart({
              user: user_id,
              products: [{
                  productId: productId,
                  productName: productData.name,
                  count: quantity,
                  price: productData.price,
                  image: productData.images,
                  totalPrice: productData.price * quantity
              }]
          });
      } else {
          
          const existingProductIndex = cart.products.findIndex(product => product.productId.equals(productId));

          if (existingProductIndex !== -1) {
           return res.redirect('/cart')
             
          } else {
              // If the product doesn't exist in the cart, add it
              cart.products.push({
                  productId: productId,
                  productName: productData.name,
                  count: quantity,
                  price: productData.price,
                  image: productData.images,
                  totalPrice: productData.price * quantity
              });
          }
      }

      await cart.save();

      console.log("Product added to cart successfully");
      return res.redirect('/cart');

  } catch (error) {
      console.log("Error adding to cart:", error);
      return res.status(500).json({ error: "Internal server error" });
  }
}

const removeCartItem = async (req, res) => {
    try {
      console.log("remove");
      const userId = req.session.user_id;
      const productId = req.body.product;
      console.log(userId, "user", productId, "product");
      const cartData = await Cart.findOne({ user: userId });
      console.log(cartData, "cartdata");
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
      res.status(500).render("500");
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

        const cartData = await Cart.findOne({ user: userId });
        if (!cartData) {
            return res.status(404).json({ error: "Cart not found" });
        }

        const productIndex = cartData.products.findIndex(obj => obj.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({ error: "Product not found in cart" });
        }

        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(404).json({ error: "Product not found in database" });
        }

        const product = cartData.products[productIndex];
        let newQuantity = product.count + increment;

        if (newQuantity < 0 || (increment > 0 && newQuantity > productData.quantity)) {
            return res.json({ stock: true });
        }

        cartData.products[productIndex].count = newQuantity;
        cartData.products[productIndex].totalPrice = productData.price * newQuantity;

        await cartData.save();

        let newSubTotal = cartData.products.reduce((total, product) => total + product.totalPrice, 0);
        const shippingCharge = newSubTotal > 1500 ? 0 : 90;
        const grandTotal = newSubTotal + shippingCharge;

        res.json({
            newQuantity,
            newSubTotal,
            newShippingCharge: shippingCharge,
            newGrandTotal: grandTotal,
            productId: productId
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
      let addressData = await Address.findOne({ user: user_id });

      let subTotal = 0;
      let totalDiscount = 0;

      for (const product of cartData.products) {
        if (product && product.productId && product.productId.price && product.count) {
          const originalPrice = product.productId.price * product.count;
          const offerPrice = await checkAllOffer(product.productId) * product.count;
          subTotal += originalPrice;
          totalDiscount += (originalPrice - offerPrice);
          product.offerPrice = offerPrice;
        }
      }
     
      const totalAmount = subTotal - totalDiscount;
      console.log("totttyd disccc",totalDiscount)
    console.log("subtotal at checkout",subTotal);
  
      cartData.totalPrice = totalAmount;
      await cartData.save();

      // Calculate the total price and quantity for each product
      const eachTotal = cartData.products.map(val => {
        if (val && val.offerPrice) {
          return val.offerPrice;
        }
        return 0;
      });
      const eachQuantity = cartData.products.map(val => {
        if (val && val.count) {
          return val.count;
        }
        return 0;
      });

      res.render("checkout", {
        addressData,
        cart: cartData,
        subTotal,
        total: totalAmount,
        user: user_id,
        eachTotal,
        eachQuantity,
        totalDiscount,
        coupons
      });
    } else {
      res.redirect("/cart");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


//  const checkout = async(req,res)=>{
//   try {
//       const userId= req.session.user_id;
//       const user = await User.findOne({_id:userId});
//       const addressData= await Address.findOne({userId:req.session.user_id});
//       const cartData = await Cart.findOne({userName:req.session.user_id});
//       const products = cartData.products.map(product=>product.productId);
//       const productData = await Product.find({_id:products});
//       const coupons= await Coupon.find();
//       let discountPerItem = [];
//       for (const item of cartData.products) {
//               const productData = await Product.findOne({_id:item.productId});
//               const quantity= item.count;
//               item.offerPrice = Math.floor(await checkAllOffer(productData));
//               discountPerItem.push(quantity * item.offerPrice);
//       }
//       const reducedAmount = discountPerItem.reduce((acc,curr)=> acc+curr);
//       const totalDiscount = cartData.totalPrice-reducedAmount;
//       if(addressData){
//           const userAddress = addressData.addresses;
//           res.render('./checkout',{userAddress,productData,products,cartData,coupons,totalDiscount,reducedAmount}); 
//       }else{
//           res.redirect('/users/add_address');}
//   } catch (error) {
//       console.error(error);
//   }
// }



module.exports = {
    cartLoad,
    addToCart,
    removeCartItem,
    updateCart,
    checkoutLoad
    
    
    

}

