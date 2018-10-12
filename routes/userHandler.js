/*

Surakarta-Online: Realtime game hosting of Surakarta using Node.js
Copyright (C) 2018 CrabAss

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/


let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let geoip = require('geoip-lite');

let User = require('../db/user');
let Game = require('../db/game');
let countryList = require('../static_data/country');

let reCaptchaData = require('../static_data/recaptcha');
let libReCaptcha = require('express-recaptcha').Recaptcha;
let reCaptcha = new libReCaptcha(reCaptchaData.PublicKey, reCaptchaData.Secret);

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

function ifSignedIn(req, next, ifYes, ifNo) {
    User.findById(req.session.userID).exec(function (error, user) {
        if (error) {
            return next(error);
        } else {
            if (user !== null) { ifYes(); }
            else { ifNo(); }
        }
    });
}

/* GET sign in page. */
router.get('/signin', function(req, res, next) {
    ifSignedIn(req, next, function () {
        if (req.session.isTemporary) {
            res.render('user/signin', {reCaptchaKey: reCaptchaData.PublicKey}); // TODO - different UX
        } else return res.redirect('/');
    }, function () {
        res.render('user/signin', {reCaptchaKey: reCaptchaData.PublicKey});
    });
});

router.post('/signin', reCaptcha.middleware.verify, function(req, res, next) {
    if (req.session.userID && !req.session.isTemporary) return res.redirect('/');
    if (req.recaptcha.error) return res.render('user/signin', {
        reCaptchaKey: reCaptchaData.PublicKey,
        error: true,
        errorMsg: 'reCAPTCHA verification failed. Please wait until the module of reCAPTCHA is loaded. '
    });


    if (req.body.username && req.body.password) {
        User.authenticate(req.body.username, req.body.password, function (error, user) {
            if (error && error.status === 401) {
                return res.render('user/signin', {
                    reCaptchaKey: reCaptchaData.PublicKey,
                    error: true,
                    errorMsg: 'This user does not exist. Please try again. '
                });
            } else if (!user || error) {
                console.log(user);
                return res.render('user/signin', {
                    reCaptchaKey: reCaptchaData.PublicKey,
                    error: true,
                    errorMsg: 'Username or password is incorrect. Please try again. '
                });
            } else {
                if (req.session.isTemporary) {
                    // TODO - CLAIM A TEMP ACCOUNT
                    User.claimTempAccount(req.session.userID, user._id.toString(), function (err) {
                        // if (err && err.message === 'game_intersected');
                    });
                }
                req.session.userID = user._id;
                req.session.username = user.username;
                delete req.session.isTemporary;
                user.updateLocation(geoip.lookup(req.headers['cf-connecting-ip'] || req.ip || req.connection.remoteAddress).ll, function (err) {
                    return console.error(err);
                });
                return res.redirect('/');
            }
        });
    } else {
        return res.render('user/signin', {
            reCaptchaKey: reCaptchaData.PublicKey,
            error: true,
            errorMsg: 'All fields are required. Please try again. '
        });
    }
});


router.get('/signup', function(req, res, next) {
    ifSignedIn(req, next, function () {
        if (req.session.isTemporary) {
            let ipCountry = req.headers['cf-ipcountry'] || geoip.lookup(req.ip || req.connection.remoteAddress).country;
            res.render('user/signup', {
                countryList: countryList,
                countryDefault: ipCountry,
                reCaptchaKey: reCaptchaData.PublicKey});  // TODO - different UX
        } else return res.redirect('/');
    }, function () {
        let ipCountry = req.headers['cf-ipcountry'] || geoip.lookup(req.ip || req.connection.remoteAddress).country;
        res.render('user/signup', {
            countryList: countryList,
            countryDefault: ipCountry,
            reCaptchaKey: reCaptchaData.PublicKey});
    });
});

router.post('/signup', reCaptcha.middleware.verify, function(req, res, next) {
    if (req.session.userID && !req.session.isTemporary) return res.redirect('/');
    if (req.recaptcha.error) return res.send("recaptcha_error");

    // console.log(req.body);
    User.newUser(req.body.username,
        req.body.password,
        req.body.birthyear,
        req.body.gender,
        req.body.country,
        !!req.body.showProfile,
        !!req.body.collectLocation,
        req.session.isTemporary ? req.session.username : null,
        function (unhandledErr, errMsg, user) {
            if (user) {
                // console.log(user);
                req.session.userID = user._id;
                req.session.username = user.username;
                delete req.session.isTemporary;
                user.updateLocation(geoip.lookup(req.headers['cf-connecting-ip'] || req.ip || req.connection.remoteAddress).ll, function (err) {
                    return console.error(err);
                });
                return res.send("success");
            }
            else {
                if (errMsg) return res.send(errMsg);
                else {
                    console.log(unhandledErr);
                    return next(unhandledErr);
                }
            }
        });
});

