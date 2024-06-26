let Product = require("../model/productModel");
let Category = require("../model/categoryModel");
let User = require("../model/userModel");
const CategoryOffer = require('../model/categoryOfferModel');

let path = require('path')
const fs = require('fs').promises; 
let sharp = require('sharp');

//=====View Product page=======================
const productListPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const productData = await Product.find()

      .skip((page - 1) * limit)
      .limit(limit);
    const currentDate = new Date();
    res.render("productListPage", {
      productData,
      totalPages,
      currentPage: page,
      limit,
    });
  } catch (error) {
    res.redirect("/error");
  }
};
//========== Load  the add product page =======================
let loadAddProduct = async(req,res)=>{
  try{

    let category = await Category.find()
    let message = req.flash('message');
    res.render('addProduct',{category,message})
  }catch(err){
    console.log('error at add product loading page :',err)
    res.redirect('/error')
  }
}
//creating new product========================
const createProduct = async (req, res) => {
 try {
    const { name } = req.body;
    const productData = req.body;

    const productExist = await Product.findOne({ name });
    let images = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const croppedBuffer = await sharp(file.path)
          .resize({ width: 306, height: 408, fit: sharp.fit.cover })
          .toBuffer();

        const filename = `cropped_${file.originalname}`;
        const filePath = path.join('public/adminAssets/imgs/category', filename);
        await sharp(croppedBuffer).toFile(filePath);

        const relativePath = path.relative('public', filePath);
        images.push(relativePath);
      }
    }
    if (!productExist) {
      const caseInsensitiveProductExist = await Product.findOne({
        name: { $regex: new RegExp("^" + name + "$", "i") },
      });

      if (caseInsensitiveProductExist) {
        
        req.flash('message', 'Product already exists');
        res.redirect("/admin/addProduct");
      } else {
        const newProduct = new Product({
          name: name,
          description: productData.description,
          discount: productData.discount,
          price: productData.price,
          date: productData.date,
          quantity: productData.quantity,
          category: productData.category,
          images: images,
      
        });

        await newProduct.save();
        res.redirect("/admin/product");
      }
    } else {
    
      req.flash('message', 'Product already exists..');
      res.redirect("/admin/addProduct");
    }
 } catch (error) {
    
   
    res.status(500).send('An error occurred while creating the product.');
 }
};
//delete product====================
const deleteProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.redirect("/admin/product");
  } catch (error) {
    console.log("deleteProduct error");
  }
};
//======edit product-===========================
const editProduct = async (req, res) => {
  try {

    const { id } = req.query;

    const product = await Product.findOne({_id:id}).populate({
      path: "category",
      model: "Category",
    })
    .exec();
   let category = await Category.find({})




    if (product) {
      res.render("editProduct", { product,category });
    } else {
      res.status(404).send("Product not found");
    }
  } catch (error) {
    console.log("Error occurred in editProduct function", error);
    res.status(500).send("Server Error"); 
  }
};

// ==========  toggle to List or unlist the product==================
const toggleBlockStatusProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await Product.findOne({_id:productId})
    if (!product) {
      return res.json({ value: "noRecord" });
    }
    product.status = product.status === "active" ? "blocked" : "active";
    await product.save();

    res.json({ value: true });
  } catch (err) {
    console.error("Error toggling user  block status:", err);
    res.json({ value: false });
  }
};
//after editing the product==============================
const productEdited = async (req, res) => {
  try {
     const id = req.body.id;
     const productData = req.body;
 
     console.log('product data at body : ', productData);
 
     let existingImages = req.body.existingImages;
   
     if (!Array.isArray(existingImages)) {
       existingImages = [existingImages];
     }
 
     let updateData = {
       name: productData.name,
       description: productData.description,
       discount: productData.discount,
       price: productData.price,
       quantity: productData.quantity,
       category: productData.category.id,
     };
 
     if (existingImages.length > 0) {
       updateData.images = existingImages;
     }

 
     if (req.files && req.files.length > 0) {
       const newFilesToPush = req.files.map((file) =>{
         const relativePath = path.relative('public', path.join('public/adminAssets/imgs/category', file.filename));
          return relativePath
       });
       updateData.images = [...(updateData.images || []), ...newFilesToPush];
     }
     
     const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
       new: true,
     });
   
 
     res.redirect("/admin/product");
  } catch (error) {
     console.log("Error occurred in productEdited function", error);
     res.redirect("/error");
  }
 };
 
