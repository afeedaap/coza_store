// admin login page not set
const path = require("path");
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
      console.log('error adminlogin load', err);
      res.status(200).render("error") 
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
            res.status(200).render("error") 
        }

    } catch (error) {
        console.log(" this is adminVerify error",error);

        
    }
};
//==================Loading the admin dashboard==============//
const adminDashboard = async (req, res) => {
  try {
    
    const topSellingCategories = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          productCount: { $sum: 1 },
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $addFields: {
          categoryName: { $arrayElemAt: ["$categoryInfo.name", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          productCount: 1,
          categoryName: 1,
        },
      },
    ]);

  
    const topSellingProducts = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          count: { $sum: "$products.count" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $addFields: {
          name: { $arrayElemAt: ["$productInfo.name", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          name: 1,
        },
      },
    ]);
    const customerIds = await Order.distinct("user"); 
    const userCount = customerIds.length;

   
    const orders = await Order.aggregate([
      {
        $unwind: "$products",
      },
      {
        $match: {
          "products.productStatus": "Delivered", 
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

    const sales = await Order.countDocuments({
      "products.productStatus": { $in: ["Delivered", "Rejected"] },
    });
    
    const totalRevenue = orders.reduce((acc, order) => {
      return acc + order.products.totalPrice;
    }, 0);


    const totalDeliveredProductsCount = orders.length;

   
    res.render("dashboard", {
      topSellingCategories,
      topSellingProducts,
      sales,
      userCount,
      totalRevenue,
      totalDeliveredProductsCount,
    });
  } catch (error) {
    console.log(
      "Error occurred in admin controller at adminDashboard function ",
      error
    );
    res.status(500).render("error");
  }
};
//=========logout================//
const logout = async(req,res)=>{
    try{
        req.session.Admin = null;
        res.redirect('/admin/login')
    } catch (error) {
        console.log('Error hapens in admin controller at logout function',error);
        res.status(200).render("error") 

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
            res.status(200).render("error") 

        
         }
    }
//=============Blocking the user==================================
  let userBlock = async(req,res) =>{
    try{
        let id = req.query.id;
        let blockUser = await User.findByIdAndUpdate(id,{is_block:true},{new:true});
                if(blockUser){
                    res.redirect('/admin/users');
                }
               
            }catch(err){
                console.log(err);
                res.status(200).render("error") 
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
                res.status(200).render("error") 
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
        res.status(200).render("error") 

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
    const statusFilter = ["Delivered", "rejected"]; // Filter for both Delivered and Rejected

    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      totalOrders = await Order.countDocuments({
        "products.productStatus": { $in: statusFilter },
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      });
      const totalPages = Math.ceil(totalOrders / limit);

      try {
        orders = await Order.aggregate([
          {
            $unwind: "$products",
          },
          {
            $match: {
              "products.productStatus": { $in: statusFilter },
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
        "products.productStatus": { $in: statusFilter },
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
            "products.productStatus": { $in: statusFilter },
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
        "products.productStatus": { $in: statusFilter },
        date: { $gte: startDate, $lte: currentDate },
      });
      const totalPages = Math.ceil(totalOrders / limit);

      orders = await Order.aggregate([
        {
          $unwind: "$products",
        },
        {
          $match: {
            "products.productStatus": { $in: statusFilter },
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
    res.status(500).send({ message: "An error occurred while loading the sales report." });
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
  
      const totalRevenue = orders.reduce((acc, order) => {
        return acc + order.products.totalPrice;
      }, 0);
  
      const totalDeliveredProductsCount = orders.length;
  
      worksheet.addRow([
        "Order ID",
        "Billing Name",
        "Date",
        "Total",
        "Payment Method",
       
        "Quantity",
      ]);
  
      orders.forEach((order) => {
        worksheet.addRow([
          order._id,
          order.deliveryDetails.fullName,
          order.date.toISOString().split('T')[0],
          order.totalAmount,
          order.paymentMethod,
          
          order.products.count,
        ]);
      });
  
      worksheet.addRow([]);
      worksheet.addRow(["Total Revenue", totalRevenue]);
      worksheet.addRow(["Total Delivered Products Count", totalDeliveredProductsCount]);
  
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
//========pdf Download==================//
 const pdfDownload = async (req, res) => {
    try {
      const duration = req.query.sort;
      const currentDate = new Date();
      const startDate = new Date(currentDate - duration * 24 * 60 * 60 * 1000);
  
      const orders = await Order.aggregate([
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
            from: "Products",
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
        const orderProductsArray = Array.isArray(order.products)
          ? order.products
          : [order.products];
        return (
          acc +
          orderProductsArray.reduce((acc, product) => {
            return (
              acc +
              (product.productStatus === "Delivered" ? product.totalPrice : 0)
            );
          }, 0)
        );
      }, 0);
  
      const totalDeliveredProductsCount = orders.reduce((acc, order) => {
        const orderProductsArray = Array.isArray(order.products)
          ? order.products
          : [order.products];
        return (
          acc +
          orderProductsArray.reduce((acc, product) => {
            return acc + (product.productStatus === "Delivered" ? 1 : 0);
          }, 0)
        );
      }, 0);
  
      const ejsPagePath = path.join(__dirname, "../views/admin/report.ejs");
      const ejsPage = await ejs.renderFile(ejsPagePath, {
        orders,
        totalRevenue,
        totalDeliveredProductsCount,
      });
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(ejsPage);
      const pdfBuffer = await page.pdf();
      await browser.close();
  
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      console.log(error.message);
      res.status(500).render("error");
    }
  };
// ====graph data ===============//
 const graphData = async (req, res) => {
    try {
      console.log("Received graph data request", req.body);
  
      // Initialize salesData object with separate datasets for sales, revenue, and products
      let salesData = {
        labels: [], // Labels for the graph
        salesData: [], // Sales count data
        revenueData: [], // Revenue data
        productsData: [], // Products data
      };
  
      const { filter, time } = req.body;
  
      if (filter === "monthly") {
        // If the filter is set to monthly, set labels to months
        salesData.labels = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
  
        // Define constraints for the query
        const constraints = {
          $gte: new Date(`${time}-01-01T00:00:00.000Z`),
          $lte: new Date(`${time}-12-31T23:59:59.999Z`),
        };
  
        // Aggregate sales data
        const sales = await Order.aggregate([
          {
            $match: {
              createdAt: constraints,
            },
          },
          {
            $group: {
              _id: {
                $month: "$createdAt",
              },
              revenueData: {
                $sum: "$totalAmount", // Total revenue
              },
              salesData: {
                $sum: 1, // Total sales count
              },
            },
          },
          {
            $sort: {
              _id: 1, // Sort by month
            },
          },
        ]);
        console.log("Aggregated sales data:", sales);
        // Aggregate products data
        const products = await Product.aggregate([
          {
            $match: {
              createdAt: constraints,
            },
          },
          {
            $group: {
              _id: {
                $month: "$createdAt",
              },
              productsData: {
                $sum: 1, // Count products created in each month
              },
            },
          },
          {
            $sort: {
              _id: 1, // Sort by month
            },
          },
        ]);
        console.log("Aggregated products data:", products);
        // Fill salesData arrays with sales and revenue data
        sales.forEach((item) => {
          const monthIndex = item._id - 1; // Convert month index to zero-based
          salesData.salesData[monthIndex] = item.salesData;
          salesData.revenueData[monthIndex] = item.revenueData / 1000 // Adjust revenue for graph scale
        });
  
        // Fill salesData array with products data
        products.forEach((item) => {
          const monthIndex = item._id - 1;
          salesData.productsData[monthIndex] = item.productsData;
        });
  
        console.log("Monthly Sales Data:", salesData);
      } else {
        // If the filter is set to yearly, create labels for the last 10 years
        salesData.labels = [
          `${time - 10}`,
          `${time - 9}`,
          `${time - 8}`,
          `${time - 7}`,
          `${time - 6}`,
          `${time - 5}`,
          `${time - 4}`,
          `${time - 3}`,
          `${time - 2}`,
          `${time - 1}`,
          `${time}`,
        ];
  
        // Define constraints for the query
        const constraints = {
          $gte: new Date(`${time - 10}-01-01T00:00:00.000Z`),
          $lte: new Date(`${time}-12-31T23:59:59.999Z`),
        };
  
        // Aggregate yearly sales data
        const sales = await Order.aggregate([
          {
            $match: {
              createdAt: constraints,
            },
          },
          {
            $group: {
              _id: {
                $year: "$createdAt",
              },
              revenueData: {
                $sum: "$totalAmount", // Total revenue
              },
              salesData: {
                $sum: 1, // Total sales count
              },
            },
          },
          {
            $sort: {
              _id: 1, // Sort by year
            },
          },
        ]);
  
        // Aggregate yearly products data
        const products = await Product.aggregate([
          {
            $match: {
              createdAt: constraints,
            },
          },
          {
            $group: {
              _id: {
                $year: "$createdAt",
              },
              productsData: {
                $sum: 1, // Count products created in each year
              },
            },
          },
          {
            $sort: {
              _id: 1, // Sort by year
            },
          },
        ]);
  
        console.log("Yearly Sales and Products Data:", { sales, products });
  
        // Initialize salesData arrays with zeros
        salesData.salesData = Array(salesData.labels.length).fill(0);
        salesData.revenueData = Array(salesData.labels.length).fill(0);
        salesData.productsData = Array(salesData.labels.length).fill(0);
  
        // Populate salesData arrays with sales data
        sales.forEach((item) => {
          const yearIndex = salesData.labels.indexOf(item._id.toString());
          if (yearIndex !== -1) {
            salesData.salesData[yearIndex] = item.salesData;
            salesData.revenueData[yearIndex] = item.revenueData / 1000; // Adjust revenue for graph scale
          }
        });
  
        // Populate salesData arrays with products data
        products.forEach((item) => {
          const yearIndex = salesData.labels.indexOf(item._id.toString());
          if (yearIndex !== -1) {
            salesData.productsData[yearIndex] = item.productsData;
          }
        });
      }
  
      // Send the sales data response
      res.status(200).json(salesData);
    } catch (error) {
      console.log("Error occurred in graphData function:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };  
//=======error page=====//
let errorPage = async (req, res) => {
  try {
    res.render("error");
  } catch (error) {
    console.log(error.message);
    
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
   pdfDownload,
   errorPage,
   graphData


}
