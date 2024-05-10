const User = require("../model/userModel")
const Product = require('../model/productModel')
const Category = require('../model/categoryModel')
const Address = require('../model/addressModel')
const Order= require('../model/orderModel')
const Wishlist=require("../model/wishlistModel")
const bcrypt = require("bcryptjs")
const { sendVerifyMail } = require('../config/sendVerifyMail')
//=================looad home=========================//
const loadHome = async (req, res) => {
    try {
        console.log("entered use homeeee")
        const user = req.session.user_id
        const productData = await Product.find({})
        if (!productData) {
            return res.render("userHome", { productData: [], loggedin: true });
        }
        res.render("userHome", { productData, loggedin: true });
    } catch (error) {
        console.log(error);
    }
}
//============load signup========================//
const loadSignup = async (req, res) => {
    try {
        res.render('signUp')
    } catch (error) {
        console.log(error);
    }
}

const failureLoad = async (req, res) => {
    try {
        res.redirect('/sign-up')
    } catch (error) {
        console.log(error);
    }
}
//=======insert user=================================//
let otp;
const insertUser = async (req, res) => {
    try {
        const { name, email, mobile, password, confirmPassword } = req.body
        console.log(req.body);
        const emailCheck = await User.findOne({ email: req.body.email })
        if (emailCheck) {
           return res.json({ emailExist: true })
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const user = new User({
            name: name,
            email: email,
            mobile: mobile,
            password: passwordHash,
            is_verified: 0,
            is_admin: 0
        })
       const userData = await user.save()
       let randomNumber = Math.floor(Math.random() * 9000) + 1000
        otp = randomNumber
        req.session.email = req.body.email;
        req.session.password = passwordHash;
        req.session.name = req.body.name;
        req.session.mobile = req.body.mobile;
        console.log(otp)

        sendVerifyMail(
            req.body.name,
            req.body.email,
            randomNumber
        )
        setTimeout(() => {
            otp = Math.floor(Math.random() * 9000) + 1000
        }, 60000)

        req.session.otpsend = true;

        res.json({ success: true })
    } catch (error) {
        console.log(error);
        res.status('500').json({ error: "Internal server error" });
    }
}

const successLoad = async (req, res) => {
    try {
        const productData = await Product.find({ Is_blocked: true }).populate({
            path: "category",
            match: { is_block: true }
        })
        res.render('userHome', { productData })
    } catch (error) {
        console.log(error);
    }
}

const otpLoad = async (req, res) => {
    try {
        let verifyErr = req.session.verifyErr;
        let otpsend = req.session.otpsend;
        res.render("otp", { verifyErr, otpsend })
    } catch (error) {
        console.log(error);
        res.status("500")
        res.render("500")
    }
}
const resendOtp = async (req, res) => {
    try {
        let otpsend = req.session.otpsend;
        let verifyErr = req.session.verifyErr;
        let email = req.session.email;
        let name = req.session.name;
        let randomNumber = Math.floor(Math.random() * 9000) + 1000;
        otp = randomNumber;
        setTimeout(() => {
            otp = Math.floor(Math.random() * 9000) + 1000;
        }, 60000);
        console.log(otp)
        sendVerifyMail(name, email, randomNumber);
        console.log(name, email);
        res.render("otp", {
            verifyErr,
            otpsend,
            resend: "Resend the otp to your email address.",
        });
    } catch (error) {
        console.log(error)
        res.status(500).render("500");
    }
};


const verifyOtp = async (req, res) => {
    try {

        console.log("verify");
        req.session.verifyErr = false;
        req.session.otpsend = false;

        const otpinput = parseInt(req.body.otp)
        const email = req.session.email
        if (req.body.otp?.trim() == "") {
            res.json({ fill: true })
        } else {
        if (otpinput === otp) {
                const verified = await User.findOneAndUpdate({ email: email }, { $set: { is_verified: 1 } }, { new: true })
                if (verified) {
                    req.session.regSuccess = true;
                    res.json({ success: true })
                } else {
                    res.json({ error: true })
                }
            } else {
                res.json({ wrong: true })
            }

        }
    } catch (e) {
        console.log(e,"error in verify otp")
        res.status('500').render("500")
    }
}

//============load login================//

const loadLogin = async (req, res) => {
    try {
        res.render('login')
    } catch (error) {
        console.log(error);
    }
}
//=============verifylogin ==========================


const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body
       
        const userData = await User.findOne({ email: email })
      
      
        const productData = await Product.find({ Is_block: 0 }).populate({
            path: "category",
            match: { is_block: 0 }
        })

        if (userData.is_block==0) {
            const passwordMatch = await bcrypt.compare(password, userData.password)
            const productData = await Product.find({})

            if (passwordMatch) {
                console.log(passwordMatch,"1");
                req.session.user_id = userData._id;
                return res.json({success:true}) 
            } else {
                console.log(passwordMatch,"2");
                return res.json({success:false}) 
              
            }
        } else {
            console.log('hailiiiii');
        
           return res.json({error:true,error:"you are blocked,please contact for more information"})
        }
    } catch (e) {
        console.log(e,"error occured in verify login");
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}
//=====================profile==============================//
const profileLoad = async (req, res) => {
    try {
        const user = req.session.user_id
        const addressData = await Address.findOne({ user }).populate("address")
        const orderDetails = await Order.find({ user }).sort({ date: -1 })
        const userData = await User.findOne({ _id: user })
       //console.log(userData)
        if (userData.is_admin == 0) {
            res.render("profile", { userData,addressData, orderDetails, user } )
        } else {
            req.session.admin_id = userData
            res.redirect("/profile")
        }
    } catch (e) {
        console.log("error while loading profile", e);
    }
}

