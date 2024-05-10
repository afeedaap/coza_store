const Coupon=require("../model/couponModel")

const couponLoad = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6; // Number of coupons per page
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search || ""; // Get search query
        let query = {};

        // If there's a search query, filter by it
        if (searchQuery) {
            query = { $or: [{ name: { $regex: searchQuery, $options: "i" } }, { code: { $regex: searchQuery, $options: "i" } }] };
        }

        // Count total number of coupons
        const totalCoupons = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);

        // Fetch coupons for the current page
        const couponData = await Coupon.find(query).skip(skip).limit(limit);

        res.render('coupon', {
            couponData,
            currentPage: page,
            totalPages,
            searchQuery
        });
    } catch (error) {
        console.log("Error while loading coupons:", error);
        res.render('500');
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
        const { couponName, couponCode, minAmount, discount, startDate, expireDate } = req.body;

       

        // If no existing coupon found, proceed with insertion
        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discountAmount: discount,
            startDate: new Date(),
            expireDate,
            minimumAmount: minAmount
        });

        await newCoupon.save();
        res.redirect('/admin/coupon');
    } catch (error) {
       
            // Other errors
            console.error('Error adding coupon:', error);
            res.render('500');
        }
    
};
//=====================editCoupon load=====================//
const editCouponLoad=async (req,res)=>{
    
    try {
        const couponData = await Coupon.findById({ _id: req.query.id });
        res.render("editCoupon", { coupon: couponData });
    } catch (error) {
        console.log("error at edit coupon page",error)
    }
}
//====================edit Coupon==================//
const editCoupon = async (req, res) => {
    try {
        const { couponName, couponCode, minAmount, discount, startDate, expireDate } = req.body;
        const existingCoupon = await Coupon.findOne({ couponName: { $regex: new RegExp(couponName, 'i') } });

        if (existingCoupon) {
            if (existingCoupon._id.equals(req.body.couponId)) {
                const updatedCoupon = await Coupon.findByIdAndUpdate(
                    req.body.couponId,
                    {
                        couponName: couponName,
                        couponCode: couponCode,
                        discountAmount: discount,
                        expireDate: expireDate,
                        minimumAmount: minAmount,
                    },
                    { new: true }
                );
                if (updatedCoupon) {
                   res.redirect('/admin/coupon')
                } else {
                    return res.json({ success: false, message: 'Failed to update coupon' });
                }
            } else {
                return res.json({ exist: true });
            }
        } else {
            return res.json({ success: false, message: 'Coupon not found' });
        }
    } catch (error) {
        console.log("Error in editCoupon:", error);
        return res.json({ success: false, message: 'Internal server error' });
    }
}

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

module.exports={
    couponLoad,
    addCouponLoad,
    addCoupon,
    deleteCoupon,
    editCouponLoad,
    editCoupon
}