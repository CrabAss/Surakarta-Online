let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let geoJson = require('geojson');
let User = require('../db/user');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

function ifSignedIn(req, next, ifYes, ifNo) {
  User.findById(req.session.userId).exec(function (error, user) {
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
    res.render('stat_map');
  }, function () {
    res.redirect('/');
  })
});

router.get('/geojsonp', function(req, res, next) {
  ifSignedIn(req, next, function () {
    User.find({}, function (err, users) {
      function pushData (userArray, mapArray) { // recursive due to async method user.getWin()
        if (!mapArray) mapArray = [];
        if (userArray.length === 0) {
          res.setHeader('content-type', 'text/javascript');
          res.send('geo_callback(' + JSON.stringify(geoJson.parse(mapArray, {Point: ['lat', 'lng']})) + ')');
        } else {
          let user = userArray.pop();
          user.getWin(function (winCount) {
            mapArray.push({
              name: user.username,
              winCount: winCount,
              lat: user.location[0],
              lng: user.location[1]
            });
            pushData(userArray, mapArray);
          })
        }
      }
      if (err) return next(err);
      pushData(users);
    });
  }, function () {
    res.send({status: 403, message: 'forbidden'});
  })
});


module.exports = router;
