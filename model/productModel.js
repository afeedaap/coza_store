let mongoose = require('mongoose');

let productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    discount:{
        type:String,
        required:true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
      },
    quantity:{
        type:Number,     
        default:0
    },
    date: {
        type: Date,
        required:true,
      },
    price:{
        type:String,
        min:0,
        required:true
    },
    images:{
        type:[String]
    },
    bigoffer: {
        type: Number,
    default: 0
    },
    offerprice:{
        type:Number,
        default:0
    },
    
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active',
      },
      offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryOffer'
      },

})
module.exports = mongoose.model('Product',productSchema);