//==========editprofile====================//
const editProfile = async (req,res) => {
    try{
        console.log("edit profile session",req.session.user_id)
        const userData = await User.findById({_id:req.session.user_id})
       
        const newPassword = req.body.newPassword
       
        const currentPassword = req.body.currentPassword  
        console.log("newpassord",newPassword);
        console.log("current password",currentPassword);
        
        let passwordHash

        if(currentPassword||newPassword){
            if(newPassword.length<8){
                return res.json({passwordLength:true})
            }else{
                const passwordMatch = await bcrypt.compare(currentPassword,userData.password)
                if(passwordMatch){
                    try {
                        passwordHash = await bcrypt.hash(newPassword, 10);
                    } catch (error) {
                        console.error('Error while hashing password:', error);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    
                }else{
                   return res.json({passwordMatch:true})
                }
            }
        }else{
            passwordHash = userData.password
        }
        console.log(":req.body.name",req.body.name);
        const editedData = await User.findOneAndUpdate({_id:userData._id},{$set:{
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mobile,
            password:passwordHash
        }}) 
        console.log("edited data",editedData)
   res.redirect("/profile")
    }catch(e){
        console.log('error while editing profile:',e);
        res.status(500).render(500)
    }
}
//=============================password chnage==========================///
const passwordChange = async (req, res) => {
    try {
        console.log('body', req.body);

        const userData = await User.findById({ _id: req.session.user_id })
        const newPassword = req.body.newPassword
        const confirmPassword = req.body.confirm
        const current = req.body.current
        let passwordHash
        const passwordMatch = await bcrypt.compare(current, userData.password)
        if (passwordMatch) {
            try {
                passwordHash = await bcrypt.hash(newPassword, 10);
            } catch (error) {
                console.error('Error while hashing password:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

        } else {
            return res.json({ passwordMatch: false })
        }
        if (userData) {
            const editedData = await User.findOneAndUpdate({ _id: userData._id }, {
                $set: {
                    password: passwordHash
                }
            })
            console.log('edi', editedData);
            res.json({ password: true })
        } else {
            res.json({ user: true });
        }
    } catch (error) {
    }
}
//===============forgotpassword=========================//
const forgotPassword = async (req, res) => {
    try {
        console.log(req.session.user_id, "inddd")
        if (req.session.user_id) {
        const userData = await User.findOne({ _id: req.session.user_id })
        otp = Math.floor(Math.random() * 9000) + 1000
        req.session.otp= otp
        req.session.otpAge = Date.now()
        sendVerifyMail(userData.name, userData.email,otp)
         req.session.email = userData.email;
         res.render('otp',
                {
                    email: userData.email,

                })

        } else {
            console.log(req.session.user_id, "illaa")
            res.render('getEmail')
        }
    } catch (error) {
        console.log(error.message);
        res.render('500Error')
    }
};
//================get email============================//
const getEmail = async (req, res) => {
    try {
        req.session.user_check = req.body.email
        const userData = await User.findOne({ email: req.body.email })
        console.log(req.session.user_check);
        if (userData) {
         otp = Math.floor(Math.random() * 9000) + 1000
            req.session.otp=otp
            req.session.otpTimestamp = Date.now();
          sendVerifyMail('user', req.body.email, otp)

            
            req.session.email = userData.email;

           res.json({success:true})

        } else {
           res.json({found:false})
        }

    } catch (error) {
        console.log(error.message);
        res.render('500Error')
    }
};

/////==========================change passwordd===================//
  const changePasswordLoad = async (req,res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        console.log(error,"error while loading password change")
    }
  }
  //==================change password=================================//
  const changePassword= async (req, res) => {
    try {
        const user_id = req.session.user_id
        const newPassword = req.body.newPassword
        console.log(newPassword);
    if (req.session.user_id) {
    const passwordHash = await bcrypt.hash(newPassword,10)
      await User.findOneAndUpdate({_id:user_id},{$set:{password:passwordHash}})
      res.redirect("/profile")
  
    }else{
  
        const passwordHash = await bcrypt.hash(newPassword,10)
      await User.findOneAndUpdate({email:req.session.user_check},{$set:{password:passwordHash}})
      res.redirect("/login")
     }
     
    } catch(error) {
      console.log(error.message);
      res.render('500Error')
    }
  };

//==================logout user==============================//
const logoutUser = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/login')
    } catch (error) {
        console.log(error);
    }
}

