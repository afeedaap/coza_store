const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer =require('../model/productOfferModel');
const Category =require('../model/categoryModel');
const Product = require('../model/productModel');
const RefferalOffer = require('../model/referalOfferModel');
const { updateMany } = require('../model/userModel');
function calculateDiscountedPrice(product, discountPercentage) {
  const discountedPrice = product.Price - (product.Price * (discountPercentage / 100));
  return discountedPrice;
}
const offerload = async (req, res) => {
  try {
    res.render('offer');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while rendering the offer page');
  }
};

//================================load category offer=====================//

const loadCategoryOffer = async (req,res)=>{
  try {
      const categoryOffers = await CategoryOffer.find().populate('category');
      res.render('categoryOffer',{ categoryOffers});
  } catch (error) {
      console.log(error.message);
  }
}

//==========load add categoryoffer==================//
const loadAddCategoryOffer = async (req,res)=>{
  try {
      const category= await Category.find();
      res.render('addCategoryOffer',{ category});
  } catch (error) {
      console.log(error.message);
  }
}


//================create category offer===============//
const createCategoryOffer = async (req, res) => {
  try {
    const { category, discount, startDate, endDate, status } = req.body;
    console.log(req.body);

    // Find the category by name
    const categoryName = await Category.findOne({ name: category });
    if (!categoryName) {
      return res.status(400).json({ error: 'Category not found' });
    }

    // Check if a category offer already exists for the category
    const existingCategoryOffer = await CategoryOffer.findOne({ category: categoryName._id });
    if (existingCategoryOffer) {
      return res.status(400).json({ error: 'A category offer for this category already exists' });
    }

    // Create a new category offer
    const categoryOffer = new CategoryOffer({
      category: categoryName._id,
      discountPercentage: discount,
      startDate: startDate,
      endDate: endDate,
      status: status
    });

    // Save the new category offer
    await categoryOffer.save();
    res.redirect('/admin/categoryOffer');
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//=================load edit offer=============//
const editCategoryOffer = async(req,res)=>{
  try {
      const offerId = req.query.id;
      console.log("offerId",offerId);
      const category = await Category.find();
      const offerDetails= await CategoryOffer.findById({_id:offerId});
      res.render('editCategoryOffer',{categoryOffer:offerDetails,category});
  } catch (error) {
    console.error(error);  
  }
}
//=====================update category offer=====================================//
const updateCategoryOffer = async (req, res) => {
  try {
    const offerId = req.query.id;
    if (!offerId) {
      return res.status(400).send('offerId is required');
    }

    const { category, discount, startDate, endDate, status } = req.body;

    const categoryName = await Category.findOne({ name: category });
    if (!categoryName) {
      return res.status(404).send('Category not found');
    }

    await CategoryOffer.findByIdAndUpdate(
      offerId,
      {
        $set: {
          name: req.body.offerName,
          category: categoryName._id,
          discountPercentage: discount,
          startDate: startDate,
          endDate: endDate,
          status: status,
        },
      }
    );

    res.redirect('/admin/categoryOffer');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while updating the category offer');
  }
};
const deleteCategoryOffer = async (req,res)=>{
  try{
      const offerId = req.query.id;
      console.log("offerid at delete",offerId);
      await CategoryOffer.deleteOne({_id:offerId});
      res.redirect('/admin/categoryOffer');
  }catch(error){
      console.log(error.message);
  }
}
//==============load product offer===================//
const loadProductOffer = async (req,res)=>{
  try {
    const productOffers = await ProductOffer.find();
    res.render('productOffer',{productOffers});
} catch (error) {
    console.log(error.message);
}
}
//==========load add categoryoffer==================//
const loadAddProductOffer = async (req,res)=>{
  try {
    const productlist= await Product.find();
    res.render('addProductOffer',{productlist});
} catch (error) {
    console.log(error.message);
}
}
//================create category offer===============//
const createProductOffer = async( req,res)=>{
  try {
    const {product,discount,startDate,endDate,status} = req.body;
    console.log(req.body);
    // Check if the product exists using the product ID
    const existingProduct = await Product.findById(product);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    const productOffer = new ProductOffer({
       
        product:product,
        discountPercentage:discount,
        startDate:startDate,
        endDate:endDate,
        status:status
    })        
    await productOffer.save();
    res.redirect('/admin/productOffer');
    } catch (error) {
        console.log(error.message);
    }
}
//=================load edit offer=============//
const editProductOffer = async(req,res)=>{
  try {
    const offerId = req.query.id;
    console.log("offerId",offerId);
    const productlist= await Product.find();
    const offerDetails= await ProductOffer.findById({_id:offerId});
    res.render('editProductOffer',{productOffer:offerDetails,productlist});
} catch (error) {
  console.error(error);  
}
}
//==================updated ======================//
const updateProductOffer = async (req, res) => {
  try {
    const offerId = req.query.id;
    const {productType,discount,startDate,endDate,status} = req.body;
    await ProductOffer.findByIdAndUpdate({_id:offerId},{$set:{
   
        productType:productType,
        discountPercentage:discount,
        startDate:startDate,
        endDate:endDate,
        status:status
    }})        
    res.redirect('/admin/productOffer');
} catch (error) {
    console.error(error);
}
};


const deleteProductOffer = async (req,res)=>{
  try{
    const offerId = req.query.id;
    console.log(offerId);
    await ProductOffer.deleteOne({_id:offerId});
    res.redirect('/admin/productOffer');
}catch(error){
    console.log(error.message);
}
}
//==========load referal offer==================//
const loadRefferalOffer = async (req,res)=>{
  try {
      const refferalOffers = await RefferalOffer.find();
      res.render('referalOffer',{refferalOffers});
  } catch (error) {
      console.log(error.message);
  }
}
const loadAddRefferalOffer = async (req,res)=>{
  try {
      
      res.render('addRefferalOffer');
  } catch (error) {
      console.log(error.message);
  }
}

const addRefferalOffer = async( req,res)=>{
  try {
  const {refferalCode,discount,startDate,endDate,status} = req.body;
  console.log(req.body);
  const referalOffer = new RefferalOffer({
      refferalCode:refferalCode,
      discountPercentage:discount,
      startDate:startDate,
      endDate:endDate,
      status:status
  })        
  await referalOffer.save();
  res.redirect('/admin/refferalOffer');
  } catch (error) {
      console.log(error.message);
  }
}
const editRefferalOffer = async (req, res) => {
  try {
    const offerId = req.query.id;
    const offerDetails = await RefferalOffer.findById(offerId);
    res.render('editRefferalOffer', { refferalOffer: offerDetails });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while retrieving the referral offer.");
  }
};

const  updateRefferalOffer = async (req, res) => {
  try {
    const offerId = req.query.id;
    const { referralCode, discount, startDate, endDate, status } = req.body;

    await RefferalOffer.findByIdAndUpdate(offerId, {
      $set: {
        referralCode: referralCode,
        discountPercentage: discount,
        startDate: startDate,
        endDate: endDate,
        status: status,
      }
    });

    res.redirect('/admin/refferalOffer');
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while updating the referral offer.");
  }
};

const deleteRefferalOffer = async (req,res)=>{
  try{
      const offerId = req.query.id;
      console.log(offerId);
      await RefferalOffer.deleteOne({_id:offerId});
      res.redirect('/admin/refferalOffer');
  }catch(error){
      console.log(error.message);
  }
}
  module.exports={
    offerload ,
    loadCategoryOffer,
    loadAddCategoryOffer,
    createCategoryOffer,
    editCategoryOffer,
    updateCategoryOffer,
    deleteCategoryOffer,
    loadProductOffer,
    loadAddProductOffer,
    createProductOffer,
    editProductOffer,
    updateProductOffer,
    deleteProductOffer,
    loadRefferalOffer,
    loadAddRefferalOffer,
    addRefferalOffer,
    deleteRefferalOffer,
    editRefferalOffer,
    updateRefferalOffer
  



   
  
    
    

  }