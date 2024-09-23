const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,ref: "User",
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,ref: "Product",required: true,
      },
      count: {
        type: Number,required: true,
      },
    },
  ],
  totalPrice: {
    type: Number,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  couponDiscountpric: {
    type: Number,
    default: 0
  },
  appliedCoupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
},
couponDiscount: {
        
  type: Number,
  required: true,
  default: 0

},

appliedCouponcode: {
  
  type: String,
 

  

}
});

module.exports = mongoose.model("Cart", cartSchema);