//================userpart===================================================
const productview = async (req, res, next) => {
    try {
        console.log("jhdskjfjdkffdfsdfs")
        let user = req.session.userData;
        const productId = req.query.id;
        console.log("productId", productId)
        const productData = await Product.findOne({ _id: productId });
        let category1 = await Category.find({_id: productData.category});
        console.log(category1);
        
        // Check if productData is not null
        if (!productData) {
            console.error("Product not found");
            return res.status(404).send("Product not found");
        }
        const wishlistData = await Wishlist.findOne({ user: user }).populate("products.product");
        let category = await Category.find({});
        let product = await Product.find({ status: "active" }).populate("category").exec();
        
        // Check if productData.category is not null
        if (!productData.category) {
            console.error("Product category not found");
            return res.status(404).send("Product category not found");
        }
        
        const relatedproduct = productData.category;
        
        // Check if product is not empty
        if (product.length === 0) {
            console.error("No active products found");
            return res.status(404).send("No active products found");
        }
        
        let relatedProd = product.filter(product => product.category._id.toString() === relatedproduct._id.toString());
        
        res.render('product-details', {
            productData: productData,
            images: productData.images,
            category,
            product,
            relatedProd: relatedProd,
        });
    } catch (error) {
        next(error); 
    }
};


module.exports = {
    loadHome,
     failureLoad,
    successLoad,
    loadSignup,
    resendOtp,
    verifyOtp,
    insertUser,
    otpLoad,
    loadLogin,
    verifyLogin,
    logoutUser,
    passwordChange,
     profileLoad,
     editProfile,
     forgotPassword ,
     changePasswordLoad ,
     changePassword,
     productview,
     getEmail


}











































