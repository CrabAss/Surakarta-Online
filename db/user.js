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

let mongoose = require('mongoose')
let Game = require('./game')
let bcrypt = require('bcrypt')
let countryList = require('../static_data/country')

let UserPrivacySchema = new mongoose.Schema({
  showProfile: {
    type: Boolean,
    required: true,
    default: true
  },
  collectLocation: {
    type: Boolean,
    required: true,
    default: true
  }
})

let UserSchema = new mongoose.Schema({
  isTemporary: {
    type: Boolean,
    required: true,
    default: false
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: function () {return !this.isTemporary}  // false when temporary
  },
  birthyear: {
    type: Number
  },
  gender: {
    type: Number  // 0 for female, 1 for male, 2 for other
  },
  country: {
    type: String
  },
  location: [],
  gameWin: [String],
  gameLose: [String],
  privacy: {
    type: UserPrivacySchema,
    required: true,
    default: {}
  }
})

UserSchema.virtual('displayName').get(function () {
  return this.isTemporary ? 'Guest' : this.username
})

UserSchema.virtual('displayGender').get(function () {
  if (this.gender === null) return 'Unknown'
  return this.gender === 0 ? 'Female' : (this.gender === 1 ? 'Male' : 'Other')
})

UserSchema.virtual('displayCountry').get(function () {
  if (!this.country || this.country === 'UNK') return 'Unknown'
  for (let i = 0; i < countryList.length; i++) {
    if (this.country === countryList[i].abbr) return countryList[i].name
  }
})

UserSchema.virtual('age').get(function () {
  if (this.birthyear === null) return -1
  return (new Date()).getFullYear() - this.birthyear
})

UserSchema.virtual('countWin').get(function () {
  return this.gameWin.length
})

UserSchema.virtual('countLose').get(function () {
  return this.gameLose.length
})

UserSchema.virtual('winningPercentage').get(function () {
  return this.gameWin.length + this.gameLose.length === 0 ? 0 : this.gameWin.length / (this.gameWin.length + this.gameLose.length)
})

UserSchema.virtual('gameCount').get(function () {
  return this.gameWin.length + this.gameLose.length
})

UserSchema.methods.getGameInProgress = function (callback) {
  Game.findOne({
    status: 'InProgress',
    $or: [
      { 'playerB.userID': this._id },
      { 'playerW.userID': this._id }
    ]
  }, (err, game) => callback(game ? game.gameID : ''))
}

UserSchema.statics.updateGameRecord = function (gameID, winner, loser, callback) {
  this.findById(winner, (err, user) => {
    if (!user) {
      let err = new Error('User not found.')
      err.status = 404
      console.log(err)
      return callback(err)
    }
    user.gameWin.push(gameID)
    user.save(err => {
      if (err) return callback(err)
    })
  })
  this.findById(loser, function (err, user) {
    if (!user) {
      let err = new Error('User not found.')
      err.status = 404
      console.log(err)
      return callback(err)
    }
    user.gameLose.push(gameID)
    user.save(err => {
      if (err) return callback(err)
    })
  })
}

//authenticate input against database
UserSchema.statics.authenticate = function (username, password, callback) {
  // TODO - CLAIM A TEMP ACCOUNT
  User.findOne({ username: username })
    .collation({ locale: 'en', strength: 1 })
    .exec((err, user) => {
      if (err) return callback(err)
      if (!user) {
        err = new Error('User not found.')
        err.status = 401
        return callback(err)
      }
      bcrypt.compare(password, user.password, (err, result) => result === true ? callback(null, user) : callback(err))
    })
}

let ifIntersect = (haystack, arr) => arr.some(v => haystack.indexOf(v) >= 0)

