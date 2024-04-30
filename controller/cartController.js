const Cart = require('../model/cartModel')
const Product = require('../model/productModel')
const User = require('../model/userModel')
const Address = require('../model/addressModel')
const Category = require('../model/categoryModel')

const cartLoad = async (req, res) => {
  try {
      const user_id = req.session.user_id;
      const cartData = await Cart.findOne({ user: user_id }).populate('products.productId');
      console.log("cartData", cartData);
      let category = await Category.find({});
      if (cartData && cartData.products && cartData.products.length > 0) {
          let subTotal = 0;
          cartData.products.forEach(product => {
              // Check if product.productId is not null or undefined before accessing its price
              if (product.productId) {
                  product.totalPrice = product.productId.price * product.count;
                  subTotal += product.totalPrice;
                  console.log('product images in cart', product.productId.images);
              } else {
                  console.error('productId is null or undefined for a product in the cart');
              }
          });

          const shippingCharge = subTotal > 1500 ? 90 : 0;
          console.log("hello", shippingCharge);
          const grandTotal = subTotal + shippingCharge;

          console.log('dataa', grandTotal, shippingCharge);

          // Pass subTotal, shippingCharge, and grandTotal to the EJS template
          res.render("cart", {
              user: user_id,
              cart: cartData,
              grandTotal: grandTotal,
              shippingCharge: shippingCharge,
              subTotal: subTotal,
              category 
          });
      } else {
          res.render("cart", { user: user_id, cart: null, message: "No products available in your cart." });
      }
  } catch (e) {
      console.log("error while loading cart", e);
      res.status(500).send("Error loading cart");
  }
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

      let quantity = req.body.quantity || 1; // Default to 1 if quantity is not provided
      console.log("Quantity:", quantity);

      const productData = await Product.findOne({ _id: productId }).select('name price image'); // Fetch only necessary fields
      console.log("Product datass:", productData);

      let cart = await Cart.findOne({ user: user_id });
      if (!cart) {
          // If the cart doesn't exist, create a new one
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
          // If the cart already exists, find if the product is already in the cart
          const existingProductIndex = cart.products.findIndex(product => product.productId.equals(productId));

          if (existingProductIndex !== -1) {
              // If the product exists in the cart, update its quantity and totalPrice
              cart.products[existingProductIndex].count += quantity;
              cart.products[existingProductIndex].totalPrice += productData.price * quantity;
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
   
       if (cartData) {
         let addressData = await Address.findOne({ user: user_id });
         console.log('addressData', addressData);
   
         // Calculate the subtotal by summing up the total price of each product
         const subTotal = cartData.products.reduce((acc, val) => {
           if (val && val.productId && val.productId.price && val.count) {
             return acc + (val.productId.price * val.count);
           }
           return acc;
         }, 0);
   
         console.log("subtotal", subTotal);
         let totalAmount = subTotal;
   
         let shippingAmount = subTotal < 1500 ? 0: 90;
         if (shippingAmount > 0) {
           totalAmount += shippingAmount;
         }
   
         console.log(totalAmount);
   
         // Calculate the total price for each product
         const eachTotal = cartData.products.map(val => {
           if (val && val.productId && val.productId.price && val.count) {
             return val.productId.price * val.count;
           }
           return 0;
         });
         const eachQuantity = cartData.products.map(val => {
          if (val && val.count) {
            return val.count;
          }
          return 0;
        });
   
         // Render the checkout page with the necessary data
         res.render("checkout", {
           addressData,
           cart: cartData,
           subTotal,
           total: totalAmount,
           user: user_id,
           shippingAmount,
           eachTotal, // Pass the eachTotal array to the template
           eachQuantity
         });
       } else {
         res.redirect("/cart");
       }
    } catch (error) {
       console.log(error.message);
       res.status(500).json({ error: "Internal server error" });
    }
   };
   



module.exports = {
    cartLoad,
    addToCart,
    removeCartItem,
    
    
    updateCart,
    checkoutLoad
    

}

