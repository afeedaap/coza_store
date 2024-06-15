const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const GoogleUser = require('../model/googleModel');

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:7000/auth/google/callback",
    passReqToCallback: true
},
    async (request, accessToken, refreshToken, profile, done) => {
        try {
            // Check if the user already exists
            let user = await GoogleUser.findOne({ googleId: profile.id });
            if (!user) {
                // Create a new user if not found
                user = new GoogleUser({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value // Correcting the email field
                });

                await user.save();
            }

            return done(null, user);
        } catch (e) {
            console.log(e, "error occurred while saving to database");
            return done(e); // Pass the error to done callback
        }
    }
));
