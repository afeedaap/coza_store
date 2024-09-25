const mongoose = require('mongoose');
const dotenv = require('dotenv').config();

module.exports = {
    connectDB: () => {
        mongoose.connect(process.env.mongo, {
            tls: true, // Enable TLS
            tlsInsecure: false, // Keep this false unless using self-signed certificates
            ssl: true // Enable SSL
        })
        .then(() => {
            console.log("db connected");
        })
        .catch(error => {
            console.error("Error connecting to database:", error);
        });
    }
};
