'use strict;'

var express = require("express");
var expressSession = require("express-session");
require('dotenv').load();
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb').MongoClient;
var app = express();
// router

var db;
var collection;
// Connect Database
mongo.connect(process.env.MONGO_URI, function(err, cdb){
    if (err) throw err;
    db = cdb;
    collection = db.collection('info');
});
    
// Configuring passport
app.use(expressSession({secret : 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
    done(null, user._id);
});

passport.deserializeUser(function(id, done){
    collection.findOne({_id : id}, function(err, user){
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

app.get('/', function(req, res){
    collection.findOne({username: 'kienhoang'}, function(err, data){
        res.json(data);
    });
});

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