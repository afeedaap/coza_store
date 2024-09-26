const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

module.exports = {
    connectDB: () => {
        mongoose.connect(process.env.mongo, {
            tls: true, 
            tlsInsecure: false, 
            ssl: true 
        })
        .then(() => {
            console.log("db connected");
        })
        .catch(error => {
            console.error("Error connecting to database:", error);
        });
    }
};
