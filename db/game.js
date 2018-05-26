let mongoose = require('mongoose');
let shortId = require('shortid');
const initBoard = 'BBBBBBBBBBBB............WWWWWWWWWWWW';

let GameStepSchema = new mongoose.Schema({
  seq: {
    type: Number,
    required: true
  },
  checkerOldPos: {
    type: Array,
    required: true
  },
  checkerNewPos: {
    type: Array,
    required: true
  },
  timeUsed: {
    type: Number,
    required: true
  }
});

let GameSchema = new mongoose.Schema({
  gameID: {
    type: String,
    unique: true,
    required: true
  },
  gameStatus: {
    type: String,
    required: true,
    enum: ['InProgress', 'Finished', 'Surrendered'],
    default: 'InProgress'
  },
  startTime: {
    type: Date,
    required: true,
    default: new Date()
  },
  playerB: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  playerW: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  playerFirst: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId
  },
  curBoard: { /* black --- white */
    type: String,
    required: true,
    maxlength: 37,
    default: initBoard
  },
  totalSteps: {
    type: Number,
    required: true,
    default: 0
  },
  steps: [GameStepSchema]
});

GameSchema.virtual('loser').get(function () {
  return this.winner ? (this.winner === this.playerB ? this.playerW : this.playerB) : undefined;
});


/* Sample of curBoard:
*
*** Before: (white player on default)
*
* BB.BB.
* BW..BB -- Black checker on top
* W..B..
* ..B..W
* WWWB.. -- White checker on bottom
* ..WWWW
*
*** After:
*
* 0               ~~~                35
* BB.BB.BW..BBW..B....B..WWWWB....WWWW
*
*** If black player: translate
*     curBoard: reverse the whole string
*     position: 35 - x
*
*** All translation work is done on server (or THIS FILE)
*   client just simply get and send data in their own perspective
*
* */

const attackRoute =[
  [6, 7, 8, 9, 10, 11, -1,
    4, 10, 16, 22, 28, 34, -1,
    29, 28, 27, 26, 25, 24, -1,
    31, 25, 19, 13, 7, 1, -1],
  [12, 13, 14, 15, 16, 17, -1,
    3, 9, 15, 21, 27, 33, -1,
    23, 22, 21, 20, 19, 18, -1,
    32, 26, 20, 14, 8, 2, -1]
];

function reverse(s){
  // reverse a string
  return s.split("").reverse().join("");
}

function getAllIndexes(arr, val) {
  // get all indexes of a certain value in a given array
  let indexes = [], i = -1;
  while ((i = arr.indexOf(val, i + 1)) !== -1){
    indexes.push(i);
  }
  return indexes;
}

GameSchema.methods.moveOnBoard = function (oldPos, newPos, timeUsed, callback) {
  // move the checker on the board
  let boardArray = this.curBoard.split("");
  boardArray[newPos] = this.getCurrentPlayer();
  boardArray[oldPos] = '.';
  this.curBoard = boardArray.join("");

  this.totalSteps++;
  this.steps.push({
    seq: this.totalSteps,
    checkerOldPos: oldPos,
    checkerNewPos: newPos,
    timeUsed: Number(timeUsed)
  });

  // and check if there is a winner

  let gameWinner;

  if (!boardArray.includes('B')) {
    // playerW wins
    this.gameStatus = 'Finished';
    this.winner = this.playerW;
    gameWinner = 'W';
  } else if (!boardArray.includes('W')) {
    // playerB wins
    this.gameStatus = 'Finished';
    this.winner = this.playerB;
    gameWinner = 'B';
  }
  this.save(function (err) {
    return callback(err)
  });
  return callback(null, gameWinner);
};

GameSchema.methods.getCurrentPlayer = function () {
  return this.totalSteps % 2 === 0 ? (this.playerFirst === this.playerB ? 'B' : 'W') : (this.playerFirst === this.playerB ? 'W' : 'B');
};

GameSchema.methods.getCurrentPlayerID = function () {
  return this.getCurrentPlayer() === 'B' ? this.playerB : this.playerW;
};

GameSchema.methods.getMovePos = function (curPos) {
  const x = curPos % 6, y = ~~(curPos / 6);
  let result = [];
  for (let i = x - 1; i < x + 2; i++) {
    for (let j = y - 1; j < y + 2; j++) {
      if (!(i < 0 || i > 5 || j < 0 || j > 5 || (i === x && j === y) || this.curBoard.charAt(i + j * 6) !== '.')) {
        result.push(i + j * 6);
      }
    }
  }
  return result;
};

