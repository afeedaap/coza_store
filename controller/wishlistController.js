const Wishlist=require("../model/wishlistModel")



const wishlist = async (req, res) => {
  try {
    const user = req.session.user_id;
    const wishlistData = await Wishlist.find({ user: user }).populate(
      "products.product"
    );
    console.log("wishlist data at wish list", wishlistData);
    res.render("wishlist", { user: user, wishlistData: wishlistData });
  }catch (error) {
    console.error("error at wishlist load",error.message);
    res.redirect('/error');
  }
};
//================addto wishlist===========================//

const addToWishlist = async (req, res) => {
    try {
      
      const id = req.body.productId;
      console.log("idddd",id)
      const userId = req.session.user_id;
  
    
    const wishData = await Wishlist.findOne({ user: userId });
    console.log("wishData", "hhhadkhadshakjdhkjahdfhadshasdh");

    if (wishData) {
     
      const productExists = wishData.products.some(
        (product) => product.product.toString() === id
      );

      if (productExists) {
       
        const removedWishlist = await Wishlist.findOneAndUpdate(
          { user: userId },
          { $pull: { products: { product: id } } },
          { new: true }
        );
        console.log("removed", removedWishlist);
        res.json({ removed: true });
      } else {
        const wishlistUpdate = await Wishlist.findOneAndUpdate(
          { user: userId },
          { $addToSet: { products: { product: id } } },
          { upsert: true, new: true }
        );
        console.log("updation of wishlist", wishlistUpdate);
        res.json({ added: true });
      }
    } else {
      if (!userId) {
        return res.json({ login: true });
      }
      const newWishlist = new Wishlist({
        user: userId,
        products: [{ product: id }],
      });
      await newWishlist.save();
      console.log("new wishlist created", newWishlist);
      res.json({ added: true });
    }
  }
     catch (error) {
      console.error("Error adding to wishlist:", error.message);
      res.redirect('/error');
    }
  
  }
//===============remove wishlist====================//
const removeWishlist = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user_id;
    console.log("zzzzzzzzzzzzzz", productId, userId);

    const wishDelete = await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { products: { product: productId } } },
      { new: true }
    );
    if (!wishDelete) {
      return res.status(404).json({ error: "Product not found in wishlist" });
    } else {
      res.json({ remove: true, message: "Item removed from wishlist" });
    }
  } catch (error) {
    console.error("error at romving wishlist",error.message);
    res.redirect('/error');
  }
};

  module.exports={
    wishlist,
    addToWishlist,
    removeWishlist
  }