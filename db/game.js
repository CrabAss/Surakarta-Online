let mongoose = require('mongoose');
let shortId = require('shortid');
const initBoard = 'BBBBBBBBBBBB............WWWWWWWWWWWW';

let GameMoveSchema = new mongoose.Schema({
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

let GamePlayerSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isFirst: {
    type: Boolean,
    required: true,
    default: false
  },
  isWinner: {
    type: Boolean,
    required: true,
    default: false
  },
  isActive: {
    type: Boolean,
    required: true,
    default: false
  }
});

let GameSchema = new mongoose.Schema({
  gameID: {
    type: String,
    unique: true,
    required: true
  },
  status: {
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
    type: GamePlayerSchema,
    required: true
  },
  playerW: {
    type: GamePlayerSchema,
    required: true
  },
  currentBoard: { /* black --- white */
    type: String,
    required: true,
    maxlength: 37,
    default: initBoard
  },
  totalMoves: {
    type: Number,
    required: true,
    default: 0
  },
  moves: [GameMoveSchema]
});

GameSchema.virtual('winner').get(function () {
  return this.status !== "InProgress" ? (this.playerB.isWinner ? this.playerB.userID : this.playerW.userID) : undefined;
});

GameSchema.virtual('loser').get(function () {
  return this.status !== "InProgress" ? (!this.playerB.isWinner ? this.playerB.userID : this.playerW.userID) : undefined;
});


/* Sample of currentBoard:
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
*     currentBoard: reverse the whole string
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
  let boardArray = this.currentBoard.split("");
  boardArray[newPos] = this.getCurrentPlayer();
  boardArray[oldPos] = '.';
  this.currentBoard = boardArray.join("");

  this.totalMoves++;
  this.moves.push({
    seq: this.totalMoves,
    checkerOldPos: oldPos,
    checkerNewPos: newPos,
    timeUsed: Number(timeUsed)
  });

  // and check if there is a winner

  let gameWinner;

  if (!boardArray.includes('B')) {
    // playerW wins
    this.status = 'Finished';
    this.playerW.isWinner = true;
    gameWinner = 'W';
  } else if (!boardArray.includes('W')) {
    // playerB wins
    this.status = 'Finished';
    this.playerB.isWinner = true;
    gameWinner = 'B';
  }
  this.save(function (err) {
    return callback(err)
  });
  return callback(null, gameWinner);
};

GameSchema.methods.getCurrentPlayer = function () {
  return this.totalMoves % 2 === 0 ? (this.playerB.isFirst ? 'B' : 'W') : (this.playerB.isFirst ? 'W' : 'B');
};

GameSchema.methods.getCurrentPlayerID = function () {
  return this.getCurrentPlayer() === 'B' ? this.playerB.userID : this.playerW.userID;
};

GameSchema.methods.getMovePos = function (curPos) {
  const x = curPos % 6, y = ~~(curPos / 6);
  let result = [];
  for (let i = x - 1; i < x + 2; i++) {
    for (let j = y - 1; j < y + 2; j++) {
      if (!(i < 0 || i > 5 || j < 0 || j > 5 || (i === x && j === y) || this.currentBoard.charAt(i + j * 6) !== '.')) {
        result.push(i + j * 6);
      }
    }
  }
  return result;
};

GameSchema.methods.getAttackPos = function (curPos) {
  const opponent = this.getCurrentPlayer() === 'B' ? 'W' : 'B';
  const currentBoard = this.currentBoard;
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
              const foundChecker = currentBoard.charAt(attackRoute[routeIndex][routePosIndex]);
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
  if (this.status !== "InProgress")
    return errRejected();

  let gameWinner;
  if (this.getCurrentPlayer() === 'B') {
    oldPos = 35 - oldPos;
    newPos = 35 - newPos;
  }
  if (this.currentBoard.charAt(oldPos) !== this.getCurrentPlayer()) // waiting player hacks
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
    return callback(null, this.getCurrentPlayer() === 'B' ? reverse(this.currentBoard) : this.currentBoard, gameWinner);
  } else return errRejected();

  function errRejected() {
    let err = new Error('Move is rejected. ');
    err.status = 400;
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
    playerB: {
      userID: playerB,
      isFirst: playerB === playerFirst
    },
    playerW: {
      userID: playerW,
      isFirst: playerW === playerFirst
    }
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
  this.status = 'Surrendered';
  if (sender === this.playerB.userID.toString()) {
    this.playerW.isWinner = true;
  } else {
    this.playerB.isWinner = true;
  }
  this.save(function (err, updatedGame) {
    if (err) return callback(err);
    else {
      return callback(null, updatedGame.playerB.isWinner ? 'B' : 'W')
    }
  });
};

GameSchema.statics.getInitData = function (gameID, userID, callback) {
  Game.findOne({
    gameID: gameID,
    $or: [
      { "playerB.userID": userID },
      { "playerW.userID": userID }
    ]}, function (err, game) {
      if (err) return callback(err);
      if (!game) {
        let err = new Error('Forbidden');
        err.status = 403;
        return callback(err);
      }
      let initData = {
        playable: game.status === 'InProgress' ? game.getCurrentPlayerID().toString() === userID : false,
        ownColor: game.playerB.userID.toString() === userID ? 'B' : 'W',
        gameBoard: game.playerB.userID.toString() === userID ? reverse(game.currentBoard) : game.currentBoard,
        opponent: game.playerB.userID.toString() === userID ? game.playerW.userID : game.playerB.userID
      };
      return callback(null, initData);
  })
};


let Game = mongoose.model('Game', GameSchema);
module.exports = Game;