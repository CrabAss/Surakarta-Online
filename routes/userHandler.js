let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let geoip = require('geoip-lite');

let User = require('../db/user');
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
      res.render('user_signin', {reCaptchaKey: reCaptchaData.PublicKey}); // TODO - different UX
    } else return res.redirect('/');
  }, function () {
    res.render('user_signin', {reCaptchaKey: reCaptchaData.PublicKey});
  });
});

router.post('/signin', reCaptcha.middleware.verify, function(req, res, next) {
  if (req.session.userID && !req.session.isTemporary) return res.redirect('/');
  if (req.recaptcha.error) return res.render('user_signin', {
    reCaptchaKey: reCaptchaData.PublicKey,
    error: true,
    errorMsg: 'reCAPTCHA verification failed. Please wait until the module of reCAPTCHA is loaded. '
  });


  if (req.body.username && req.body.password) {
    User.authenticate(req.body.username, req.body.password, function (error, user) {
      if (error && error.status === 401) {
        return res.render('user_signin', {
          reCaptchaKey: reCaptchaData.PublicKey,
          error: true,
          errorMsg: 'This user does not exist. Please try again. '
        });
      } else if (!user || error) {
        console.log(user);
        return res.render('user_signin', {
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
    return res.render('user_signin', {
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
      res.render('user_signup', {
        countryList: countryList,
        countryDefault: ipCountry,
        reCaptchaKey: reCaptchaData.PublicKey});  // TODO - different UX
    } else return res.redirect('/');
  }, function () {
    let ipCountry = req.headers['cf-ipcountry'] || geoip.lookup(req.ip || req.connection.remoteAddress).country;
    res.render('user_signup', {
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
    !!req.body.profileVisible,
    !!req.body.shareLocation,
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
          return res.send('available');
        else
          return res.send('no');
      }
    });
  } else {
    res.status(400).send('Bad Request');
  }
});


// Profile page: TO BE IMPLEMENTED
router.get('/@:username', function (req, res, next) {
  User.findOne({ username: req.params.username })
    .collation({ locale: 'en', strength: 1 })
    .exec(function (err, user) {
      if (err) return next(err);
      if (!user || user.isTemporary) return res.send('User not found!');

      res.send(user._id);
    });
});

router.get('/settings', function (req, res, next) {
  User.findById(req.session.userID).exec(function (error, user) {
    if (error) {
      return next(error);
    } else {
      if (user !== null) {
        return res.render('user_settings', {username: user.displayName});
      } else {
        return res.redirect('/u/signin');
      }
    }
  });
});

router.post('/settings', function (req, res, next) {
  // change user properties (e.g. password)
  // !!!!!!!!!!!! TO BE IMPLEMENTED
  return res.send("");
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
