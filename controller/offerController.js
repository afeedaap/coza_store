const CategoryOffer = require('../model/categoryOfferModel');
const Category =require('../model/categoryModel');
const Product = require('../model/productModel');
const { updateMany } = require('../model/userModel');

function calculateDiscountedPrice(product, discountPercentage) {
  const discountedPrice = product.Price - (product.Price * (discountPercentage / 100));
  return discountedPrice;
}
const offerload = async (req, res) => {
  try {
    res.render('offer');
  } catch (error) {
    console.error("error at offerload",error);
    res.status(200).render("error") 
   ;
  }
};
//================================load category offer=====================//
const loadCategoryOffer = async (req,res)=>{
  try {
      const categoryOffers = await CategoryOffer.find().populate('category');
      res.render('categoryOffer',{ categoryOffers});
  } catch (error) {
    console.error("error at load category offer",error);
    res.status(200).render("error") 
   ;
  }
}
//==========load add categoryoffer==================//
const loadAddCategoryOffer = async (req,res)=>{
  try {
      const category= await Category.find();
      res.render('addCategoryOffer',{ category});
  } catch (error) {
      console.log("errror at adding category offer",error.message);
     ;
      res.status(200).render("error") 
     ;
  }
}
//================create category offer===============//
const createCategoryOffer = async (req, res) => {
  try {
    const { category, discount, startDate, endDate, status } = req.body;
    console.log(req.body);

  
    const categoryName = await Category.findOne({ name: category });
    if (!categoryName) {
      return res.status(400).json({ error: 'Category not found' });
    }

    
    const existingCategoryOffer = await CategoryOffer.findOne({ category: categoryName._id });
    if (existingCategoryOffer) {
      return res.status(400).json({ error: 'A category offer for this category already exists' });
    }


    const categoryOffer = new CategoryOffer({
      category: categoryName._id,
      discountPercentage: discount,
      startDate: startDate,
      endDate: endDate,
      status: status
    });

 
    await categoryOffer.save();
    res.redirect('/admin/categoryOffer');
  } catch (error) {
    console.error("error at crete offer",error);
    res.status(200).render("error") 
   ;
  }
};

//=================load edit offer=============//
const editCategoryOffer = async(req,res)=>{
  try {
      const offerId = req.query.id;
      console.log("offerId at edit offer",offerId);
      const category = await Category.find();
      const offerDetails= await CategoryOffer.findById({_id:offerId});
      res.render('editCategoryOffer',{categoryOffer:offerDetails,category});
  } catch (error) {
    console.error("error at editoffer",error);
    res.status(200).render("error") 
   ;  
  }
}
//=====================update category offer=====================================//
const updateCategoryOffer = async (req, res) => {
  try {
    
    const offerId = req.query.id;
    console.log('offer id at upadte offer', offerId )
    const { category, discount, startDate, endDate, status } = req.body;
    
    const categoryName = await Category.findOne({ name: category });
    if (!categoryName) {
      return res.status(200).send('Category not found');
    }

    await CategoryOffer.findByIdAndUpdate(
      offerId,
      {
        $set: {
       
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
    console.error("error at opdte offer",error);
    res.status(200).render("error") 
   ;
  }
};
const deleteCategoryOffer = async (req,res)=>{
  try{
      const offerId = req.query.id;
      console.log("offerid at delete",offerId);
      await CategoryOffer.deleteOne({_id:offerId});
      res.redirect('/admin/categoryOffer');
  }catch(error){
    console.error("error at delete offer",error);
    res.status(200).render("error") 
   ;
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
  }