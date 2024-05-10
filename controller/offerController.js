const Offer=require("../model/offerModel")
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");

const offerload = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;

    const totalOffers = await Offer.countDocuments();
    const totalPages = Math.ceil(totalOffers / limit);

    const offerData = await Offer.find()
        .skip((page - 1) * limit)
        .limit(limit);
console.log("offerdata",offerData )
     
      res.render('offer', {
        offerData,
          currentPage: page,
          totalPages: totalPages,
  });
  } catch (error) {
      console.error(error.message);
      res.status(500).render("500", { error: error.message });
  }
};
//===============load =======================//
const addOffer = async (req, res) => {
  try {
      


     
      res.render('addOffer');
  } catch (error) {
      console.error(error.message);
      res.status(500).render("500", { error: error.message });
  }
};
//=================create offer==================//

const createOffer = async (req, res) => {
  try {
    let {offerName,startDate,endDate,discountPercentage} = req.body;

    
       let offerSaved = await new Offer({
          name:offerName,
          discount:discountPercentage,
          startingDate:startDate,
          endDate:endDate, 
       }).save();
       console.log('this is the offer saved at database :',offerSaved);
      // return res.json({data:true,message:'Offer successfully created'});
      res.redirect('/admin/addOffer')
   
     

  } catch (error) {
      console.error(error.message);
      res.status(500).render("404", { error: error.message });
  }
};
//=================load edit offer=============//
const  loadEditOffer=async(req,res)=>{
  try {
    let offerId=req.query.id
    const offerData=await Offer.findById(offerId)
    res.render('editOffer',{offerData})
  } catch (err) {
    console.log('error at the loadEditOffer page :',err);
    res.redirect('/error');
  }
}
//==============offer edited===================//
const offerEdited=async(req,res)=>{
  try {
    let {offerName,startDate,endDate,discountPercentage,id} = req.body;
    let existingOffer = await Offer.findOne({ name: { $regex: new RegExp(offerName, 'i') },_id:{$ne: id} });
    if(existingOffer){
           
      return res.json({data:false,message:'Offer already exists'})
   }else{
      
    await Offer.findByIdAndUpdate(
       id,
       { name: offerName, discount: discountPercentage, startingDate: startDate, endDate: endDate },
       { new: true }
   )
  //  return res.json({data:true,message:'Offer successfully edited'});
  res.redirect('/admin/editOffer')
   }
  } catch (err) {
    console.log('error at the loadEditOffer page :',err);
    res.redirect('/error');
  }
}
//===================delete offer===//

const deleteOffer=async (req,res)=>{
  try {
    
    const offerId=req.query.id;
    console.log("offee id ",offerId)
    const deleteOffer=await Offer.findByIdAndDelete(offerId)
    console.log("deleteee",deleteOffer)
    if(deleteOffer){
      res.status(200).json({message:"deleted successfully"})
    }
    else
    {
      res.status(404).json({error:"offer not found"})
    }
  } catch (error) {
    console.error(error.message);
      res.status(500).render("404", { error: error.message });
  }
}
  module.exports={
    offerload ,
    addOffer,
    createOffer,
    loadEditOffer,
    offerEdited,
    deleteOffer

  }