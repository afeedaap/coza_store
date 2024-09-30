let Product = require("../model/productModel");
let Category = require("../model/categoryModel");
let User = require("../model/userModel");
const CategoryOffer = require('../model/categoryOfferModel');
let path = require('path')
const fs = require('fs'); 
let moment = require("moment");
const { count } = require("console");

//=====View Product page=======================
const productListPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

    // Total products for pagination
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetching product data for the current page
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
    console.error("Error while loading products:", error);
    res.redirect("/admin/error");
  }
};

//========== Load  the add product page =======================
let loadAddProduct = async (req, res) => {
  try {
    let category = await Category.find({status:"active"});
    let message = req.flash('message');
    
    res.render('addProduct', { category, message });
  } catch (err) {
    console.log('Error loading add product page:', err);
    res.redirect('/admin/error');
  }
};
//====create product======//
const createProduct = async (req, res) => {
  try {
     const { name, description,discount,price,quantity,date,category} = req.body;

     console.log('Request body:', req.body);

     const productData = req.body;
     if (
      ! name||
      !description ||
      !price ||
      !quantity ||
      !date ||
      !discount ||
      !category
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const productExist = await Product.findOne({
      name: { $regex: new RegExp(name, "i") },
    });
    if (productExist) {
      return res
        .status(409)
        .json({ success: false, message: "Product already exists..!" });
    }
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image is required" });
    }
    else if (req.files && req.files.length > 3) {
      return res
        .status(400)
        .json({ success: false, message: "Only up to 3 images are allowed" });
    }
    const imageFiles = req.files.filter((file) =>
      file.mimetype.startsWith("image/")
    );
    if (imageFiles.length !== req.files.length) {
      return res
        .status(400)
        .json({ success: false, message: "Only image files are allowed" });
    }
    console.log('Uploaded files:', req.files);
    const newProduct = new Product({
      name: name,
      description: description,
      price: price,
      quantity: quantity,
      category: category,
      discount: discount,
      date: date,
      images: req.files.map((file) => file.filename),
    });

    await newProduct.save();
    
    return res
      .status(201)
      .json({
        success: true,
        message: "Product created successfully",
        productId: newProduct._id,
      });
      
     }
   catch (error) {
     
    
     res.status(500).send('An error occurred while creating the product.');
     res.redirect('/admin/error');
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
    res.redirect('/error');
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
      res.render("editProduct", { product,category,moment });
    } else {
      req.flash("message", "Product does not exists");
      res.redirect("/admin/product");
    }
  } catch (error) {
    console.log("Error occurred in editProduct function", error);
    res.redirect('/error'); 
  }
};
//after editing the product==============================
const productEdited = async (req, res) => {
  try {
    const { id, name } = req.body;
    console.log( req.body,"reqbody");
    const productData = req.body;

    const productExist = await Product.findOne({
      name: { $regex: new RegExp(name, "i") },
    });

    if (productExist && productExist._id != id) {
      console.log(
        `this is the existing product ${productExist} and its id is ${productExist._id} and the comparison id is ${id} if these both are same then this error message wouldn't have come`
      );
      return res.status(400).json({ message: "Product already exists" }); //
    }

    const existingImages = JSON.parse(productData.existingImages);

    const imageFilenames = existingImages.map((imageUrl) => {
      const parts = imageUrl.split("/");
      return parts[parts.length - 1];
    });

    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const currentImageCount = imageFilenames.length;
    const newImageCount = req.files ? req.files.length : 0;
    const totalImageCount = currentImageCount + newImageCount;

    if (totalImageCount > 3) {
      return res.status(400).json({ message: "Select upto 3 images" });
    }

    let updateData = {
      name: productData.name,
      description: productData.description,
      discount: productData.discount,
      price: productData.price,
      date: productData.date,
      quantity: productData.quantity,
      category: productData.category,
    };

    // to save the existing images
    if (imageFilenames && imageFilenames.length > 0) {
      updateData.images = imageFilenames;
    }

    // to save new images to existing ones
    if (req.files && req.files.length > 0) {
      const newFilesToPush = req.files.map((file) => file.filename);
      updateData.images = [...(updateData.images || []), ...newFilesToPush];
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    console.log("this is the updaetdProduct at the database: ", updatedProduct);

    res.status(200).json(true);
  } catch (error) {
    console.log("Error occurred in productEdited function", error);
    res.redirect("/admin/error");
  }
};
 //============= deleting a image ==============================
const deleteimage = async (req, res) => {
  try {
    const index = parseInt(req.query.index, 10);
    const productId = req.query.id;
    console.log('Deleting image at index:', index);
    console.log('Product ID received:', productId);

    const product = await Product.findOne({ _id: productId });
    if (!product) {
      console.log('Product not found with ID:', productId);
      return res.status(404).send("Product not found");
    }

    if (index >= 0 && index < product.images.length) { // Ensure index is less than the length
      const filenameToDelete = product.images[index];
      const filePath = path.join(
        __dirname,
        "../public/adminAssets/imgs/category",
        filenameToDelete
      );

      console.log('Deleting file:', filePath);
      fs.unlinkSync(filePath); // Ensure this file path is correct and accessible

      product.images.splice(index, 1);
      await product.save();
      res.status(200).json({ message: "Image deleted successfully" });
    } else {
      console.log("Invalid index:", index);
      res.status(400).send("Invalid index");
    }
  } catch (error) {
    console.log(
      "Error while deleting image on the product page:",
      error.message
    );
    res.status(500).redirect("/admin/error");
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
   
    if (product.status === "active") {
      product.status = "blocked";
  } else {
      product.status = "active";
  }
  
    await product.save();

    res.json({ value: true });
  } catch (err) {
    console.error("Error toggling user  block status:", err);
    res.json({ value: false });
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
    let user = req.session.userData;
    const productId = req.query._id;
    const productData = await Product.findOne({ _id: productId }).populate("category");
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
      case 'low_to_high':
        sortOption = { price: 1 };
        break;
      case 'high_to_low':
        sortOption = { price: -1 };
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

    // Filter products and only show those with active categories
    const productData = await Product.find(filter)
      .populate({
        path: 'category',
        match: { status: "active" }  // Only include products with active categories
      })
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(); 

    // Filter out products without a valid category (i.e., if the category is inactive)
    const filteredProducts = productData.filter(product => product.category);

    let biggestOffer = 0;

    // Calculate offers for filtered products
    for (const product of filteredProducts) {
      const categoryOffer = await CategoryOffer.findOne({ category: product.category._id });
      const categoryDiscountPercentage = categoryOffer ? categoryOffer.discountPercentage : 0;
      const productDiscountPercentage = product.discount;
      const offer = Math.max(categoryDiscountPercentage, productDiscountPercentage);
      biggestOffer = Math.max(biggestOffer, offer);
      
      const price = parseFloat(product.price);
      product.offerPrice = price - (price * offer / 100);
      product.biggestOffer = offer; 
    }

    const totalCount = filteredProducts.length;  // Count of filtered products
    const totalPages = Math.ceil(totalCount / limit);

    res.render('shop', {
      productData: filteredProducts,  // Only render filtered products
      currentPage: page,
      totalPages,
      searchTerm,
      currentSort: sort
    });

  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      res.status(500).send('An error occurred while fetching products.');
      return res.redirect('/error');
    }
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
