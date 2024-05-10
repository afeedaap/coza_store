const mongoose = require('mongoose');
const couponSchema = mongoose.Schema({
        couponName: {
            type: String,
            required: true
        },
        couponCode: {
            type: String,
            required: true
        },
        discountAmount: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        expireDate: {
            type: Date,
            required: true
        },
        minimumAmount: {
            type: String,
            required: true
        },
        usedUser: {
            type: Array,
            ref: 'User',
            default: []
        },
    }, {
        timestamps: true    
    });

    module.exports = mongoose.model('Coupon', couponSchema);