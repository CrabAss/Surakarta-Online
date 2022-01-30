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
const router = express.Router()
const bodyParser = require('body-parser')
const geoip = require('geoip-lite')

const User = require('../db/user')
const Game = require('../db/game')
const countryList = require('../static_data/country')

const reCaptchaData = require('../static_data/recaptcha')
const ReCaptchaConstructor = require('express-recaptcha').RecaptchaV3
const reCaptcha = new ReCaptchaConstructor(reCaptchaData.PublicKey, reCaptchaData.Secret)

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))

const ifSignedIn = (req, next, ifYes, ifNo) => {
  User.findById(req.session.userID).exec((err, user) => {
    if (err) return next(err)
    if (user !== null) ifYes()
    else ifNo()
  })
}

/* GET sign in page. */
router.get('/signin', (req, res, next) => {
  if (req.session.userID && !req.session.isTemporary) return res.redirect('/')
  return res.render('user/signin', { reCaptchaKey: reCaptchaData.PublicKey })
})

router.post('/signin', reCaptcha.middleware.verify, (req, res, next) => {
  if (req.session.userID && !req.session.isTemporary) return res.redirect('/')
  if (req.recaptcha.error) {
    return res.render('user/signin', {
      reCaptchaKey: reCaptchaData.PublicKey,
      error: true,
      errorMsg: 'reCAPTCHA verification failed. Please wait until the module of reCAPTCHA is loaded. '
    })
  }

  if (req.body.username && req.body.password) {
    User.authenticate(req.body.username, req.body.password, (error, user) => {
      if (error && error.status === 401) {
        return res.render('user/signin', {
          reCaptchaKey: reCaptchaData.PublicKey,
          error: true,
          errorMsg: 'This user does not exist. Please try again. '
        })
      }
      if (!user || error) {
        return res.render('user/signin', {
          reCaptchaKey: reCaptchaData.PublicKey,
          error: true,
          errorMsg: 'Username or password is incorrect. Please try again. '
        })
      }

      if (req.session.isTemporary) {
        User.claimTempAccount(req.session.userID, user._id.toString(), err => {
          // if (err && err.message === 'game_intersected');
          if (err) next(err)
        })
      }
      req.session.userID = user._id
      req.session.username = user.username
      delete req.session.isTemporary
      user.updateLocation(geoip.lookup(req.headers['cf-connecting-ip'] || req.ip || req.connection.remoteAddress).ll, err => console.error(err))
      return res.redirect('/')
    })
  } else {
    return res.render('user/signin', {
      reCaptchaKey: reCaptchaData.PublicKey,
      error: true,
      errorMsg: 'All fields are required. Please try again. '
    })
  }
})

router.get('/signup', (req, res, next) => {
  ifSignedIn(req, next, () => {
    if (req.session.isTemporary) {
      const ipCountry = req.headers['cf-ipcountry'] || geoip.lookup(req.ip || req.connection.remoteAddress).country
      return res.render('user/signup', {
        countryList: countryList,
        countryDefault: ipCountry,
        reCaptchaKey: reCaptchaData.PublicKey
      }) // TODO - different UX
    } else {
      return res.redirect('/')
    }
  }, () => {
    const ipCountry = req.headers['cf-ipcountry'] || geoip.lookup(req.ip || req.connection.remoteAddress).country
    return res.render('user/signup', {
      countryList: countryList,
      countryDefault: ipCountry,
      reCaptchaKey: reCaptchaData.PublicKey
    })
  })
})

router.post('/signup', reCaptcha.middleware.verify, (req, res, next) => {
  if (req.session.userID && !req.session.isTemporary) return res.redirect('/')
  if (req.recaptcha.error) return res.send('recaptcha_error')

  User.newUser(req.body.username,
    req.body.password,
    req.body.birthyear,
    req.body.gender,
    req.body.country,
    !!req.body.showProfile,
    !!req.body.collectLocation,
    req.session.isTemporary ? req.session.username : null,
    (unhandledErr, errMsg, user) => {
      if (user) {
        req.session.userID = user._id
        req.session.username = user.username
        delete req.session.isTemporary
        user.updateLocation(geoip.lookup(req.headers['cf-connecting-ip'] || req.ip || req.connection.remoteAddress).ll, err => console.error(err))
        return res.send('success')
      }
      return errMsg ? res.send(errMsg) : next(unhandledErr)
    })
})

