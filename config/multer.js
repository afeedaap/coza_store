const multer  = require('multer')
const path = require('path')
const fs = require('fs');
const mimetype=require('mime-types')
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, 'public/adminAssets/imgs/category');
    },
    filename: function (req, file, callback) {
      callback(null,  uuidv4() + path.extname(file.originalname))}
  });

const fileFilter = function (req, file, callback) {
    // Allow all image files
    if (file.mimetype.startsWith('image/')) {
        callback(null, true);
    } else {
        // Reject other file types
        callback(new Error('Only image files are allowed!'), false);
    }
};


  const upload=multer({storage:storage,fileFilter:fileFilter, limits: { files: 3 }})

  module.exports={upload}

  