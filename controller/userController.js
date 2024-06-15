const User = require("../model/userModel")
const Product = require('../model/productModel')
const Category = require('../model/categoryModel')
const Address = require('../model/addressModel')
const Order= require('../model/orderModel')
const Wishlist=require("../model/wishlistModel")
const CategoryOffer = require('../model/categoryOfferModel');

const bcrypt = require("bcryptjs")
const { sendVerifyMail } = require('../config/sendVerifyMail')
const {checkAllOffer } = require("../config/offer");
//=================looad home=========================//
const loadHome = async (req, res) => {
    try {
        console.log("entered use homeeee")
        const user = req.session.user_id
        const productData = await Product.find({})
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
        console.log("error at load signupp",error);
       
        res.status('500').render("500")
    }
}
//=======insert user=================================//
let otp;
function generateReferralCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}
const insertUser = async (req, res) => {
    try {
        const { name, email, mobile, password, confirmPassword,referral } = req.body
        console.log(req.body);
        const emailCheck = await User.findOne({ email: req.body.email })
        let reffered = false
        if (emailCheck) {
           return res.json({ emailExist: true })
        }
        if (referral) {
            const ExistReferral = await User.findOne({ referral: referral});
            reffered = true
            if (ExistReferral) {
              const data = {
                amount: 101,
                date: Date.now(),
                direction: 'Credit',  
              };
              const existingreferral = await User.findOneAndUpdate({ referral: referral}, { $inc: { wallet: 101 }, $push: { walletHistory: data } });
            } else {
              return res.json({invalidLink:true});
            }
          }
        const passwordHash = await bcrypt.hash(password, 10)
        const user = new User({
            name: name,
            email: email,
            mobile: mobile,
            password: passwordHash,
            referral: generateReferralCode(),
            wallet:reffered==true? 51 : 0,
            walletHistory: reffered==true ? [{
                amount: 51,
                date: new Date(),
                direction: 'Credited'
            }] : [],
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
        console.log("error at insert usr",error);
        res.status('500').render("500")
    }
}

//===================otp load==========================//
const otpLoad = async (req, res) => {
    try {
        let verifyErr = req.session.verifyErr;
        let otpsend = req.session.otpsend;
        res.render("otp", { verifyErr, otpsend })
    } catch (error) {
        console.log("error at otpload",error);
        res.render("500")
    }
}
//=======================resend otp======================//
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
        res.render("otp", {
            verifyErr,
            otpsend,
            resend: "Resend the otp to your email address.",
        });
    } catch (error) {
        console.log("error at resend otp",error)
        res.status(500).render("500");
    }
};
//==================verfy otp====================================//
const verifyOtp = async (req, res) => {
    try {
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
        console.log("error at load login",error);
        res.status('500').render("500")
    }
}
//=============verifylogin ==========================
const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        const userData = await User.findOne({ email: email })
        // const productData = await Product.find({ Is_block: 0 }).populate({
        //     path: "category",
        //     match: { is_block: 0 }
        // })

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
    
        
           return res.json({error:true,error:"you are blocked,please contact for more information"})
        }
    } catch (e) {
        console.log(e,"error occured in verify login");
        res.status(500).res.render("500");
        
    }
}
//=====================profile==============================//
const profileLoad = async (req, res) => {
    try {
        const user = req.session.user_id                                     
        const addressData = await Address.findOne({ user }).populate("address")
        const orderDetails = await Order.find({ user }).sort({ date: -1 })
        const userData = await User.findOne({ _id: user })
        const walletData = await User.findOne({ _id: user }).populate("walletHistory"); 
       
        if (userData.is_admin == 0) {
            res.render("profile", { userData,addressData, orderDetails, user,walletData } )
        } else {
            req.session.admin_id = userData
            res.redirect("/profile")
        }
    } catch (e) {
        console.log("error while loading profile", e);
        res.status('500').render("500")
    }
}

//==========editprofile====================//
const editProfile = async (req,res) => {
    try{
 
        const userData = await User.findById({_id:req.session.user_id})
        const newPassword = req.body.newPassword
        const currentPassword = req.body.currentPassword  
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
  res.redirect("/profile")
    }catch(e){
        console.log('error while editing profile:',e);
        res.status(500).render(500)
    }
}
//==================sucess load=============================//
const successLoad = async (req, res) => {
    try {
        const productData = await Product.find({ Is_blocked: true }).populate({
            path: "category",
            match: { is_block: true }
        })
        res.render('userHome', { productData })
    } catch (error) {
        console.log("errr at sucees load",error);
        res.status('500').render("500")
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
        res.render('500')
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
const failureLoad = async (req, res) => {
    try {
        res.redirect('/sign-up')
    } catch (error) {
        console.log(error);
    }
}

/////==========================change passwordd===================//
  const changePasswordLoad = async (req,res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        console.log(error,"error while loading password change")
  
        res.status('500').render("500")
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
        res.status('500').render("500")
    }
}

//================user product part===================================================
const productview = async (req, res, next) => {
    try {
        console.log("")
        let user = req.session.userData;
        const productId = req.query.id;
        console.log("", productId)
        const productData = await Product.findOne({ _id: productId });
        const categoryOffer = await CategoryOffer.findOne({ category: productData.category._id });
        const wishlistData = await Wishlist.findOne({ user: user }).populate("products.product");
        let category = await Category.find({});
        let product = await Product.find({ status: "active" }).populate("category").exec();
        
        let categoryDiscountPercentage = categoryOffer ? categoryOffer.discountPercentage :0

        console.log(categoryDiscountPercentage,"cat offer");

        let productDiscountPercentage=productData.discount
        const biggestOffer = Math.max(categoryDiscountPercentage, productDiscountPercentage);

      
        const offerPrice =productData.price-(productData.price * biggestOffer / 100);
   
       productData.bigoffer =biggestOffer;
       await productData.save();
        
       productData. offerprice =offerPrice;
       await productData.save();
 
     
       productData.save()
        const relatedproduct = productData.category;
        let relatedProd = product.filter(product => product.category._id.toString() === relatedproduct._id.toString());
        
        res.render('product-details', {
            productData: productData,
            images: productData.images,
            category,
            product,
            wishlistData,
            relatedProd: relatedProd,
            offerPrice 
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











































