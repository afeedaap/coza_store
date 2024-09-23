
let mongoose = require("mongoose");

let categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    image:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['active','blocked'],
        default:'active'
    },
    offer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Offer"
      }
});
module.exports = mongoose.model('Category',categorySchema);