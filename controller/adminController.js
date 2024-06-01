// admin login page not set
let path = require('path');
let User = require('../model/userModel');
let adminAuth = require('../middleware/adminAuth');

//===============Admin Login==========================//
let adminLogin = async(req,res)=>{
    try{
       
        res.render('adminLogin');
    }catch(err){
        if (err) throw err;
    }
}
//===========verify admin=================//
const verifyAdminLogin=async(req,res)=>{
    try {
        const {email, password}=req.body;
         if(email === process.env.AD_EMAIL && password === process.env.AD_PASS){
            console.log('password of admin was matched');
            req.session.Admin=true;
            res.redirect('/admin/dashboard')
        }
        else{
            res.redirect('/admin/login');
        }

    } catch (error) {
        console.log(" this is adminVerify error",error);
        
    }
};

//==================Loading the admin dashboard==============//
const adminDashboard = async (req, res) => {
    try{
     res.render('dashboard');

    } catch (error) {
        console.log('Error happened in admin controller at adminLoginPage function ', error);
    }

}
//=========logout================//
const logout = async(req,res)=>{
    try{
        req.session.Admin = null;
        res.redirect('/admin/login')
    } catch (error) {
        console.log('Error hapens in admin controller at logout function',error);

    }
}
//==============userfield==================//
const userField = async(req,res)=>{
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) ||4;
        const skip = (page - 1) *limit;
       const user = await User.find({is_admin:{$ne:1}})
        .skip(skip)
        .limit(limit);
    
        const totalProductsCount = await User.countDocuments();
     
        const totalPages = Math.ceil(totalProductsCount / limit);
        res.render('users',{users:user,page,totalPages,limit});
    
        } catch (error){
            console.log("user field error in dashboard",error);

        
         }
    }
// =============Blocking the user==================================
         let userBlock = async(req,res) =>{
            try{
                let id = req.query.id;
                let blockUser = await User.findByIdAndUpdate(id,{is_block:true},{new:true});
                if(blockUser){
                    res.redirect('/admin/users');
                }
               
            }catch(err){
                console.log(err);
            }
         }

//=====================Unblocking the user==============================         
         let userUnBlock = async(req,res) =>{
            try{
                let id = req.query.id;
                let blockUser = await User.findByIdAndUpdate(id,{is_block:false},{new:true});
                if(blockUser){
                    res.redirect('/admin/users');
                }
               
            }catch(err){
                console.log(err);
            }
         }
//=========================product page===============>
const product = async(req,res)=>{
    try{
      
        res.render('product')
    } catch (error) {
        console.log('cannot get the product page',error);

    }
}

//=========================productlist=========================//
const productlist = async(req,res)=>{
    try{
      
        res.render('productlist')
    } catch (error) {
        console.log('cannot get the product page',error);

    }
}


  
  

module.exports = {
    adminLogin,
    verifyAdminLogin,
     adminDashboard,
     logout,
    userField,
     userBlock,
    userUnBlock,
    product,
   productlist
}
