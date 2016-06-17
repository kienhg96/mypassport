'use strict;'

var flash = require('connect-flash');
var express = require("express");

var expressSession = require("express-session");
require('dotenv').load();
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;

var mongo = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var app = express();
// router
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(flash());

var db;
var collection;
// Connect Database
mongo.connect(process.env.MONGO_URI, function(err, cdb){
    if (err) throw err;
    db = cdb;
    collection = db.collection('info');
});
    
// Configuring passport
app.use(expressSession({secret: 'MYSECRETISVERYSECRET', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
    //console.log('serializing user: ', user);
    done(null, user._id);
});

passport.deserializeUser(function(id, done){
    //console.log(ObjectID(id));
    collection.findOne({_id : ObjectID(id)}, function(err, user){
        //console.log('deserializing user:', user);
        done(err, user);
    });
});

// Login strategy
passport.use('login', new LocalStrategy({
    passReqToCallback: true
},  function(req, username, password, done){
        collection.findOne({'username': username}, function(err, user){
            if (err) { 
                return done(err);
            }
            if (!user){
                console.log('username not found with ' + username);
                return done(null, false, req.flash('message', 'User not found.'));
            }
            
            if (user.password !== password) {
                console.log('Invalid Password');
                return done(null, false, req.flash('message', 'Invalid password'));
            }
            return done(null, user);
        });
    } )
);

passport.use('signup', new LocalStrategy({
    passReqToCallback: true
}, function(req, username, password, done){
    var findOrCreateUser = function(){
        collection.findOne({'username': username}, function(err, user){
            if (err) {
                console.log('Error: ' + err);
                return done(err);
            }
            if (user){
                console.log("Username exist!");
                return done(null, false, req.flash('message', 'Username exist'));
            }
            else {
                var newuser = {
                  'username' : username,
                  'password' : password
                };
                collection.insert(newuser, function(err){
                    if (err) throw err;
                    console.log('Registration successfully');
                    return done(null, newuser);
                });
            }
        });
    }
    process.nextTick(findOrCreateUser);
    //findOrCreateUser();
}));

app.get('/', function(req, res){
    if (req.isAuthenticated()){
        res.redirect('/home');
    }
    else {
        res.sendfile('./html/login.html');
    }
});
app.get('/home', function(req,res){
    //console.log(req.isAuthenticated());
    if (req.isAuthenticated()){
        res.send("Login as: " + req.user.username + ' <a href="/logout">Logout</a>');
        //console.log(req.user.password);
    }
    else {
        res.redirect('/');
    }
});
app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.get('/signup', function(req, res){
    res.sendfile('./html/signup.html');
});


app.post('/login', passport.authenticate('login',{
    successRedirect :'/home',
    failureRedirect :'/',
    failureFlash : true
}));

app.post('/signup', passport.authenticate('signup',{
    successRedirect :'/home',
    failureRedirect :'/signup',
    failureFlash: true
}));

var port = process.env.PORT;
app.listen(port, function(){
    console.log('Server is listening on port ' + port);
});

process.stdin.resume();//so the program will not close instantly
function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('Closed Database');
        db.close();
    };
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}
process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));