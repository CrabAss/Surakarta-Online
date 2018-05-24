let express = require('express');
let router = express.Router();
let User = require('../db/user');
let bodyParser = require('body-parser');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

/* GET home page. */
router.get('/', function(req, res, next) {
  User.findById(req.session.userId).exec(function (error, user) {
    if (error) {
      return next(error);
    } else {
      if (user !== null) {
        user.getGameInProgress(function (gameInProgress) {
          res.render('index', {username: user.username, gameID: gameInProgress});
        });
      }
      else {
        res.render('index');
      }
    }
  });
});

module.exports = router;
