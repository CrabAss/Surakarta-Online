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