router.post('/signup/validate/username', (req, res, next) => {
  if (req.body.username && req.header('Referer') === global.DOMAIN_ROOT + 'u/signup') {
    User.findOne({ username: req.body.username })
      .collation({ locale: 'en', strength: 1 })
      .exec((err, user) => {
        if (err) return next(err)
        return res.sendStatus(!user ? 200 : 400)
      })
  } else {
    res.sendStatus(403)
  }
})

router.get('/@:username', (req, res, next) => {
  // USER PROFILE PAGE
  if (!req.session.userID || req.session.isTemporary) return res.redirect('/')
  User.findOne({ username: req.params.username })
    .collation({ locale: 'en', strength: 1 })
    .exec(function (err, user) {
      if (err) return next(err)
      if (!user || user.isTemporary || (!user.privacy.showProfile && user._id.toString() !== req.session.userID)) {
        return res.send('User not found!')
      }
      if (user.username !== req.params.username) {
        return res.redirect('/u/@' + user.username)
      }

      Game.aggregate([{
        $match: { 'gameID': { $in: user.gameWin.concat(user.gameLose) } }
      }, {
        $lookup: {
          from: 'users',
          localField: 'playerB.userID',
          foreignField: '_id',
          as: 'playerBInfo'
        }
      }, {
        $lookup: {
          from: 'users',
          localField: 'playerW.userID',
          foreignField: '_id',
          as: 'playerWInfo'
        }
      }, {
        $sort: {
          startTime: -1
        }
      }, {
        $project: {
          _id: false,
          gameID: true,
          startTime: true,
          totalMoves: true,
          ownColor: {
            $cond: {
              if: { $eq: ['$playerB.userID', user._id] },
              then: 'B',
              else: 'W'
            }
          },
          isWin: { $in: ['$gameID', user.gameWin] },
          opponent: {
            $cond: {
              if: { $eq: ['$playerB.userID', user._id] },
              then: { $arrayElemAt: ['$playerWInfo', 0] },
              else: { $arrayElemAt: ['$playerBInfo', 0] }
            }
          }
        }
      }], (err, games) => {
        if (err) next(err)
        for (let i = 0; i < games.length; i++) {
          games[i].opponent = games[i].opponent.isTemporary ? null : games[i].opponent.username
        }
        return res.render('user/profile', { user: user, games: games })
      })
    })
})

router.get('/settings', (req, res, next) => {
  User.findById(req.session.userID).exec((err, user) => {
    if (err) return next(err)
    if (user !== null && !user.isTemporary) {
      return res.render('user/settings', { user: user, countryList: countryList })
    }
    return res.redirect('/u/signin')
  })
})

router.post('/settings', (req, res, next) => {
  // change user properties (e.g. password)
  if (req.body.type === 'profile') {
    User.updateProfile(
      req.session.userID,
      req.body.birthyear,
      req.body.gender,
      req.body.country,
      req.body.showProfile,
      req.body.collectLocation,
      err => {
        if (err) {
          if (err.message === 'User not found.') {
            return res.status(400).send(err.message)
          } else {
            return next(err)
          }
        }
        return res.sendStatus(200)
      }
    )
  } else if (req.body.type === 'credential' && !!req.body.newPassword) {
    User.updateCredential(
      req.session.userID,
      req.body.origPassword,
      req.body.newPassword,
      req.body.verifyPassword,
      err => {
        if (err) {
          const EXPECTED_ERR = ['Current password is incorrect.', 'User not found.', 'Passwords don\'t match.', 'New password should be a different one.']
          if (EXPECTED_ERR.includes(err.message)) {
            return res.status(400).send(err.message)
          } else {
            return next(err)
          }
        }
        return res.sendStatus(200)
      }
    )
  } else {
    return res.status(400).send('Parameter missing.')
  }
})

// GET for signout
router.get('/signout', (req, res, next) => {
  if (req.session) {
    // delete session object
    req.session.destroy(err => {
      if (err) return next(err)
      return res.redirect('/')
    })
  }
})

module.exports = router