router.post('/signup/validate/username', function(req, res, next) {
    if (req.body.username && req.header("Referer") === global.DOMAIN_ROOT + "u/signup") {
        User.findOne({ username: req.body.username })
            .collation({ locale: 'en', strength: 1 })
            .exec(function (err, user) {
                if (err) {
                    return next(err);
                } else {
                    if (!user)
                        return res.sendStatus(200);
                    else
                        return res.sendStatus(400);
                }
            });
    } else {
        res.sendStatus(403);
    }
});


router.get('/@:username', function (req, res, next) {
    // USER PROFILE PAGE
    if (!req.session.userID || req.session.isTemporary) return res.redirect('/');
    User.findOne({ username: req.params.username })
        .collation({ locale: 'en', strength: 1 })
        .exec(function (err, user) {
            if (err)
                return next(err);
            if (!user || user.isTemporary || (!user.privacy.showProfile && user._id.toString() !== req.session.userID))
                return res.send('User not found!');
            if (user.username !== req.params.username)
                return res.redirect("/u/@" + user.username);

            Game.aggregate([{
                $match: {'gameID': { $in: user.gameWin.concat(user.gameLose)}}
            }, {
                $lookup: {
                    from: "users",
                    localField: "playerB.userID",
                    foreignField: "_id",
                    as: "playerBInfo"
                }
            }, {
                $lookup: {
                    from: "users",
                    localField: "playerW.userID",
                    foreignField: "_id",
                    as: "playerWInfo"
                }
            }, {
                $sort: {
                    startTime: -1
                }
            }, {
                $project: {
                    _id: false,
                    gameID: true,
                    startTime: true,
                    totalMoves: true,
                    ownColor: {$cond:{
                            if: {$eq: ["$playerB.userID", user._id]},
                            then: 'B',
                            else: 'W'
                        }},
                    isWin: {$in: ["$gameID", user.gameWin]},
                    opponent: {$cond:{
                            if: {$eq: ["$playerB.userID", user._id]},
                            then: {$arrayElemAt: ["$playerWInfo", 0]},
                            else: {$arrayElemAt: ["$playerBInfo", 0]}
                        }}
                }
            }], function(err, games){
                for (let i = 0; i < games.length; i++) {
                    games[i].opponent = games[i].opponent.isTemporary ? null : games[i].opponent.username;
                }
                res.render("user/profile", {user: user, games: games});
            });
        });
});

router.get('/settings', function (req, res, next) {
    User.findById(req.session.userID).exec(function (error, user) {
        if (error) {
            return next(error);
        } else {
            if (user !== null && !user.isTemporary) {
                return res.render('user/settings', {user: user, countryList: countryList});
            } else {
                return res.redirect('/u/signin');
            }
        }
    });
});

router.post('/settings', function (req, res, next) {
    // change user properties (e.g. password)
    if (req.body.type === "profile") {
        User.updateProfile(
            req.session.userID,
            req.body.birthyear,
            req.body.gender,
            req.body.country,
            req.body.showProfile,
            req.body.collectLocation,
            function (err) {
                if (err) {
                    if (err.message === "User not found.")
                        return res.status(400).send(err.message);
                    else
                        return next(err);
                }
                return res.sendStatus(200);
            }
        );
    } else if (req.body.type === "credential" && !!req.body.newPassword) {
        User.updateCredential(
            req.session.userID,
            req.body.origPassword,
            req.body.newPassword,
            req.body.verifyPassword,
            function (err) {
                if (err) {
                    const EXPECTED_ERR = ["Current password is incorrect.", "User not found.", "Passwords don't match.", "New password should be a different one."];
                    if (EXPECTED_ERR.includes(err.message))
                        return res.status(400).send(err.message);
                    else
                        return next(err);
                }
                return res.sendStatus(200);
            }
        )
    } else return res.status(400).send("Parameter missing.")
});

// GET for signout
router.get('/signout', function (req, res, next) {
    if (req.session) {
        // delete session object
        req.session.destroy(function (err) {
            if (err) return next(err);
            return res.redirect('/');
        });
    }
});

module.exports = router;
