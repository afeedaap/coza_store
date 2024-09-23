const path = require('path');
//========
const notFoundHandler = (req, res, next) => {
    const isAdminRoute = req.originalUrl.startsWith('/admin');
    
    if (isAdminRoute) {
        res.status(404).sendFile(path.join(__dirname, '../public/errorPages/admin_404.html'));
    } else {
        res.status(404).sendFile(path.join(__dirname, '../public/errorPages/user_404.html'));
    }
};
// /-------------------- internal server error 500 ------------------
const generalErrorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).sendFile(path.join(__dirname, '../public/errorPages/500.html'));
  };

module.exports = {notFoundHandler,generalErrorHandler};
