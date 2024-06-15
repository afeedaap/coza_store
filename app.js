const mongoDb = require("./config/mongoAuth")
const express = require('express');
const path = require('path');
const session = require('express-session')
const flash = require('connect-flash');
require('dotenv').config();
const app = express();
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true
}))
app.use(flash())
//============import routes==============
const user_route = require('./routes/userRoute');
const admin_route = require('./routes/adminRoute');

mongoDb.connectDB()

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', user_route);
app.use('/admin', admin_route);


app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'SECRET'
  }));
  

app.listen(7000, () => {
    console.log(`Server is running on http://localhost:7000 and  http://localhost:7000/admin/login`);
});

module.exports = app;
