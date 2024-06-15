// admin login page not set
let path = require('path');
let User = require('../model/userModel');
let adminAuth = require('../middleware/adminAuth');
const Order = require("../model/orderModel");
const Product = require("../model/productModel");
const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const fs = require("fs");

//===============Admin Login==========================//
let adminLogin = async(req,res)=>{
    try{
       
        res.render('adminLogin');
    }catch(err){
        if (err) throw err;
    }
}
//===========verify admin=================//
const verifyAdminLogin=async(req,res)=>{
    try {
        const {email, password}=req.body;
         if(email === process.env.AD_EMAIL && password === process.env.AD_PASS){
            console.log('password of admin was matched');
            req.session.Admin=true;
            res.redirect('/admin/dashboard')
        }
        else{
            res.redirect('/admin/login');
        }

    } catch (error) {
        console.log(" this is adminVerify error",error);
        
    }
};
//==================Loading the admin dashboard==============//
const adminDashboard = async (req, res) => {
    try{
     res.render('dashboard');

    } catch (error) {
        console.log('Error happened in admin controller at adminLoginPage function ', error);
    }

}
//=========logout================//
const logout = async(req,res)=>{
    try{
        req.session.Admin = null;
        res.redirect('/admin/login')
    } catch (error) {
        console.log('Error hapens in admin controller at logout function',error);

    }
}
//==============userfield==================//
const userField = async(req,res)=>{
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) ||4;
        const skip = (page - 1) *limit;
       const user = await User.find({is_admin:{$ne:1}})
        .skip(skip)
        .limit(limit);
    
        const totalProductsCount = await User.countDocuments();
     
        const totalPages = Math.ceil(totalProductsCount / limit);
        res.render('users',{users:user,page,totalPages,limit});
    
        } catch (error){
            console.log("user field error in dashboard",error);

        
         }
    }
// =============Blocking the user==================================
         let userBlock = async(req,res) =>{
            try{
                let id = req.query.id;
                let blockUser = await User.findByIdAndUpdate(id,{is_block:true},{new:true});
                if(blockUser){
                    res.redirect('/admin/users');
                }
               
            }catch(err){
                console.log(err);
            }
         }

//=====================Unblocking the user==============================         
         let userUnBlock = async(req,res) =>{
            try{
                let id = req.query.id;
                let blockUser = await User.findByIdAndUpdate(id,{is_block:false},{new:true});
                if(blockUser){
                    res.redirect('/admin/users');
                }
               
            }catch(err){
                console.log(err);
            }
         }
//=========================product page===============>
const product = async(req,res)=>{
    try{
      
        res.render('product')
    } catch (error) {
        console.log('cannot get the product page',error);

    }
}

//=========================productlist=========================//
const productlist = async(req,res)=>{
    try{
      
        res.render('productlist')
    } catch (error) {
        console.log('cannot get the product page',error);

    }
}
//=================sales report load========================//
const salesReportLoad = async (req, res) => {
    try {
      const date = req.query.date;
      const duration = req.query.sort;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
  
      const currentDate = new Date();
      const startDate = new Date(
        currentDate - (duration ? duration * 24 * 60 * 60 * 1000 : 0)
      );
  
      let orders;
      let totalOrders;
      if (req.query.startDate && req.query.endDate) {
        console.log("heyyyyyy");
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);
        totalOrders = await Order.countDocuments({
          "products.productStatus": "Delivered",
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        });
        const totalPages = Math.ceil(totalOrders / limit);
        console.log("tot", totalPages, req.query.startDate, req.query.endDate);
        try {
          orders = await Order.aggregate([
            {
              $unwind: "$products",
            },
            {
              $match: {
                "products.productStatus": "Delivered",
                date: {
                  $gte: startDate,
                  $lte: endDate,
                },
              },
            },
            {
              $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "products.productDetails",
              },
            },
            {
              $addFields: {
                "products.productDetails": {
                  $arrayElemAt: ["$products.productDetails", 0],
                },
              },
            },
            {
              $sort: { date: -1 },
            },
            {
              $skip: (page - 1) * limit,
            },
            {
              $limit: limit,
            },
          ]);
        } catch (error) {
          console.error("Aggregation error:", error);
        }
        console.log("ordeee", orders);
        res.render("sales-report", {
          orders,
          date,
          duration,
          totalPages,
          page,
          limit,
        });
      } else if (date && date !== "undefined") {
        const targetDate = new Date(date);
  
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
  
        totalOrders = await Order.countDocuments({
          "products.productStatus": "Delivered",
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        });
  
        const totalPages = Math.ceil(totalOrders / limit);
        orders = await Order.aggregate([
          {
            $unwind: "$products",
          },
          {
            $match: {
              "products.productStatus": "Delivered",
              date: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "products.productId",
              foreignField: "_id",
              as: "products.productDetails",
            },
          },
          {
            $addFields: {
              "products.productDetails": {
                $arrayElemAt: ["$products.productDetails", 0],
              },
            },
          },
          {
            $sort: { date: -1 },
          },
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit,
          },
        ]);
  
        res.render("sales-report", {
          orders,
          date,
          duration,
          totalPages,
          page,
          limit,
        });
      } else {
        totalOrders = await Order.countDocuments({
          "products.productStatus": "Delivered",
          date: { $gte: startDate, $lte: currentDate },
        });
        const totalPages = Math.ceil(totalOrders / limit);
  
        orders = await Order.aggregate([
          {
            $unwind: "$products",
          },
          {
            $match: {
              "products.productStatus": "Delivered",
              date: { $gte: startDate, $lte: currentDate },
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "products.productId",
              foreignField: "_id",
              as: "products.productDetails",
            },
          },
          {
            $addFields: {
              "products.productDetails": {
                $arrayElemAt: ["$products.productDetails", 0],
              },
            },
          },
          {
            $sort: { date: -1 },
          },
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit,
          },
        ]);
  
        res.render("sales-report", {
          orders,
          totalPages,
          date,
          duration,
          page,
          limit,
        });
      }
    } catch (error) {
      console.log("while loading sales report", error);
      res
        .status(500)
        .send({ message: "An error occurred while loading the sales report." });
    }
  };
  
  //========excel load=============================//
