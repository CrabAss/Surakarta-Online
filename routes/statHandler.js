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
let geoJson = require('geojson');
let User = require('../db/user');

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


router.get('/map', function(req, res, next) {
    ifSignedIn(req, next, function () {
        res.render('stat/map');
    }, function () {
        res.redirect('/');
    })
});

router.get('/geojsonp', function(req, res, next) {
    ifSignedIn(req, next, function () {
        if (req.header("Referer") !== global.DOMAIN_ROOT + "stat/map") {
            res.status(403).send('Forbidden');
            return;
        }
        User.find({}, function (err, users) {
            if (err) return next(err);
            let mapArray = [];
            users.forEach(function (user) {
                if (user.location)
                    mapArray.push({
                        name: user.displayName,
                        countWin: user.countWin,
                        lat: user.location[0],
                        lng: user.location[1]
                    });
            });
            res.setHeader('content-type', 'application/json-p');
            res.send('geo_callback(' + JSON.stringify(geoJson.parse(mapArray, {Point: ['lat', 'lng']})) + ')');
        });
    }, function () {
        res.status(403).send('Forbidden');
    })
});


module.exports = router;
