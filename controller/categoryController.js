let Category = require('../model/categoryModel');
let Product = require("../model/productModel");

let moment = require('moment');
//=============== landing page for category control===================
const allCategory=async(req,res)=>{
    try {
    
      let errMess = req.flash('message');
        const category=await Category.find()

 
        const currentDate = new Date();
        req.session.category=category
        res.render('category',{category,errMess})
    } catch (error) {
        console.log('This is all category error',error);
        res.redirect('/error')
    }
}

const addCategory = async (req, res) => {
    try {
      const { name, description } = req.body;
      console.log("this is the name in  req.body :", name);
      console.log("this is the description in req.body : ", description);
  
      const categoryExist = await Category.findOne({ name });
      if (categoryExist) {
        req.flash("message", "Category already exists");
        return res.status(400).redirect("/admin/category");
      } else {
        const caseInsensitiveCategoryExist = await Category.findOne({
          name: { $regex: new RegExp("^" + name + "$", "i") },
        });
        if (caseInsensitiveCategoryExist) {
          req.flash("message", "Category already exists");
          return res.status(400).redirect("/admin/category");
        }
        const newCategory = new Category({
          name,
          description,
          image: req.file.filename,
        });
        await newCategory.save();
  
        return res.status(201).redirect("/admin/category");
      }
    } catch (error) {
      console.log("Add category error", error);
      res.status(500).redirect("/error");
    }
  };

//==================Update category==========================
const updateCategory = async (req, res) => {
  try {
    let { id, name, description } = req.body;
  
    let existingCategory = await Category.findOne({
      name: { $regex: new RegExp(name, "i") },
    });

    if (existingCategory && existingCategory._id.toString() !== id) {
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    }


    let updateObject = {
      name : name,
      description : description,
    }

    if(req.file && req.file.filename){
      updateObject.image = req.file.filename;
    }
    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(id, updateObject, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      req.flash("error", "Failed to update category. Category not found.");
      return res.status(404).redirect("/admin/category");
    }

    

    return res
      .status(201)
      .json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    console.log("Error at update category:", error);
    res.status(500).redirect("/error");
  }
};

//================Editing the category=====================
const editCategory = async (req, res) => {
    try {
      console.log("This is the edit category page: reached");
      let id = req.query.id;
      console.log("Edit category", id);
      let findCategory = await Category.findById(id);
      if (findCategory) {
        res.render("editCategory", { category: findCategory });
      } else {
        res.redirect("/admin/category");
      }
    } catch (error) {
      console.log("Error at edit category", error);
      res.status(500).render("error"); // Corrected status code to 500 for server error
    }
  };
  //======================Delete a particular category using ID===========
const deleteCategory=async(req,res)=>{
    try {
        let id=req.query.id;
     console.log('imm here');
        await Category.findByIdAndDelete(id);
        res.redirect('/admin/category');
      
    } catch (error) {
        console.log("error at category delete",error);  
        res.status(200).render("error") 
    }
}
//==============Category Unlisting=================
const categoryUnlist=async(req,res)=>{
    try {
       let id =req.query.id;

       await Category.updateOne({_id:id},{$set:{status:'blocked'}})

      
        res.redirect('/admin/category');
      
    } catch (error) {
        console.log("error at category unlisting",error);  
        res.status(200).render("error") 
    }
}


//==============Category listing=================
const categoryList=async(req,res)=>{
    try {
       let id =req.query.id;
       await Category.updateOne({_id:id},{$set:{status:'active'}})
        res.redirect('/admin/category');
      
    } catch (error) {
        console.log("error at category listing",error);    
         res.status(200).render("error") 
    }
}



module.exports ={
    allCategory,
    addCategory,
    updateCategory,
    editCategory,
    deleteCategory,
    categoryUnlist,
    categoryList,
}