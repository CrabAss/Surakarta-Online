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

const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const geoJson = require('geojson')
const User = require('../db/user')

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))

const ifSignedIn = (req, next, ifYes, ifNo) => {
  User.findById(req.session.userID).exec((err, user) => {
    if (err) return next(err)
    if (user !== null) {
      ifYes()
    } else {
      ifNo()
    }
  })
}

router.get('/map', (req, res, next) => {
  ifSignedIn(req, next, () => res.render('stat/map'), () => res.redirect('/'))
})

router.get('/geojsonp', (req, res, next) => {
  ifSignedIn(req, next, () => {
    if (req.header('Referer') !== global.DOMAIN_ROOT + 'stat/map') return res.status(403).send('Forbidden')
    User.find({}, (err, users) => {
      if (err) return next(err)
      const mapArray = []
      users.forEach(user => {
        if (user.location) {
          mapArray.push({
            name: user.displayName,
            countWin: user.countWin,
            lat: user.location[0],
            lng: user.location[1]
          })
        }
      })
      res.setHeader('content-type', 'application/json-p')
      res.send('geo_callback(' + JSON.stringify(geoJson.parse(mapArray, { Point: ['lat', 'lng'] })) + ')')
    })
  }, () => res.status(403).send('Forbidden'))
})

module.exports = router
