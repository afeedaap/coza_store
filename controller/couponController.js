const Coupon=require("../model/couponModel")
const Order = require("../model/orderModel");
const Cart = require("../model/cartModel");

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
        res.render('404');
    }
};
//=============coupon load ========================///
const addCouponLoad=async(req,res)=>{
    try {
        res.render('addCoupon')
        
    } catch (error) {
        res.render('500')
    }
}
//=================coupon add=====================//
const addCoupon = async (req, res) => {
    try {
        const { couponName, couponCode, minAmount, discount } = req.body;

        // Check if the coupon code or name already exists (case-insensitive)
        const existingCouponCode = await Coupon.findOne({ couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') } });
        const existingCouponName = await Coupon.findOne({ couponName: { $regex: new RegExp(`^${couponName}$`, 'i') } });

        if (existingCouponCode || existingCouponName) {
            const errors = {};
            if (existingCouponCode) {
                errors.couponCode = 'Coupon code already exists';
            }
            if (existingCouponName) {
                errors.couponName = 'Coupon name already exists';
            }
            return res.status(400).json({ errors });
        }

        // Create a new coupon if the code and name do not exist
        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discountAmount: discount,
            minimumAmount: minAmount
        });

        await newCoupon.save();
        res.redirect('/admin/coupon');
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



//=====================editCoupon load=====================//
const editCouponLoad = async (req, res) => {
    try {
        const couponData = await Coupon.findById(req.query.id);
        res.render("editCoupon", { coupon: couponData });
    } catch (error) {
        console.log("Error at edit coupon page:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//====================edit Coupon==================//
const editCoupon = async (req, res) => {
    try {
        const { couponId, couponName, couponCode, minAmount, discount } = req.body;

        // Validate that the discount is less than or equal to 60
        if (discount > 60) {
            return res.status(400).json({ errors: { discount: 'Discount must be less than or equal to 60' } });
        }

        // Check if the coupon code or name already exists (case-insensitive), excluding the current coupon
        const existingCouponCode = await Coupon.findOne({
            couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') },
            _id: { $ne: couponId }
        });

        const existingCouponName = await Coupon.findOne({
            couponName: { $regex: new RegExp(`^${couponName}$`, 'i') },
            _id: { $ne: couponId }
        });

        if (existingCouponCode || existingCouponName) {
            const errors = {};
            if (existingCouponCode) {
                errors.couponCode = 'Coupon code already exists';
            }
            if (existingCouponName) {
                errors.couponName = 'Coupon name already exists';
            }
            return res.status(400).json({ errors });
        }

        // Update the coupon if validation passes
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                couponName,
                couponCode,
                discountAmount: discount,
                minimumAmount: minAmount,
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(500).json({ success: false, message: 'Failed to update coupon' });
        }

        res.json({ success: true, message: 'Coupon updated successfully' });
    } catch (error) {
        console.error('Error in editCoupon:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
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
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
//==================================user part==========================//
//===============apply coupon=======================//
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body; 

        const userId = req.session.user_id; 
console.log("Coupon code received:", couponCode);
        console.log("User ID:", userId);

        // Find the coupon by its code
        const coupon = await Coupon.findOne({ 
            couponCode:couponCode  });
        console.log("Coupon found:", coupon);
        // Find the coupon by its code
       
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }

        // Check if the coupon has already been used by the user
        if (coupon.users && coupon.users.includes(userId)) {
            return res.status(400).json({ success: false, message: 'Coupon already used' });
        }

        // Retrieve the user's cart
        const cart = await Cart.findOne({ user: userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Check if the cart total meets the minimum amount required for the coupon
        if (cart.totalPrice < coupon.minimumAmount) {
            return res.status(400).json({ success: false, message: `Minimum purchase amount is ${coupon.minimumAmount}` });
        }

        // Calculate the discount amount
        const discountAmount = (coupon.discountAmount / 100) * cart.totalPrice;
        const discountedTotal = cart.totalPrice - discountAmount;
        console.log("discounted amount: ", discountAmount);

        // Update the user's cart with the discounted total
        cart.discountedTotal = discountedTotal;
        await cart.save();

        // Add the user to the coupon's user list
        coupon.users = coupon.users || [];
        coupon.users.push(userId);
        await coupon.save();

        // Send the updated cart and discount details back to the user
        res.json({
            success: true,
            message: 'Coupon applied successfully',
            cartTotal: cart.totalPrice,
            discountAmount,
            discountedTotal, // Sending the discounted total
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

  

  

//=================remove coupon====================//
const removeCoupon = async (req, res) => {
    try {
        const couponValue = req.body.couponValue;
        const userId = req.session.user_id;
        let couponRemoved = false;

        // Find the coupon by its code
        const couponData = await Coupon.findOne({ couponCode: couponValue });
        console.log(couponData, "at remove coupon");

        if (!couponData) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        // Check if the user has used this coupon
        if (couponData.users.includes(userId)) {
            // Remove the user from the usedUser array
            await Coupon.findOneAndUpdate(
                { couponCode: couponValue },
                { $pull: { users: userId } }
            );
            couponRemoved = true;
        }

        if (couponRemoved) {
            res.json({ success: true, message: 'Coupon removed successfully' });
        } else {
            res.json({ success: false, message: 'Coupon not used by user' });
        }
    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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