UserSchema.statics.claimTempAccount = function (fromUserID, toUserID, callback) {
  /*
  * fromUserID: temp account
  * toUserID: registered account
  *
  * data to modify:
  *   COMBINE: user.gameWin, user.gameLose
  *   MODIFY(fromUserID -> toUserID): game.playerB.userID / game.playerW.userID
  *
  * */

  let fromGames = []

  // COMBINE
  User.findByIdAndRemove(fromUserID, (err, fromUser) => {
    fromGames = fromUser.gameWin.concat(fromUser.gameLose)
    User.findById(toUserID, (err, toUser) => {
      if (ifIntersect(fromGames, toUser.gameWin.concat(toUser.gameLose))) {
        return callback(new Error('game_intersected'))
      }
      toUser.gameWin = toUser.gameWin.concat(fromUser.gameWin)
      toUser.gameLose = toUser.gameLose.concat(fromUser.gameLose)

      // MODIFY(fromUserID -> toUserID): game.playerB.userID / game.playerW.userID

      fromGames.forEach(gameID => {
        Game.findOne({ gameID: gameID }, (err, game) => {
          if (game.playerW.userID.toString() === fromUserID)
            game.playerW.userID = toUserID
          else
            game.playerB.userID = toUserID
          game.save()
        })
      })

      toUser.save()
    })
  })

}

UserSchema.methods.updateLocation = function (ll, callback) {
  if (!this.privacy.collectLocation) return
  this.location = ll
  this.save(err => {
    if (err) return callback(err)
  })
}

UserSchema.statics.newUser = function (username, password, birthyear, gender, country,
                                       showProfile, collectLocation, sessionID, callback) {
  if (username && password) {
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return callback(err)
      let userData = {
        isTemporary: false,
        username: username,
        password: hashedPassword,
        birthyear: birthyear,
        gender: gender,
        country: country === '' ? null : country,
        location: null,
        privacy: {
          showProfile: showProfile,
          collectLocation: collectLocation
        }
      }
      if (sessionID) {
        User.findOneAndUpdate({ username: sessionID }, { $set: userData }, { new: true }, (err, user) => {
          if (err) return err.code === 11000 ? callback(null, 'username_unavailable') : callback(err)
          return callback(null, null, user) // TRANSFERRED!
        })
      } else {
        User.create(userData, (err, user) => {
          if (err) return err.code === 11000 ? callback(null, 'username_unavailable') : callback(err)
          return callback(null, null, user) // CREATED!
        })
      }
    })
  } else {
    return callback(null, 'parameter_missing', false)
  }
}

UserSchema.statics.newTemporaryUser = function (sessionID, callback) {
  let userData = {
    isTemporary: true,
    username: sessionID,
    location: null,
    privacy: {
      showProfile: false,
      collectLocation: false
    }
  }
  User.create(userData, (err, user) => {
    if (err) return err.code === 11000 ? callback(null, 'username_unavailable') : callback(err)
    return callback(null, null, user)
  })
}

UserSchema.statics.updateProfile = function (userID, birthyear, gender, country, showProfile, collectLocation, callback) {
  User.findByIdAndUpdate(userID, {
    birthyear: birthyear,
    gender: gender,
    country: country === '' ? null : country,
    privacy: {
      showProfile: !!showProfile,
      collectLocation: !!collectLocation
    }
  }, (err, user) => {
    if (err) return callback(err)
    if (!user) return callback(new Error('User not found.'))
    if (user.privacy.collectLocation === false) {
      User.update({ _id: user._id }, { location: null }, err => {
        if (err) return callback(err)
      })
    }
    return callback()
  })
}

UserSchema.statics.updateCredential = function (userID, origPassword, newPassword, verifyPassword, callback) {
  User.findById(userID, (err, user) => {
    if (err) return callback(err)
    if (!user) return callback(new Error('User not found.'))
    bcrypt.compare(origPassword, user.password, (err, result) => {
      if (result === true) {
        if (newPassword !== origPassword) {
          if (newPassword === verifyPassword) {
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
              user.password = hashedPassword
              user.save(err => {
                if (err) return callback(err)
                return callback()
              })
            })
          } else return callback(new Error('Passwords don\'t match.'))
        } else return callback(new Error('New password should be a different one.'))
      } else return callback(new Error('Current password is incorrect.'))
    })
  })
}

let User = mongoose.model('User', UserSchema)
module.exports = User