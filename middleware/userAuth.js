const User = require('../model/userModel');

const isLogin = async (req, res, next) => {
    try {
        console.log("rtyy",req.session);
        if (req.session.user_id) {
            const userData = await User.findById(req.session.user_id);
            if (userData) {
                if (userData.is_block) {
                    req.session.destroy();
                    console.log('Redirecting to login due to block status');
                    return res.redirect('/login');
                } else {
                    return next();
                }
            } else {
                console.log('User not found in the database');
                req.session.destroy();
                return res.redirect('/login');
            }
        } else {
            console.log('No user ID found in session');
            console.log('Attempting to redirect to login');
            return res.redirect('/login');
        }
    } catch (error) {
        console.log('Error in isLogin middleware:', error);
        return res.status(500).send('Internal Server Error');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const userData = await User.findById(req.session.user_id);
            if (userData) {
                if (userData.is_block) {
                    return next();
                } else {
                    return res.redirect('/');
                }
            } else {
                console.log('User not found in the database');
                req.session.destroy();
                return res.redirect('/login');
            }
        } else {
            return next();
        }
    } catch (error) {
        console.log('Error in isLogout middleware:', error);
        return res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    isLogin,
    isLogout
};
