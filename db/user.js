let mongoose = require('mongoose');
let Game = require('./game');
let bcrypt = require('bcrypt');


let UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  birthyear: {
    type: Number,
    required: true
  },
  gender: {
    type: Number,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  location: [],
  gameWin: [String],
  gameLose: [String]
});


UserSchema.virtual('age').get(function () {
  return (new Date()).getFullYear() - this.birthyear;
});

UserSchema.virtual('countWin').get(function () {
  return this.gameWin.length;
});

UserSchema.virtual('countLose').get(function () {
  return this.gameLose.length;
});

UserSchema.virtual('rateWin').get(function () {
  return this.gameWin.length + this.gameLose.length === 0 ? 0 : this.gameWin.length / (this.gameWin.length + this.gameLose.length);
});

UserSchema.methods.getGameInProgress = function (callback) {
  Game.findOne({
    gameStatus: 'InProgress',
    $or: [
      { playerB: this._id },
      { playerW: this._id }
    ]
  }, function (err, game) {
    return callback(game ? game.gameID : "");
  });
};

/*UserSchema.methods.getWin = function (callback) {
  Game.count({
    gameStatus: { $in: ['Surrendered', 'Finished'] },
    winner: this._id
  }, function (err, winCount) {
    return callback(winCount);
  });
};

UserSchema.methods.getLose = function (callback) {
  Game.count({
    gameStatus: { $in: ['Surrendered', 'Finished'] },
    $or: [
      { playerB: this._id },
      { playerW: this._id }
    ],
    winner: { $ne: this._id }
  }, function (err, loseCount) {
    return callback(loseCount);
  });
};

UserSchema.methods.getWinRate = function(callback) {
  this.getWin(function (winCount) {
    this.getLose(function (loseCount) {
      if (winCount + loseCount === 0) return callback(0);
      else return callback(winCount / (winCount + loseCount));
    })
  })
};*/

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

UserSchema.methods.updateLocation = function (ll, callback) {
  this.location = ll;
  this.save(function (err) {
    if (err) return callback(err);
  });
};

UserSchema.statics.newUser = function (username, password, birthyear, gender, country, callback) {
  if (username && password && birthyear && gender && country) {
    bcrypt.hash(password, 10, function (err, hashedPassword) {
      if (err) {
        return callback(err);
      }
      let userData = {
        username: username,
        password: hashedPassword,
        birthyear: birthyear,
        gender: gender,
        country: country,
        location: null
      };
      User.create(userData, function (err, user) {
        if (!err)
          return callback(null, null, true);
        else {
          if (err.code === 11000)
            return callback(null, "username_unavailable", false);
          else
            return callback(err, null, false);
        }
      });
    });
  } else
    return callback(null, "parameter_missing", false);
};


let User = mongoose.model('User', UserSchema);
module.exports = User;