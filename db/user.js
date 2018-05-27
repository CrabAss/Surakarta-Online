let mongoose = require('mongoose');
let Game = require('./game');
let bcrypt = require('bcrypt');


let UserPrivacySchema = new mongoose.Schema({
  isAnonymous: {
    type: Boolean,
    required: true,
    default: false
  },
  showStatus: {
    type: Boolean,
    required: true,
    default: true
  },
  showAge: {
    type: Boolean,
    required: true,
    default: true
  },
  showGender: {
    type: Boolean,
    required: true,
    default: true
  },
  showCountry: {
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
  gameLose: [String],
  privacy: {
    type: UserPrivacySchema,
    required: true,
    default: {}
  }
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
  if (!this.privacy.collectLocation) return;
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