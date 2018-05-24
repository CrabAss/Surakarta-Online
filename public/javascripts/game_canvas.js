paper.install(window);
$("#alert").hide();

$(document).ready(function() {

  const gameID = window.location.pathname.split('/').pop();
  let ownColor, playable;
  let startTime;
  let own, opponent;

  socket = io('/game', { path: '/g/socket' });
  socket.on('hello', function (msg) {
    // alert(data.username);
    socket.emit('ask', {gameID: gameID});
  });
  socket.on('init', function (msg) {
    // gameBoard, playable, ownColor, opponent
    redrawChecker(msg.gameBoard);
    ownColor = msg.ownColor;
    playable = msg.playable;
    if (playable) {
      $('.moving-badge.own').removeClass('d-none');
      $('.waiting-badge.opponent').removeClass('d-none');
    } else {
      $('.moving-badge.opponent').removeClass('d-none');
      $('.waiting-badge.own').removeClass('d-none');
    }
    $('#surrenderBtn').removeClass('d-none');
    socket.emit('ask_user', {opponent: msg.opponent});
  });
  socket.on('user', function (msg) {
    own = msg.ownPlayer;
    opponent = msg.opponentPlayer;
    $('span.username.own').text(own.username);
    $('span.username.opponent').text(opponent.username);
    $('span.flag-icon.own').addClass('flag-icon-' + own.country.toLowerCase());
    $('span.flag-icon.opponent').addClass('flag-icon-' + opponent.country.toLowerCase());
  });
  socket.on('update', function (msg) {
    // gameBoard
    redrawChecker(msg.gameBoard);
    playable = true;
    $('.moving-badge.own').removeClass('d-none');
    $('.waiting-badge.opponent').removeClass('d-none');
    $('.moving-badge.opponent').addClass('d-none');
    $('.waiting-badge.own').addClass('d-none');
    startTime = new Date();
  });
  socket.on('err', function (msg) {
    alert('Error ' + msg.status + ': ' + msg.message);
  });
  socket.on('end', function (msg) {
    playable = false;
    alert("Game over! " + (msg.winner === ownColor ? 'You are the winner!' : 'Your opponent is the winner.'));
    window.location = '/u';
  });
  socket.on('duplicate', function () {
    alert("You have opened duplicate windows! Please close this window to continue playing. ");
  });
  socket.on('forbidden', function () {
    alert('Sorry but you have no permission to join this game. ');
    window.location = '/u';
  });
  // socket.on('timeout', function (data) {
  //   // surrendered
  // });

  $("#surrenderBtn").click(function () {
    socket.emit('surrender', {gameID: gameID});
  });
  function showAlert(strongMsg, detailMsg) {
    let alertBox = $("#alert");
    alertBox.find('#strongMsg').text(strongMsg);
    alertBox.find('#detailMsg').text(detailMsg);
    alertBox.fadeTo(5000, 500).slideUp(500, function(){
      alertBox.slideUp(500);
    });
  }

  /* Initialization */

  const canvas = document.getElementById('gameCanvas');
  paper.setup(canvas);

  const Grid = 48;

  let board = []; // board[x][y]
  for (let i = 0; i < 6; i++) {
    board.push([]);
    for (let j = 0; j < 6; j++) {
      board[i].push(new paper.Point((i + 3) * Grid, (j + 3) * Grid));
    }
  }

  const attackRoute = [
    [
      board[0][1], board[1][1], board[2][1], board[3][1], board[4][1], board[5][1], null,
      board[4][0], board[4][1], board[4][2], board[4][3], board[4][4], board[4][5], null,
      board[5][4], board[4][4], board[3][4], board[2][4], board[1][4], board[0][4], null,
      board[1][5], board[1][4], board[1][3], board[1][2], board[1][1], board[1][0], null
    ],
    [
      board[0][2], board[1][2], board[2][2], board[3][2], board[4][2], board[5][2], null,
      board[3][0], board[3][1], board[3][2], board[3][3], board[3][4], board[3][5], null,
      board[5][3], board[4][3], board[3][3], board[2][3], board[1][3], board[0][3], null,
      board[2][5], board[2][4], board[2][3], board[2][2], board[2][1], board[2][0], null
    ]
  ];

  function getAllIndexes(arr, val) {
    let indexes = [], i = -1;
    while ((i = arr.indexOf(val, i + 1)) !== -1){
      indexes.push(i);
    }
    return indexes;
  }

  drawCheckerboard();

  function drawCheckerboard() {
    let checkerBoard_s = new paper.Path({
      strokeColor: '#FFC107',
      strokeWidth: 8
    });
    checkerBoard_s.add(
      board[0][0],
      board[0][5],
      board[5][5],
      board[5][0]
    );
    checkerBoard_s.closed = true;

    let handleUp = new paper.Point(0, -0.5 * Grid);
    let handleDown = new paper.Point(0, 0.5 * Grid);
    let handleLeft = new paper.Point(-0.5 * Grid, 0);
    let handleRight = new paper.Point(0.5 * Grid, 0);
    let checkerBoard_m = new paper.Path({
      strokeColor: '#F44336',
      strokeWidth: 8
    });
    checkerBoard_m.add(
      new paper.Segment(board[1][0], handleUp, handleDown),
      new paper.Segment(board[1][5], handleUp, handleDown),
      new paper.Segment(new paper.Point(3 * Grid, 9 * Grid), handleRight, handleLeft),
      new paper.Segment(new paper.Point(2 * Grid, 8 * Grid), handleDown, handleUp),
      new paper.Segment(board[0][4], handleLeft, handleRight),
      new paper.Segment(board[5][4], handleLeft, handleRight),
      new paper.Segment(new paper.Point(9 * Grid, 8 * Grid), handleUp, handleDown),
      new paper.Segment(new paper.Point(8 * Grid, 9 * Grid), handleRight, handleLeft),
      new paper.Segment(board[4][5], handleDown, handleUp),
      new paper.Segment(board[4][0], handleDown, handleUp),
      new paper.Segment(new paper.Point(8 * Grid, 2 * Grid), handleLeft, handleRight),
      new paper.Segment(new paper.Point(9 * Grid, 3 * Grid), handleUp, handleDown),
      new paper.Segment(board[5][1], handleRight, handleLeft),
      new paper.Segment(board[0][1], handleRight, handleLeft),
      new paper.Segment(new paper.Point(2 * Grid, 3 * Grid), handleDown, handleUp),
      new paper.Segment(new paper.Point(3 * Grid, 2 * Grid), handleLeft, handleRight)
    );
    checkerBoard_m.closed = true;

    handleUp = handleUp.multiply(2);
    handleDown = handleDown.multiply(2);
    handleLeft = handleLeft.multiply(2);
    handleRight = handleRight.multiply(2);
    let checkerBoard_l = new paper.Path({
      strokeColor: '#2196F3',
      strokeWidth: 8
    });
    checkerBoard_l.add(
      new paper.Segment(board[2][0], handleUp, handleDown),
      new paper.Segment(board[2][5], handleUp, handleDown),
      new paper.Segment(new paper.Point(3 * Grid, 10 * Grid), handleRight, handleLeft),
      new paper.Segment(new paper.Point(Grid, 8 * Grid), handleDown, handleUp),
      new paper.Segment(board[0][3], handleLeft, handleRight),
      new paper.Segment(board[5][3], handleLeft, handleRight),
      new paper.Segment(new paper.Point(10 * Grid, 8 * Grid), handleUp, handleDown),
      new paper.Segment(new paper.Point(8 * Grid, 10 * Grid), handleRight, handleLeft),
      new paper.Segment(board[3][5], handleDown, handleUp),
      new paper.Segment(board[3][0], handleDown, handleUp),
      new paper.Segment(new paper.Point(8 * Grid, Grid), handleLeft, handleRight),
      new paper.Segment(new paper.Point(10 * Grid, 3 * Grid), handleUp, handleDown),
      new paper.Segment(board[5][2], handleRight, handleLeft),
      new paper.Segment(board[0][2], handleRight, handleLeft),
      new paper.Segment(new paper.Point(Grid, 3 * Grid), handleDown, handleUp),
      new paper.Segment(new paper.Point(3 * Grid, Grid), handleLeft, handleRight)
    );
    checkerBoard_l.closed = true;
  }

  /* drawChecker */
  /* B for black, W for white */

  let checkerLayer = new paper.Layer();
  const checkerRadius = 0.4 * Grid;

  let checkerBDef = new paper.Symbol(new paper.Shape.Circle({
    radius: checkerRadius,
    fillColor: 'black',
    strokeColor: 'white',
    strokeWidth: 2
  }));
  let checkerWDef = new paper.Symbol(new paper.Shape.Circle({
    radius: checkerRadius,
    fillColor: 'white',
    strokeColor: 'black',
    strokeWidth: 2
  }));

  /* draw & redraw: receiving msg from server */

  function redrawChecker(msg) {
    checkerLayer.activate();
    checkerLayer.removeChildren();
    let checkerSeq = msg.split(""), curPosition;
    for (let i = 0; i < checkerSeq.length; i++) {
      curPosition = board[i % 6][~~(i / 6)];
      if (checkerSeq[i] === 'B') {
        let c = checkerBDef.place(curPosition);
        c.checkerPlayer = 'B';
      } else if (checkerSeq[i] === 'W') {
        let c = checkerWDef.place(curPosition);
        c.checkerPlayer = 'W';
      }
    }
  }

  // DEPRECATED!
  // for (let i = 0; i < 12; i++) {
  //   let c = checkerBDef.place(board[i % 6][5 - ~~(i / 6)]);
  //   c.checkerPlayer = "B";
  // }
  // for (let i = 0; i < 12; i++) {
  //   let c = checkerWDef.place(board[5 - i % 6][~~(i / 6)]);
  //   c.checkerPlayer = "W";
  // }

  /* Checker Mouse Event */

  let hintLayer = new paper.Layer();
  let hintAttackDef = new paper.Symbol(new paper.Shape.Circle({
    radius: checkerRadius * 0.56,
    fillColor: new paper.Color(0.953125, 0.26171875, 0.2109375, 0.8)
  }));
  let hintMoveDef = new paper.Symbol(new paper.Shape.Circle({
    radius: checkerRadius * 0.8,
    fillColor: new paper.Color(0.54296875, 0.76171875, 0.2890625, 0.8)
  }));

  let hitOptions = {
    stroke: true,
    fill: true,
    tolerance: 5
  };
  let hitItem, hitOriginalPos, mouseOffset;
  let movePos = [], attackPos = [];

  checkerLayer.onMouseDown = function(event) {

    // console.log('MouseDown');
    if (!playable) {
      showAlert('Be patient! ', 'You have to wait until your opponent moves the checker. ');
      return;
    }
    hitItem = hitOriginalPos = mouseOffset = null;
    movePos = attackPos = [];

    let hitResult = checkerLayer.hitTest(event.point, hitOptions);
    if (!hitResult) return;
    if (hitResult.item.checkerPlayer !== ownColor) {
      showAlert('Oops! ', 'You cannot move your opponent\'s checker. ');
      return;
    }

    hitItem = hitResult.item;
    checkerLayer.addChild(hitItem);

    hitOriginalPos = hitItem.position;
    mouseOffset = event.point.subtract(hitOriginalPos);

    movePos = getMovePos(hitOriginalPos);
    attackPos = getAttackPos(hitOriginalPos);
    if (movePos.length + attackPos.length === 0) {
      hitItem = hitOriginalPos = mouseOffset = null;
      showAlert('Sorry, ', 'this checker has nowhere to go according to the rule of Surakarta. ');
      return;
    }

    hintLayer.activate();
    movePos.forEach(function (element) {
      hintMoveDef.place(element)
    });
    attackPos.forEach(function (element) {
      hintAttackDef.place(element)
    });

  };

  checkerLayer.onMouseDrag = function(event) {
    if (hitItem) hitItem.position = event.point.subtract(mouseOffset);
  };

  checkerLayer.onMouseUp = function (event) {
    let nearestPoint, nearestDistance = 999999;
    let finalCord = {x: null, y: null};
    if (hitItem) {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (hitItem.position.getDistance(board[i][j]) < nearestDistance) {
            nearestPoint = board[i][j];
            nearestDistance = hitItem.position.getDistance(board[i][j]);
            finalCord.x = i; finalCord.y = j;
          }
        }
      }

      let accepted = false;
      movePos.forEach(function (element) {
        if (element.equals(nearestPoint)){
          hitItem.position = nearestPoint;
          accepted = true;
        }
      });
      attackPos.forEach(function (element) {
        if (element.equals(nearestPoint)) {
          let delChecker = findChecker(element, true);
          delChecker.remove();  // bug...
          hitItem.position = nearestPoint;
          accepted = true;
        }
      });

      if (accepted) {
        // send the move to server
        const oldPos = getCoord(hitOriginalPos).x + getCoord(hitOriginalPos).y * 6;
        const newPos = getCoord(nearestPoint).x + getCoord(nearestPoint).y * 6;
        socket.emit('move', {gameID: gameID, oldPos: oldPos, newPos: newPos, timeUsed: Math.abs(new Date() - startTime)});
        playable = false;
        $('.moving-badge.own').addClass('d-none');
        $('.waiting-badge.opponent').addClass('d-none');
        $('.moving-badge.opponent').removeClass('d-none');
        $('.waiting-badge.own').removeClass('d-none');
      }
      else {
        hitItem.position = hitOriginalPos;
        // alert mt-3 to user: move not accepted
      }

      hintLayer.removeChildren();
      hitItem = hitOriginalPos = mouseOffset = null;
    }
  };

  function findChecker(point, isOther) {
    let checker = null;
    checkerLayer.children.forEach(function (element) {
      if (element.position.equals(point)) {
        if (isOther) {
          if (hitItem) {
            if (element.checkerPlayer !== ownColor) checker = element;
          } else {
            checker = element;
          }
        } else checker = element;
      }
    });
    return checker;
  }

  function getCoord(point) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        if (board[i][j].equals(point))
          return {x: i, y: j};
    return null;
  }

  function getMovePos(point) {
    let coord = getCoord(point);
    let result = [];
    for (let x = coord.x - 1; x < coord.x + 2; x++)
      for (let y = coord.y - 1; y < coord.y + 2; y++)
        if (!(x < 0 || x > 5 || y < 0 || y > 5 || (x === coord.x && y === coord.y) || findChecker(board[x][y])))
          result.push(board[x][y]);
    return result;
  }

  function getAttackPos(point) {
    const opponent = findChecker(point).checkerPlayer === 'B' ? 'W' : 'B';
    const coord = getCoord(point);
    let result = [];
    for (let routeIndex = 0; routeIndex < 2; routeIndex++) {  // two routes
      if (attackRoute[routeIndex].includes(board[coord.x][coord.y])) {  // if checker is on the attackRoute
        const routeStarts = getAllIndexes(attackRoute[routeIndex], board[coord.x][coord.y]);
        routeStarts.forEach(function (routeStart) {
          for (let direction = -1; direction < 2; direction += 2) { // two direction
            let turned = false;
            for (let i = 1; i < attackRoute[routeIndex].length; i++) {  // all positions on the attackRoute except routeStart
              const routePosIndex = (routeStart + direction * i + attackRoute[routeIndex].length) % attackRoute[routeIndex].length;
              if (attackRoute[routeIndex][routePosIndex]) {
                // if the position have checker and it belongs to opponent and turned: push to result
                const foundChecker = findChecker(attackRoute[routeIndex][routePosIndex]);
                if (foundChecker && !foundChecker.position.equals(point)) {
                  if (foundChecker.checkerPlayer === opponent && turned)
                    result.push(attackRoute[routeIndex][routePosIndex]);
                  break;
                }
              } else turned = true;
            }
          }
        });
      }
    }
    return result.filter(function (item, pos) {
      return result.indexOf(item) === pos;
    });
  }

});
