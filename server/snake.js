// Configuration du serveur

var http = require('http');
var fs = require('fs');
// Chargement du fichier index.html affiché au client
var server = http.createServer(function(req, res) {
  fs.readFile('./index.html', 'utf-8', function(error, content) {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(content);
  });
});
// Chargement de socket.io
var io = require('socket.io').listen(server);
// Configuration du jeu (taille du plateau par joueur)
var w = 45;
var h = 45 ;
// Initialisation des variables globales du jeux
var players = [];
var rooms = {};



// Quand on client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {
var me = {};
  initializePlayer();


  function initializePlayer(){
    me.ready = 0;
    me.playerNumber = 0;
  }

  function generateRoom(roomInformations){

    var randomRoomId =  ''+(Math.floor((10000-999)*Math.random())+999)+'';
    while(rooms[randomRoomId] !== undefined){
      randomRoomId = ''+(Math.floor((10000-999)*Math.random())+999)+'';
    }

    var newRoom = {};
    if(roomInformations.screen == "split"){
      newRoom.splitScreen = true;
    } else {
      newRoom.splitScreen = false;
    }

    if(roomInformations.command == "split"){
      newRoom.splitCommand = true;
    } else {
      newRoom.splitCommand = false;
    }
    newRoom.maxPlayerCount = parseInt(roomInformations.maxPlayers);
    newRoom.playersCount = 1;
    newRoom.playersReady = 0;
    newRoom.score = 0;
    newRoom.roomId = randomRoomId

    rooms[newRoom.roomId] = newRoom;

    return newRoom.roomId;
  }
  /* Connexion de l'utilisateur pour création d'une room  */
  socket.on('createRoom', function(roomInformations){
    //roomInformations.maxPlayers
    var createdRoom = generateRoom(roomInformations);
    me.roomId = createdRoom;
    socket.join(me.roomId)
    me.playerNumber = 1;
    console.log(rooms[me.roomId]);
    socket.emit('joinRoom',{playerInfo :me, roomInfo : rooms[me.roomId]})

    if(rooms[me.roomId].playersCount == rooms[me.roomId].maxPlayerCount){
      io.sockets.in(me.roomId).emit('areYouReady')
    }
  });


  /* Connexion de l'utilisateur pour création d'une room  */
  socket.on('joinRoom', function(roomInformations){
    console.log('user want to join room : ' + roomInformations.roomId);

    if(rooms[roomInformations.roomId] === undefined) {
      // emit : sorry room doesn't exist

      // + un else if si la room est complete
    } else {

      me.roomId = roomInformations.roomId;
      socket.join(me.roomId)

      rooms[me.roomId].playersCount++
      me.playerNumber = rooms[me.roomId].playersCount;
      socket.broadcast.to(me.roomId).emit('newPlayer') //emit to 'room' except this socket
      socket.emit('joinRoom', {playerInfo :me, roomInfo : rooms[me.roomId]})
      console.log(rooms[me.roomId]);

      if(rooms[me.roomId].playersCount == rooms[me.roomId].maxPlayerCount){
        io.sockets.in(me.roomId).emit('areYouReady')
      }
    }



  });

  socket.on('disconnect', function() {
    if(me.roomId !== undefined){
      rooms[me.roomId].playersCount = rooms[me.roomId].playersCount - 1
      if( rooms[me.roomId].playersCount == 0){
        socket.leave(me.roomId);
        delete rooms[me.roomId];
      }
    }
  });


  socket.on('ready', function(){

    console.log('me.ready :' +me.ready)
  if(me.ready == 0){
    console.log('he havent said that s is ready for the moment set ready' );
      me.ready = 1;
      rooms[me.roomId].playersReady++
      if(rooms[me.roomId].playersReady == rooms[me.roomId].maxPlayerCount){

        var theFood = create_food(rooms[me.roomId]);
        gameInfos = {
          foodPosition : theFood
        }
        io.sockets.in(me.roomId).emit('start_game', gameInfos)
      }

  } else {
    console.log('already ready')
  }


  });

// io.sockets.in('room').emit('event_name', data)

  socket.emit('message', 'Vous êtes bien connecté !');



  socket.on('direction', function (direction) {
    console.log('Un client me parle ! Il me dit : ' + direction);
    direction.time = new Date().getTime();
    io.sockets.in(me.roomId).emit('direction', direction)
  });


  socket.on('fail', function () {
    var theFood = create_food(rooms[me.roomId]);
    console.log(rooms[me.roomId]);
    rooms[me.roomId].score = 0;
    gameInfos = {
      foodPosition : theFood
    }
    io.sockets.in(me.roomId).emit('start_game', gameInfos)


  });

  socket.on('score', function (info) {
    console.log(info);

    rooms[me.roomId].score = rooms[me.roomId].score +1 ;
    var theFood = create_food(rooms[me.roomId]);
    gameInfos = {
      playerEater : me.playerNumber,
      foodPosition : theFood,
      snake : info.snake,
      time :new Date().getTime()

  }
    io.sockets.in(me.roomId).emit('score', gameInfos)

  });

  socket.on('updatePosition', function (info) {

    gameInfos = {
      snake : info.snake,
      time : new Date().getTime()
  }
    socket.broadcast.to(me.roomId).emit('updatePosition', gameInfos)

  });


});


function create_food(room)
{
  if(room.maxPlayerCount == 1 || !room.splitScreen){
    food = {
      x: Math.round(Math.random()*(w-1)/1),
      y: Math.round(Math.random()*(h-1)/1)
    };
  } else if (room.maxPlayerCount == 2){
    food = {
      x: Math.round(Math.random()*(w*2-1)/1),
      y: Math.round(Math.random()*(h-1)/1)
    };
  } else if (room.maxPlayerCount){
    food = {
      x: Math.round(Math.random()*(w * 2 - 1) / 1),
      y: Math.round(Math.random()*(h * 2 - 1 ) / 1)
    };
  }


  return food;
}
server.listen(1441);