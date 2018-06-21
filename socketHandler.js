let sharedSession = require("express-socket.io-session");
let User = require('./db/user');
let Game = require('./db/game');
module.exports = function(io, app, next) {

  let hall = io.of('/hall');
  let game = io.of('/game');

  hall.use(sharedSession(app.sessionMiddleware));
  game.use(sharedSession(app.sessionMiddleware));

  hall.on('connection', function (socket) {
    User.findById(socket.handshake.session.userID).exec(function (error, user) {
      if (error) {
        return next(error);
      } else {
        if (user) {  // user with identity
          user.getGameInProgress(function (gameInProgress) {
            if (gameInProgress) {
              console.log('User "' + user.username + '" redirected to ', gameInProgress ,'. ');
              socket.emit('new', {gameID: gameInProgress});
            } else {
              let hallSockets = [];
              for (let i in hall.connected)
                if (hall.connected.hasOwnProperty(i))
                  if (i !== socket.id) hallSockets.push(i);
              hallSockets.forEach(function (existingSocket) {
                if (hall.connected[existingSocket].handshake.session.userID === socket.handshake.session.userID) {
                  console.log('Duplicate sockets for the same user: ' + socket.handshake.session.userID +'!');
                  socket.emit('duplicate');
                  hall.connected[socket.id].disconnect(true);
                }
              });
              console.log('User "' + user.username + '" connected. ');
              socket.emit('hello', { username: user.displayName });

              console.log('Number of Users:', Object.keys(hall.connected).length);
              if (Object.keys(hall.connected).length >= 2)  {
                console.log('Matching!!!!');
                // start a new game
                let hallUserID = [];
                for (let i in hall.connected)
                  if (hall.connected.hasOwnProperty(i))
                    hallUserID.push(hall.connected[i].handshake.session.userID);
                Game.newGame(hallUserID, function (err, game) {
                  if (err) return console.log(err);
                  hall.emit('new', {gameID: game.gameID});
                  console.log('New game created:', game.gameID);
                  hall.connected[socket.id].disconnect(true);
                });
              }
            }
          });
        } else {
          console.log('An anonymous user connected');
          socket.emit('anonymous');
          hall.connected[socket.id].disconnect(true);
        }
      }
    });

    socket.on('disconnect', function (reason) {
      console.log('socket disconnected because of', reason);
    });
  });

  game.on('connection', function (socket) {
    User.findById(socket.handshake.session.userID).exec(function (error, user) {
      if (error) {
        return next(error);
      } else {
        if (user !== null) {  // user with identity
            console.log('User "' + user.username + '" connected. ');
            socket.emit('hello', { username: user.displayName });
        } else {
          console.log('An anonymous user connected');
          socket.emit('anonymous');
          game.connected[socket.id].disconnect(true);
        }
      }
    });

    socket.on('ask_game', function (msg) {
      console.log('Client', socket.handshake.session.userID, 'asking game for', msg.gameID);
      // SEND BACK: INIT
      // gameBoard, ownColor, countdown, opponent
      Game.getInitData(msg.gameID, socket.handshake.session.userID, function (err, initData) {
        if (err) {
          if (err.status === 403) {
            socket.emit('forbidden');
            game.connected[socket.id].disconnect(true);
          } else return next(err);
        }
        // console.log('initData:', initData);
        socket.join(msg.gameID, function () {
          // reject multiple sockets for same user
          let roomSockets = [];
          for (let i in game.connected)
            if (game.connected.hasOwnProperty(i))
              if (game.connected[i].rooms[msg.gameID] && i !== socket.id)
                roomSockets.push(i);
          roomSockets.forEach(function (existingSocket) {
            if (game.connected[existingSocket].handshake.session.userID === socket.handshake.session.userID) {
              console.log('Duplicate sockets for the same user: ' + socket.handshake.session.userID +'!');
              socket.emit('duplicate');
              game.connected[socket.id].disconnect(true);
            }
          });
          socket.emit('init', initData);
        });
      });
    });

    socket.on('ask_user', function (msg) {
      let own = {}, opponent = {};
      User.findById(socket.handshake.session.userID).exec(function (error, user) {
        if (error) return next(error);
        own = {
          username: user.displayName,
          gender: user.gender,
          country: user.country
        };
        User.findById(msg.opponent).exec(function (error, user) {
          if (error) return next(error);
          opponent = {
            username: user.displayName,
            gender: user.gender,
            country: user.country
          };
          socket.emit('user', {ownPlayer: own, opponentPlayer: opponent});
        });
      });

    });

    socket.on('move', function (msg) {
      // msg.oldPos, msg.newPos, msg.timeUsed(?)
      // SEND BACK: UPDATE / END
      // gameBoard
      Game.findOne({gameID: msg.gameID}, function (err, currentGame) {
        currentGame.moveStep(msg.oldPos, msg.newPos, msg.timeUsed, function (err, gameBoard, oldPos, newPos, winner) {
          if (err) {
            socket.emit('err', {status: err.status, message: err.message});
            if (err.status !== 400) return next(err);
          }
          socket.to(msg.gameID).emit('update', {gameBoard: gameBoard, oldPos: oldPos, newPos: newPos});
          if (winner) {
            User.updateGameRecord(currentGame.gameID, currentGame.winner, currentGame.loser, function (err) {
              if (err) return callback(err);
            });
            socket.to(msg.gameID).emit('end', {winner: winner});
            socket.emit('end', {winner: winner});
            console.log('END!!! Winner:', winner);
            // game.connected[socket.id].disconnect(true);
          }
        });
      });
    });

    socket.on('surrender', function (msg) {
      // gameID
      // SEND BACK: END
      Game.findOne({gameID: msg.gameID}, function (err, currentGame) {
        currentGame.surrenderGame(socket.handshake.session.userID, function (err, winner) {
          User.updateGameRecord(currentGame.gameID, currentGame.winner, currentGame.loser, function (err) {
            if (err) return callback(err);
          });
          socket.to(msg.gameID).emit('end', {winner: winner});
          socket.emit('end', {winner: winner});
          console.log('Surrendered!!! Winner:', winner);
          game.connected[socket.id].disconnect(true);
        });

      });
    });

    // timer???

    socket.on('disconnect', function (reason) {
      // Auto surrender after anonymous user disconnected
      if (socket.handshake.session.isTemporary === true && reason !== 'ping timeout') {
        Game.findOne({
          $or: [
            { "playerB.userID": socket.handshake.session.userID },
            { "playerW.userID": socket.handshake.session.userID }
          ],
          status: "InProgress"
        }, function (err, currentGame) {
          if (!currentGame) return;
          currentGame.surrenderGame(socket.handshake.session.userID, function (err, winner) {
            User.updateGameRecord(currentGame.gameID, currentGame.winner, currentGame.loser, function (err) {
              if (err) return callback(err);
            });
            socket.to(currentGame.gameID).emit('end', {winner: winner});
            console.log('Surrendered due to disconnection of anonymous user!!! Winner:', winner);
          });
        });
      }
      console.log('socket disconnected because of', reason);
    });
  });

};