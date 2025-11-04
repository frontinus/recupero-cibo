'use strict';

const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;

/**
 * Helper function to initialize passport authentication with the LocalStrategy
 * 
 * @param app express app
 */
function initAuthentication(app, db) {
    passport.use(new LocalStrategy((username, password, done) => {
        db.authUser(username, password)
            .then(user => {
                if (user) done(null, user);
                else done({ status: 401, msg: 'Incorrect username and/or password!' }, false);
            })
            .catch(() => done({ status: 500, msg: 'Database error' }, false));
    }));

    // Serialization and deserialization of the user to and from a cookie
    passport.serializeUser((user, done) => {
        // Store id and isAdmin status
        done(null, { id: user.id, isAdmin: user.isAdmin, shopId: user.shopId || null});
    });

    passport.deserializeUser((sessionData, done) => {
        // sessionData now contains { id, isAdmin }
        db.getUserbyId(sessionData.id)
            .then(user => {
                // db.getUserbyId returns { ID, Username, isAdmin }
                if (user) {
                    // FIXED: Ensure consistent lowercase 'username' property
                    done(null, { 
                        id: user.ID, 
                        username: user.Username.toLowerCase(), // Normalize to lowercase
                        Username: user.Username, // Keep original for backward compatibility
                        isAdmin: user.isAdmin, 
                        shopId: user.shopId || null
                    });
                } else {
                    done({ status: 404, msg: 'User not found during deserialization' }, null);
                }
            })
            .catch(e => done(e, null));
    });

    // Initialize express-session
    app.use(session({
        secret: process.env.SESSION_SECRET || "386e60adeb6f34186ae167a0cea7ee1dfa4109314e8c74610671de0ef9662191",
        resave: false,
        saveUninitialized: false,
    }));

    // Initialize passport middleware
    app.use(passport.initialize());
    app.use(passport.session());
}

/**
 * Express middleware to check if the user is authenticated.
 * Responds with a 401 Unauthorized in case they're not.
 */
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    return res.status(401).json({ errors: ['Must be authenticated to make this request!'] });
}

/**
 * Express middleware to check if the authenticated user is an admin.
 * Assumes isLoggedIn middleware runs first.
 */
function isAdmin(req, res, next) {
    // req.user comes from deserializeUser and should include isAdmin
    if (req.user && req.user.isAdmin === true) {
        return next();
    }
    return res.status(403).json({ errors: ['Forbidden: Administrator access required!'] });
}

// Add middleware to check if user is a shop owner
function isShopOwner(req, res, next) {
    if (req.user && req.user.shopId) {
        return next();
    }
    return res.status(403).json({ errors: ['Forbidden: Shop owner access required!'] });
}

module.exports = { initAuthentication, isLoggedIn, isAdmin, isShopOwner };