let express = require('express');
let router = express.Router();
let User = require('../db/user');
let Game = require('../db/game');
let bodyParser = require('body-parser');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

let reCaptchaData = require('../static_data/recaptcha');
let libReCaptcha = require('express-recaptcha').Recaptcha;
let reCaptcha = new libReCaptcha(reCaptchaData.PublicKey, reCaptchaData.Secret);

router.get('/', function (req, res, next) {
  return res.redirect("/g/hall");
});

/*router.get('/recaptcha', function (req, res, next) {
  return res.render("recaptcha", {reCaptchaKey: reCaptchaData.PublicKey});
});

router.post('/recaptcha', function (req, res, next) {
  return res.send(req.body);
});*/


router.get('/hall', function (req, res, next) {
  User.findById(req.session.userID).exec(function (error, user) {
    if (error) {
      return next(error);
    } else {
      if (user !== null) {
        user.getGameInProgress(function (gameInProgress) {
          if (gameInProgress)
            res.redirect('/g/' + gameInProgress);
          else
            res.render('game_hall');
        })
      } else {
        return res.render("recaptcha", {reCaptchaKey: reCaptchaData.PublicKey});
      }
    }
  });
});

router.post('/hall', reCaptcha.middleware.verify, function (req, res, next) {
  if (req.session.userID) {
    return res.redirect("hall")
  } else {
    // create anonymous user and join
    if (req.recaptcha.error) return res.status(400).send("reCAPTCHA verification failed.");
    User.newTemporaryUser(req.session.id, function (unhandledErr, errMsg, user) {
      if (user) {
        req.session.userID = user._id;
        req.session.username = user.username;
        req.session.isTemporary = true;
        res.render('game_hall');
      }
      else {
        if (errMsg) return res.send(errMsg);
        else {
          // console.log(unhandledErr);
          return next(unhandledErr);
        }
      }
    });
  }
});


/*router.get('/hall/:roomID', function (req, res, next) {
  return res.render("game_hall");
});*/

router.get('/:gameID', function (req, res, next) {
  Game.findOne({
    gameID: req.params.gameID,
    $or: [
      { "playerB.userID": req.session.userID },
      { "playerW.userID": req.session.userID }
    ]}, function (err, game) {
    if (!game) {
      res.redirect('/g/hall');
      return;
    }
    if (game.status === "InProgress") res.render("game_play");
    else res.send("This game is finished!");  // TO BE IMPLEMENTED: game playback
  });
});

module.exports = router;