GameSchema.methods.getAttackPos = function (curPos) {
  const opponent = this.getCurrentPlayer() === 'B' ? 'W' : 'B';
  const curBoard = this.curBoard;
  // console.log('opponent:', opponent);
  let result = [];
  for (let routeIndex = 0; routeIndex < 2; routeIndex++) {  // two routes
    if (attackRoute[routeIndex].includes(curPos)) {  // if checker is on the attackRoute
      const routeStarts = getAllIndexes(attackRoute[routeIndex], curPos);
      routeStarts.forEach(function (routeStart) {
        // console.log('routeStart:', routeStart);
        for (let direction = -1; direction < 2; direction += 2) { // two direction
          let turned = false;
          for (let i = 1; i < attackRoute[routeIndex].length; i++) {  // all positions on the attackRoute except routeStart
            const routePosIndex = (routeStart + direction * i + attackRoute[routeIndex].length) % attackRoute[routeIndex].length;
            if (attackRoute[routeIndex][routePosIndex] !== -1) {
              // if the position have checker and it belongs to opponent and turned: push to result
              const foundChecker = curBoard.charAt(attackRoute[routeIndex][routePosIndex]);
              if (foundChecker !== '.' && attackRoute[routeIndex][routePosIndex] !== curPos) {
                if (foundChecker === opponent && turned)
                  result.push(attackRoute[routeIndex][routePosIndex]);
                break;
              }
            } else turned = true;
          }
        }
      });
    }
  }
  return result.filter(function (item, pos) { // remove duplicate elements
    return result.indexOf(item) === pos;
  });
};

GameSchema.methods.moveStep = function (oldPos, newPos, timeUsed, callback) {
  if (this.gameStatus !== "InProgress")
    return errRejected();

  let gameWinner;
  if (this.getCurrentPlayer() === 'B') {
    oldPos = 35 - oldPos;
    newPos = 35 - newPos;
  }
  if (this.curBoard.charAt(oldPos) !== this.getCurrentPlayer()) // waiting player hacks
    return errRejected();

  let movePos = this.getMovePos(oldPos);
  let attackPos = this.getAttackPos(oldPos);
  if (movePos.includes(newPos) || attackPos.includes(newPos)) {
    this.moveOnBoard(oldPos, newPos, timeUsed, function (err, winner) {
      if (err) return callback(err);
      if (winner) {
        gameWinner = winner;
      }
    });
    return callback(null, this.getCurrentPlayer() === 'B' ? reverse(this.curBoard) : this.curBoard, gameWinner);
  } else return errRejected();

  function errRejected() {
    let err = new Error('Move is rejected. ');
    err.status = 406;
    return callback(err);
  }

};

GameSchema.statics.newGame = function (users, callback) {
  const gameID = shortId.generate();
  let playerB, playerW, playerFirst;
  if (Math.random() * 2 >= 1) {
    playerB = users[0]; playerW = users[1];
  } else {
    playerB = users[1]; playerW = users[0];
  }
  playerFirst = Math.random() * 2 >= 1 ? playerB : playerW;
  const gameInfo = {
    gameID: shortId.generate(),
    playerB: playerB,
    playerW: playerW,
    playerFirst: playerFirst
  };
  // console.log(gameInfo);
  this.create(gameInfo, function (err, game) {
    if (err) return callback(err);
    else {
      return callback(null, game);
    }
  });
};

GameSchema.methods.surrenderGame = function (sender, callback) {
  this.gameStatus = 'Surrendered';
  this.winner = sender === this.playerB.toString() ? this.playerW : this.playerB;
  this.save(function (err, updatedGame) {
    if (err) return callback(err);
    else {
      return callback(null, updatedGame.winner === updatedGame.playerB ? 'B' : 'W')
    }
  });
};

GameSchema.statics.getInitData = function (gameID, userID, callback) {
  Game.findOne({
    gameID: gameID,
    $or: [
      { playerB: userID },
      { playerW: userID }
    ]}, function (err, game) {
      if (err) return callback(err);
      if (!game) {
        let err = new Error('Forbidden');
        err.status = 403;
        return callback(err);
      }
      // console.log(game);
      let initData = {
        playable: game.gameStatus === 'InProgress' ? game.getCurrentPlayerID().toString() === userID : false,
        ownColor: game.playerB.toString() === userID ? 'B' : 'W',
        gameBoard: game.playerB.toString() === userID ? reverse(game.curBoard) : game.curBoard,
        opponent: game.playerB.toString() === userID ? game.playerW : game.playerB
      };
      return callback(null, initData);
  })
};


let Game = mongoose.model('Game', GameSchema);
module.exports = Game;