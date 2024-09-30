const Coupon=require("../model/couponModel")
const Order = require("../model/orderModel");
const Cart = require("../model/cartModel");
//============load all coupon================
const couponLoad = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6
        const skip = (page - 1) * limit;
        let query = {};
        const totalCoupons = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);
        const couponData = await Coupon.find(query).skip(skip).limit(limit);
        
        res.render('coupon', {
            couponData,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.log("Error while loading coupons:", error);
        res.status(200).render("error") 
    }
};
//=============coupon load ========================///
const addCouponLoad=async(req,res)=>{
    try {
        res.render('addCoupon')
    } catch (error) {
        res.status(200).render("error") 
    }
}
//=================coupon add=====================//
const addCoupon = async (req, res) => {
    try {
        const { couponName, couponCode, minAmount, discount,maxAmount } = req.body;
         const couponCodePattern = /^flash-\d{4}$/;
        if (!couponCodePattern.test(couponCode)) {
            return res.status(400).json({ error: 'Invalid coupon code format. Must be flash-xxxx' });
        }
        const existingCouponCode = await Coupon.findOne({ couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') } });
        if (existingCouponCode) {
            return res.status(400).json({ existcode: true });
        }

        const existingCouponName = await Coupon.findOne({ couponName: { $regex: new RegExp(`^${couponName}$`, 'i') } });
        if (existingCouponName) {
            return res.status(400).json({ exist: true });
        }
        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discountAmount: discount,
            minimumAmount: minAmount,
            maxAmount:maxAmount
        });

        await newCoupon.save();
        res.redirect('/admin/coupon');
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(200).render("error") ;
    }
};

//=====================editCoupon load=====================//
const editCouponLoad = async (req, res) => {
    try {
        const couponData = await Coupon.findById(req.query.id);
        res.render("editCoupon", { coupon: couponData });
    } catch (error) {
        console.log("Error at edit coupon page:", error);
        res.status(200).render("error") 
    }
};
//====================edit Coupon==================//
const editCoupon = async (req, res) => {
    try {
        const { couponId, couponName, couponCode, minAmount, discount,maxAmount } = req.body;
        const couponCodePattern = /^flash-\d{4}$/;
        if (!couponCodePattern.test(couponCode)) {
            return res.status(400).json({ error: 'Invalid coupon code format. Must be "flash-xxxx" where xxxx is a four-digit number.' });
        }

        if (discount > 60) {
            return res.status(400).json({ errors: { discount: 'Discount must be less than or equal to 60' } });
        }
        const existingCouponCode = await Coupon.findOne({
            couponCode: { $regex: new RegExp(couponCode, 'i') },
            _id: { $ne: couponId }
        });
        if (existingCouponCode) {
            return res.status(400).json({ existcode: true });
        }
        const existingCouponName = await Coupon.findOne({
            couponName: { $regex: new RegExp(couponName, 'i') },
            _id: { $ne: couponId }
        });
        if (existingCouponName) {
            return res.status(400).json({ exist: true });
        }
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                couponName,
                couponCode,
                discountAmount: discount,
                minimumAmount: minAmount,
                maxAmount:maxAmount
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(500).json({ success: false, message: 'Failed to update coupon' });
        }
     res.json({ success: true, message: 'Coupon updated successfully' });
    } catch (error) {
        console.error('Error in editCoupon:', error);
        res.status(200).render("error") ;
    }
};
//===========delete coupon======================//
const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.body.couponId;

        const couponToDelete = await Coupon.findById(couponId);
        if (!couponToDelete) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        await couponToDelete.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(200).render("error") 
    }
};
//==================================user part==========================//
//===============apply coupon=======================//
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;

        const userId = req.session.user_id;
        const coupon = await Coupon.findOne({ couponCode: couponCode });
         if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }
       if (coupon.user && coupon.user.includes(userId)) {
            return res.status(400).json({ success: false, message: 'Coupon already used' });
        }
       const cart = await Cart.findOne({ user: userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
         if (cart.totalPrice < coupon.minimumAmount) {
            return res.status(400).json({ success: false, message: `Minimum purchase amount is ${coupon.minimumAmount}` });
        }
        let discountAmount = (coupon.discountAmount * cart.totalPrice) / 100;
        if (coupon. maxAmount && discountAmount > coupon.maxAmount) {
            discountAmount = coupon.maxAmount;
        }
        const discountedTotal = cart.totalPrice - discountAmount;
        cart.couponDiscount = discountAmount;
        cart.totalPrice = discountedTotal; 
        cart.appliedCouponcode = couponCode;
        await cart.save();
        await Coupon.findByIdAndUpdate({_id:coupon._id},{$push:{user:req.session.user_id}});
       await coupon.save();
        return res.json({
            success: true,
            message: 'Coupon applied successfully',
            cartTotal: cart.totalPrice, 
            discountAmount, 
            discountedTotal, 
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(200).render("error") ;
    }
};
//=================remove coupon====================//
const removeCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user_id;
        const coupon = await Coupon.findOne({ couponCode: couponCode });
         if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }
        const cart = await Cart.findOne({ user: userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
       const newTotalPrice = cart.totalPrice + cart.couponDiscount;
       cart.couponDiscount = 0;
        cart.totalPrice = newTotalPrice; 
        cart.appliedCouponcode = null;
        await cart.save();
        await Coupon.findByIdAndUpdate({_id:coupon._id},{$pull:{user:req.session.user_id}});
        await coupon.save();
        return res.json({
            success: true,
            message: 'Coupon removed successfully',
            newTotalPrice: cart.totalPrice,
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(200).render("error") ;
    }
};
  
  module.exports={
    couponLoad,
    addCouponLoad,
    addCoupon,
    deleteCoupon,
    editCouponLoad,
    editCoupon,
    removeCoupon,
    applyCoupon
}