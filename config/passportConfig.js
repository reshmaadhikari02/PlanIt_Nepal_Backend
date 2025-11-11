const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URI,
        },
        async(_accessToken, _refreshToken, profile, done)=>{
            const email = profile.emails[0].value;
            const name = profile.displayName;
            const profileImage = profile.photos[0].value;
            try{
                let user = await User.findOne({email});
                if(!user){
                    user = await User.create({
                        name,
                        email,
                        password:"",
                        role:"customer",
                        profileImage,
                    });
                }
                return done(null,user);
            }catch(err){
                return done(err,null);
            }
        }

    )
);