const excelDownload = async (req, res) => {
    try {
      const { startDate, endDate, sort } = req.query;
      const currentDate = new Date();
      let start, end;
  
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      } else {
        const duration = parseInt(sort);
        start = new Date(currentDate.getTime() - duration * 24 * 60 * 60 * 1000);
        end = currentDate;
      }
  
      const orders = await Order.aggregate([
        {
          $unwind: "$products",
        },
        {
          $match: {
            "products.productStatus": "Delivered",
            date: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "products.productDetails",
          },
        },
        {
          $addFields: {
            "products.productDetails": {
              $arrayElemAt: ["$products.productDetails", 0],
            },
          },
        },
        {
          $sort: { date: -1 },
        },
      ]);
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales Report");
  
      worksheet.addRow([
        "Order ID",
        "Billing Name",
        "Date",
        "Total",
        "Payment Method",
        "Product Name",
        "Quantity",
      ]);
  
      orders.forEach((order) => {
        worksheet.addRow([
          order._id,
          order.deliveryDetails.fullName,
          order.date.toISOString().split('T')[0],
          order.totalAmount,
          order.paymentMethod,
          order.products.productDetails.name,
          order.products.count,
        ]);
      });
  
      const buffer = await workbook.xlsx.writeBuffer();
  
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.xlsx"
      );
      res.send(buffer);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
  const pdfDownload = async (req, res) => {
    try {
      const { startDate, endDate, sort } = req.query;
      const currentDate = new Date();
      let start, end;
  
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      } else {
        const duration = parseInt(sort);
        start = new Date(currentDate.getTime() - duration * 24 * 60 * 60 * 1000);
        end = currentDate;
      }
  
      const orders = await Order.aggregate([
        {
          $unwind: "$products",
        },
        {
          $match: {
            "products.productStatus": "Delivered",
            date: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "products.productDetails",
          },
        },
        {
          $addFields: {
            "products.productDetails": {
              $arrayElemAt: ["$products.productDetails", 0],
            },
          },
        },
        {
          $sort: { date: -1 },
        },
      ]);
  
      const totalRevenue = orders.reduce((acc, order) => {
        return acc + order.products.totalPrice;
      }, 0);
  
      const totalDeliveredProductsCount = orders.length;
  
      const ejsPagePath = path.join(__dirname, "../views/admin/report.ejs");
      const ejsPage = await ejs.renderFile(ejsPagePath, {
        orders,
        totalRevenue,
        totalDeliveredProductsCount,
      });
  
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(ejsPage);
      const pdfBuffer = await page.pdf({ format: 'A4' });
      await browser.close();
  
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=sales_report.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
  
  

module.exports = {
    adminLogin,
    verifyAdminLogin,
     adminDashboard,
     logout,
    userField,
     userBlock,
    userUnBlock,
    product,
   productlist,
   salesReportLoad,
   excelDownload ,
   pdfDownload

}
