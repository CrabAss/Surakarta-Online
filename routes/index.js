/*

Surakarta-Online: Realtime game hosting of Surakarta using Node.js
Copyright (C) 2018-2019 CrabAss

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

let express = require('express')
let router = express.Router()
let User = require('../db/user')
let bodyParser = require('body-parser')

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))

let reCaptchaData = require('../static_data/recaptcha')

/* GET home page. */
router.get('/', (req, res, next) => {
  User.findById(req.session.userID).exec((err, user) => {
    if (err) return next(err)
    if (user !== null) user.getGameInProgress(gameInProgress => {
      if (user.isTemporary)
        res.render('index', { username: user.displayName, gameID: gameInProgress, isTemporary: true })
      else
        res.render('index', { username: user.displayName, gameID: gameInProgress })
    }) else
      res.render('index', { reCaptchaKey: reCaptchaData.PublicKey })
  })
})

module.exports = router
