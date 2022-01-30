/*

Surakarta-Online: Realtime game hosting of Surakarta using Node.js
Copyright (C) 2018-2022 CrabAss

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

const express = require('express')
const router = express.Router({})
const User = require('../db/user')
const Game = require('../db/game')
const bodyParser = require('body-parser')

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))

const reCaptchaData = require('../static_data/recaptcha')
const ReCaptchaConstructor = require('express-recaptcha').RecaptchaV3
const reCaptcha = new ReCaptchaConstructor(reCaptchaData.PublicKey, reCaptchaData.Secret)

router.get('/', (req, res, next) => res.redirect('/g/hall'))

router.get('/hall', (req, res, next) => {
  User.findById(req.session.userID).exec((error, user) => {
    if (error) return next(error)
    if (user !== null) {
      user.getGameInProgress(gameInProgress => {
        if (gameInProgress) res.redirect('/g/' + gameInProgress)
        else res.render('game/hall')
      })
    } else {
      return res.render('user/recaptcha', { reCaptchaKey: reCaptchaData.PublicKey })
    }
  })
})

router.post('/hall', reCaptcha.middleware.verify, (req, res, next) => {
  if (req.session.userID) return res.redirect('hall')
  if (req.recaptcha.error) return res.status(400).send('reCAPTCHA verification failed.')

  // create anonymous user and join
  User.newTemporaryUser(req.session.id, (unhandledErr, errMsg, user) => {
    if (user) {
      req.session.userID = user._id
      req.session.username = user.username
      req.session.isTemporary = true
      res.render('game/hall')
    } else {
      return errMsg ? res.send(errMsg) : next(unhandledErr)
    }
  })
})

/* router.get('/hall/:roomID', function (req, res, next) {
  return res.render("game/hall");
}) */

router.get('/:gameID', (req, res, next) => {
  Game.findOne({
    gameID: req.params.gameID,
    $or: [
      { 'playerB.userID': req.session.userID },
      { 'playerW.userID': req.session.userID }
    ]
  }, (err, game) => {
    if (err) next(err)
    if (!game) return res.redirect('/g/hall')
    if (game.status === 'InProgress') return res.render('game/play')
    res.send('This game is finished!') // TODO: game playback
  })
})

module.exports = router
