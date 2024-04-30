let path = require('path');
const express= require("express");
const router=express();
const adminUser = require('../controller/adminController')
const categoryControl = require('../controller/categoryController')
const productController = require('../controller/productController')
const orderController = require('../controller/orderController')
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
//router.post('/toggleBlock',adminUser.toggleBlockStatus)


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



module.exports = router
