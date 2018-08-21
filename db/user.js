let mongoose = require('mongoose');
let Game = require('./game');
let bcrypt = require('bcrypt');
let countryList = require('../static_data/country');


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
});


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
});

UserSchema.virtual('displayName').get(function () {
  return this.isTemporary ? "Guest" : this.username;
});

UserSchema.virtual('displayGender').get(function () {
  if (this.gender) return this.gender === 0 ? "Female" : (this.gender === 1 ? "Male" : "Other");
  return "Unknown";
});

UserSchema.virtual('displayCountry').get(function () {
  if (!this.country || this.country === "UNK") return "Unknown";
  for (let i = 0; i < countryList.length; i++) {
    if (this.country === countryList[i].abbr) return countryList[i].name;
  }
});

UserSchema.virtual('age').get(function () {
  if (this.birthyear) return (new Date()).getFullYear() - this.birthyear;
  return -1;
});

UserSchema.virtual('countWin').get(function () {
  return this.gameWin.length;
});

UserSchema.virtual('countLose').get(function () {
  return this.gameLose.length;
});

UserSchema.virtual('winningPercentage').get(function () {
  return this.gameWin.length + this.gameLose.length === 0 ? 0 : this.gameWin.length / (this.gameWin.length + this.gameLose.length);
});

UserSchema.virtual('gameCount').get(function () {
  return this.gameWin.length + this.gameLose.length;
});


UserSchema.methods.getGameInProgress = function (callback) {
  Game.findOne({
    status: 'InProgress',
    $or: [
      { "playerB.userID": this._id },
      { "playerW.userID": this._id }
    ]
  }, function (err, game) {
    return callback(game ? game.gameID : "");
  });
};

UserSchema.statics.updateGameRecord = function (gameID, winner, loser, callback) {
  this.findById(winner, function (err, user) {
    if (!user) {
      let err = new Error("User not found.");
      err.status = 404;
      console.log(err);
      return callback(err);
    }
    user.gameWin.push(gameID);
    user.save(function (err) {
      if (err) return callback(err);
    });
  });
  this.findById(loser, function (err, user) {
    if (!user) {
      let err = new Error("User not found.");
      err.status = 404;
      console.log(err);
      return callback(err);
    }
    user.gameLose.push(gameID);
    user.save(function (err) {
      if (err) return callback(err);
    });
  });
};

//authenticate input against database
UserSchema.statics.authenticate = function (username, password, callback) {
  // TODO - CLAIM A TEMP ACCOUNT
  User.findOne({ username: username })
      .collation({ locale: 'en', strength: 1 })
      .exec(function (err, user) {
        if (err) {
          console.log(err);
          return callback(err)
        } else if (!user) {
          err = new Error('User not found.');
          err.status = 401;
          return callback(err);
        }
        bcrypt.compare(password, user.password, function (err, result) {
          if (result === true) {
            return callback(null, user);
          } else {
            return callback(err);
          }
        })
      });
};

let ifIntersect = function (haystack, arr) {
  return arr.some(function (v) {
    return haystack.indexOf(v) >= 0;
  });
};

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

  let fromGames = [];

  // COMBINE
  User.findByIdAndDelete(fromUserID, function (err, fromUser) {
    fromGames = fromUser.gameWin.concat(fromUser.gameLose);
    User.findById(toUserID, function (err, toUser) {
      if (ifIntersect(fromGames, toUser.gameWin.concat(toUser.gameLose))) {
        return callback(new Error('game_intersected'))
      }
      toUser.gameWin = toUser.gameWin.concat(fromUser.gameWin);
      toUser.gameLose = toUser.gameLose.concat(fromUser.gameLose);

      // MODIFY(fromUserID -> toUserID): game.playerB.userID / game.playerW.userID

      fromGames.forEach(function (gameID) {
        Game.findOne({gameID: gameID}, function (err, game) {
          if (game.playerW.userID.toString() === fromUserID) {
            game.playerW.userID = toUserID;
          } else {
            game.playerB.userID = toUserID;
          }
          game.save();
        })
      });

      toUser.save();
    });
  });


};

UserSchema.methods.updateLocation = function (ll, callback) {
  if (!this.privacy.collectLocation) return;
  this.location = ll;
  this.save(function (err) {
    if (err) return callback(err);
  });
};

UserSchema.statics.newUser = function (username, password, birthyear, gender, country,
                                       showProfile, collectLocation, sessionID, callback) {
  if (username && password && country) {
    bcrypt.hash(password, 10, function (err, hashedPassword) {
      if (err) {
        return callback(err);
      }
      let userData = {
        isTemporary: false,
        username: username,
        password: hashedPassword,
        birthyear: birthyear,
        gender: gender,
        country: country,
        location: null,
        privacy: {
          showProfile: showProfile,
          collectLocation: collectLocation
        }
      };
      if (sessionID) {
        User.findOneAndUpdate({username: sessionID}, {$set: userData}, {new: true}, function (err, user) {
          if (!err) {
            console.log("TRANSFERRED!");
            return callback(null, null, user);
          } else {
            if (err.code === 11000)
              return callback(null, "username_unavailable");
            else
              return callback(err);
          }
        });
      } else {
        User.create(userData, function (err, user) {
          if (!err) {
            console.log("CREATED!");
            return callback(null, null, user);
          }
          else {
            if (err.code === 11000)
              return callback(null, "username_unavailable");
            else
              return callback(err);
          }
        });
      }
    });
  } else return callback(null, "parameter_missing", false);
};

UserSchema.statics.newTemporaryUser = function (sessionID, callback) {
  let userData = {
    isTemporary: true,
    username: sessionID,
    location: null,
    privacy: {
      showProfile: false,
      collectLocation: false
    }
  };
  User.create(userData, function (err, user) {
    if (!err)
      return callback(null, null, user);
    else {
      if (err.code === 11000)
        return callback(null, "username_unavailable");
      else
        return callback(err);
    }
  });
};

let User = mongoose.model('User', UserSchema);
module.exports = User;