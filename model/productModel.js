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
    size:{
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
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active',
      },

})
module.exports = mongoose.model('Product',productSchema);