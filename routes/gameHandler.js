let express = require('express');
let router = express.Router();
let User = require('../db/user');
let Game = require('../db/game');
let bodyParser = require('body-parser');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.get('/', function (req, res, next) {
  return res.redirect("/g/hall");
});

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
      }
      else {
        // create anonymous user and join
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
        // res.redirect('/');
      }
    }
  });
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