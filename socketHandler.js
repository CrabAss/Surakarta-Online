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
            if (error) return next(error);
            if (user) {
                // Search for duplication
                let hallUserIDs = [];
                for (let e in hall.connected)
                    if (hall.connected.hasOwnProperty(e))
                        hallUserIDs.push(hall.connected[e].handshake.session.userID);
                if (hallUserIDs.filter(e => e === socket.handshake.session.userID).length > 1) {
                    console.log('Duplicate sockets for the same user: ' + socket.handshake.session.userID + '!');
                    socket.emit('duplicate');
                    hall.connected[socket.id].disconnect(true);
                } else {
                    socket.emit('hello');
                    console.log('User "' + user.username + '" connected. ');
                    console.log('Number of Users:', hallUserIDs.length);

                    if (hallUserIDs.length >= 2) {
                        // start a new game
                        console.log('New game creating!!!');
                        Game.newGame(hallUserIDs, function (err, game) {
                            if (err) return console.log(err);
                            hall.emit('new', {gameID: game.gameID});
                            console.log('New game created:', game.gameID);
                            hall.connected[socket.id].disconnect(true);
                        });
                    }
                }
            } else {
                console.log('An anonymous user connected');
                socket.emit('anonymous');
                hall.connected[socket.id].disconnect(true);
            }
        });

        socket.on('disconnect', function (reason) {
            console.log('Socket disconnected because of', reason);
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
                    let roomUserIDs = [];
                    for (let e in game.connected)
                        if (game.connected.hasOwnProperty(e) && game.connected[e].rooms[msg.gameID])
                            roomUserIDs.push(game.connected[e].handshake.session.userID);
                    if (roomUserIDs.filter(e => e === socket.handshake.session.userID).length > 1) {
                        console.log('Duplicate sockets for the same user: ' + socket.handshake.session.userID +'!');
                        socket.emit('duplicate');
                        game.connected[socket.id].disconnect(true);
                    } else {
                        socket.emit('init', initData);
                    }
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
            console.log('Socket disconnected because of', reason);
        });
    });

};