const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('../model/userModel')

const env = require('dotenv')

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://www.cozastore.site/auth/google/callback",
    passReqToCallback: true
},
    async (request, accessToken, refreshToken, profile, done) => {
        try {
            
            const checkUser=await User.findOne({email:profile.email})
            if(!checkUser){
                const newUser = new User({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.email
                });
                await newUser.save()
                request.session.email=profile.email
                request.session.user_id = newUser._id;
                return done(null, profile)
            }
            request.session.email=profile.email
            request.session.user_id = checkUser._id
            return done(null, profile)
        }
      catch (e) {
        
            console.log(e, "error occurred while saving to database");
            return done(e); 
        }
    }
));


