
const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
  
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    mobile:{
        type:String,
        required:true,
        minlength:10
    },
    password:{
        type:String,
        required:true,
        minlength:6
    },
    image:{
        type:String,
        required:false
    },
    is_verified:{
        type:Boolean,
        default:0
    },
    is_admin:{
        type:Boolean,
        default:0

    },
    is_block:{
        type:Boolean,
        default:0
    },referral:{
        type:String,
      },
      wallet: {
        type: Number,
        default: 0,
      },
      applyCoupon : [],

      walletHistory: [
        {
          date: {
            type: Date,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          direction: {
            type: String,
          },
        },
      ],
    });
    
    

module.exports = mongoose.model("User",userSchema)