//============= deleting a image ==============================
const deleteimage = async (req, res) => {
  try {
      const index = req.query.index;
      const product = await Product.findOne({ _id: req.query.id });
  
      // Checking product
      if (!product) {
        return res.status(404).send('Product not found');
      }
  
      // Check index
      if (index >= 0 && index < product.images.length) {
        const filenameToDelete = product.images[index];
        const filePath = path.join(__dirname, 'public', 'adminAssets', 'imgs', 'category', filenameToDelete);
        console.log("File path to delete:", filePath);
  
       
  
        await Product.findByIdAndUpdate(product._id, { $pull: { images: filenameToDelete } });
        res.redirect(`/admin/editproduct?id=${req.query.id}`);
      } else {
        res.status(400).send('Invalid index');
      }
  } catch (error) {
      console.log(error.message);
      res.redirect("/error");
      res.status(500);
  }
 };
 //============= Load the prouduct Listing  page ==================
const loadProductSearchQuery = async (req, res) => {
  try {
   
    const searchQuery = req.query.search || '';
    const products = await Product.find({ name: { $regex: searchQuery, $options: 'i' } });
   
    res.json({ products });
  } catch (error) {
    console.error('Error loading product listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
 //==============user part==========================/
  
const productview = async (req, res, next) => {
  try {
    console.log("jhdskjfjdks")
    let user = req.session.userData;
    const productId = req.query._id;
    const productData = await Product.findOne({ _id: productId }).populate("category");
    
    
    console.log("productData",productData);
    res.render('product-details', {
      productData: productData,
      
      });
  } catch (error) {
    next(error); 
  }
};
//=======================userproduct view================//
const shop = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.search;
    const sort = req.query.sort;

    

    let filter = {};
    if (searchTerm) {
      filter = { name: { $regex: searchTerm, $options: 'i' } };
    }

    let sortOption = {};
    switch (sort) {
      case 'popularity':
        
        break;
      case 'low_to_high':
        sortOption = { price: 1 };
        break;
      case 'high_to_low':
        sortOption = { price: -1 };
        break;
      case 'average_rating':
       
        break;
      case 'new_arrival':
        sortOption = { date: -1 };
        break;
      case 'a_to_z':
        sortOption = { name: 1 };
        break;
      case 'z_to_a':
        sortOption = { name: -1 };
        break;
      case 'featured':
       
        filter.featured = true;
        break;
      default:
        sortOption = {};
    }
    const productData = await Product.find({ ...filter })
    .sort(sortOption)
    .skip(skip)
    .limit(limit);

    let biggestOffer = 0;
    let productDiscountPercentage = 0;
    
    for (const product of productData) {
      const categoryOffer = await CategoryOffer.findOne({ category: product.category._id });
      const categoryDiscountPercentage = categoryOffer? categoryOffer.discountPercentage : 0;
      const productDiscountPercentage = product.discount;
      const offer = Math.max(categoryDiscountPercentage, productDiscountPercentage);
      biggestOffer = Math.max(biggestOffer, offer);
    }
    
    const offerPrice = productData[0].price - (productData[0].price * biggestOffer / 100);
    
   
    const totalCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    
      
      
    

    res.render('shop', {
      productData,
      currentPage: page,
      totalPages,
      searchTerm: searchTerm,
      currentSort: sort
    });

  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while fetching products.');
  }
};



 







module.exports = {
 loadAddProduct,
 loadProductSearchQuery,
  createProduct,
  deleteProduct,
  editProduct,
  productEdited,
  deleteimage,
  productListPage,
  toggleBlockStatusProduct,
  productview,
  shop,


};
