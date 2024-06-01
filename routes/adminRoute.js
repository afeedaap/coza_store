let path = require('path');
const express= require("express");
const router=express();
const adminUser = require('../controller/adminController')
const categoryControl = require('../controller/categoryController')
const productController = require('../controller/productController')
const orderController = require('../controller/orderController')
const offerController=require('../controller/offerController')
const couponController=require('../controller/couponController')
let adminAuth = require('../middleware/adminAuth');
let {upload} = require('../config/multer');
router.set('view engine','ejs');
router.set('views',path.join(__dirname,'../views/admin'));


//=========Login of admin user  related routes==============>//
router.get('/login',adminAuth.isLoggedOut,adminUser.adminLogin);
router.post('/login',adminUser.verifyAdminLogin);
router.get('/dashboard',adminAuth.isLoggedIn,adminUser.adminDashboard);
router.get('/logout',adminUser.logout);
 router.get('/users',adminUser.userField)
router.get('/block',adminUser.userBlock)
router.get('/unblock',adminUser.userUnBlock)
router.get('/products',adminUser.product)
router.get('/productlist',adminUser.productlist)


//=========category part============================
router.get('/category',categoryControl.allCategory )
router.post('/addCategory',adminAuth.isLoggedIn,upload.single('image'),categoryControl.addCategory);
router.post('/updateCategory',adminAuth.isLoggedIn,upload.single('image'),categoryControl.updateCategory);
router.get('/deleteCategory',adminAuth.isLoggedIn,categoryControl.deleteCategory);
router.get('/editCategory',adminAuth.isLoggedIn,categoryControl.editCategory);
router.get('/categoryUnlist',adminAuth.isLoggedIn,categoryControl.categoryUnlist)
router.get('/categoryList',adminAuth.isLoggedIn,categoryControl.categoryList)
// ===============product part=====================//
router.get('/product',productController.productListPage);
router.get('/addProduct',adminAuth.isLoggedIn,productController.loadAddProduct)
router.get('/searchProduct', productController.loadProductSearchQuery);
router.get('/editProduct',productController.editProduct);
router.post('/createProduct',adminAuth.isLoggedIn,upload.array('images', 4),productController.createProduct);
router.post('/productEdited',upload.array('images', 4),productController.productEdited);
router.post('/toggleBlockProduct',adminAuth.isLoggedIn,productController.toggleBlockStatusProduct)
router.get('/deleteProduct',adminAuth.isLoggedIn,productController.deleteProduct);
router.get('/deleteimage', productController.deleteimage)
//==================order=====================================//
router.get('/order',adminAuth.isLoggedIn,orderController.loadOrder);
router.get('/order-details',adminAuth.isLoggedIn, orderController.orderdetailsLoad);
router.post('/update-order',adminAuth.isLoggedIn,orderController.updateOrder)
//====================offer========================//
router.get('/offer',adminAuth.isLoggedIn,offerController.offerload );
router.get('/categoryOffer',adminAuth.isLoggedIn,offerController.loadCategoryOffer);
router.get('/addCategoryOffer',adminAuth.isLoggedIn,offerController.loadAddCategoryOffer);
router.post('/addCategoryOffer',adminAuth.isLoggedIn,offerController.createCategoryOffer);
router.get('/editCategoryOffer',adminAuth.isLoggedIn,offerController.editCategoryOffer);
router.post('/editCategoryOffer',adminAuth.isLoggedIn,offerController.updateCategoryOffer);
router.get('/deleteCategoryOffer',adminAuth.isLoggedIn,offerController.deleteCategoryOffer );
router.get('/productOffer',adminAuth.isLoggedIn,offerController.loadProductOffer);
router.get('/addProductOffer',adminAuth.isLoggedIn,offerController.loadAddProductOffer);
router.post('/addProductOffer',adminAuth.isLoggedIn,offerController.createProductOffer);
router.get('/editProductOffer',adminAuth.isLoggedIn,offerController.editProductOffer);
router.post('/editProductOffer',adminAuth.isLoggedIn,offerController.updateProductOffer);
router.get('/deleteProductOffer',adminAuth.isLoggedIn,offerController.deleteProductOffer );
router.get('/refferalOffer',adminAuth.isLoggedIn,offerController.loadRefferalOffer);
router.get('/addReferalOffer',adminAuth.isLoggedIn,offerController.loadAddRefferalOffer);
router.post('/addRefferalOffer',adminAuth.isLoggedIn,offerController. addRefferalOffer);
router.get('/editRefferalOffer',adminAuth.isLoggedIn,offerController.editRefferalOffer);
router.post('/editRefferalOffer',adminAuth.isLoggedIn,offerController.updateRefferalOffer);
 router.get('/deleteRefferalOffer',adminAuth.isLoggedIn,offerController. deleteRefferalOffer );



//=======================coupon==============================//
router.get('/coupon',adminAuth.isLoggedIn,couponController.couponLoad);
router.get('/addCoupon',adminAuth.isLoggedIn,couponController.addCouponLoad);
router.post('/addCoupon',adminAuth.isLoggedIn,couponController.addCoupon);
router.get('/editCoupon',adminAuth.isLoggedIn,couponController.editCouponLoad);
router.post('/editCoupon',adminAuth.isLoggedIn,couponController.editCoupon);
router.delete('/deleteCoupon',adminAuth.isLoggedIn,couponController.deleteCoupon);
//============================================================================//



module.exports = router
