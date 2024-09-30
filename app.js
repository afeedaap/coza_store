const mongoDb = require("./config/mongoAuth")
const express = require('express');
const path = require('path');
const session = require('express-session')
const flash = require('connect-flash'); 
const nocache = require('nocache')
const PORT = 7001;
const cors = require('cors');
const {notFoundHandler,generalErrorHandler} = require('./middleware/error')
const passport = require('passport');
const userRoute = require('./routes/userRoute');
require('dotenv').config();
const app = express();
app.use(session({
 secret:"my-session-secret",
 resave:false,
saveUninitialized:true
}))
app.use(flash());
app.use(nocache())
//============import routes==============
const user_route = require('./routes/userRoute');
const admin_route = require('./routes/adminRoute');
mongoDb.connectDB()
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 
 'public')));
app.use('/', user_route);
app.use('/admin', admin_route);
app.use(cors({
origin: 'http://localhost:7001'
}));
app.use(session({
resave: false,
 saveUninitialized: true,
  secret: 'SECRET'
 }));
 app.use(notFoundHandler);
app.use(generalErrorHandler);

app.listen(PORT, () => {
 console.log(`Server is running on http://localhost:7001 and  http://localhost:7001/admin/login`);
});

module.exports = app;