let express = require('express');
let router = express.Router();
let User = require('../db/user');
let bodyParser = require('body-parser');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

let reCaptchaData = require('../static_data/recaptcha');

/* GET home page. */
router.get('/', function(req, res, next) {
  User.findById(req.session.userID).exec(function (error, user) {
    if (error) {
      return next(error);
    } else {
      if (user !== null) {
        if (user.isTemporary) {
          user.getGameInProgress(function (gameInProgress) {
            res.render('index', {username: user.displayName, gameID: gameInProgress, isTemporary: true});
          });
        } else {
          user.getGameInProgress(function (gameInProgress) {
            res.render('index', {username: user.displayName, gameID: gameInProgress});
          });
        }
      } else {
        res.render('index', {reCaptchaKey: reCaptchaData.PublicKey});
      }
    }
  });
});

module.exports = router;
