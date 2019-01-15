/*

Surakarta-Online: Realtime game hosting of Surakarta using Node.js
Copyright (C) 2018-2019 CrabAss

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/


let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let session = require('express-session');
let mongoose = require('mongoose');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');

let app = express();
let index = require('./routes/index');
let userHandler = require('./routes/userHandler');
let gameHandler = require('./routes/gameHandler');
let statHandler = require('./routes/statHandler');
let MongoStore = require('connect-mongo')(session);

app.set('trust proxy', 'loopback');
global.DOMAIN_ROOT = 'https://s.crabass.me/';

//connect to MongoDB
let db = mongoose.connection;
const dbURI = 'mongodb://localhost/surakarta';
mongoose.connect(dbURI, {auto_reconnect: true});

//handle mongo error
db.on('connecting', function() {
    console.log('connecting to MongoDB...');
});
db.on('error', function(error) {
    console.error('Error in MongoDb connection: ' + error);
    mongoose.disconnect();
});
db.on('connected', function() {
    console.log('MongoDB connected!');
});
db.once('open', function() {
    console.log('MongoDB connection opened!');
});
db.on('reconnected', function () {
    console.log('MongoDB reconnected!');
});
db.on('disconnected', function() {
    console.log('MongoDB disconnected!');
    setTimeout(function () {
        mongoose.connect(dbURI, {auto_reconnect: true});
    }, 3000);
});


//use sessions for tracking logins
app.sessionMiddleware = session({
    secret: 'ninja cat',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: db
    })
});
app.use(app.sessionMiddleware);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// routing
app.use('/', index);
app.use('/u', userHandler);
app.use('/g', gameHandler);
app.use('/stat', statHandler);

// catch 418 and forward to error handler
app.use('/brew', function(req, res, next) {
    let err = new Error('Sorry, but I\'m a teapot.');
    err.status = 418;
    next(err);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
