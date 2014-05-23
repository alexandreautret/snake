$(document).ready(function(){

  //Canvas stuff
    var game = {
                playerCount : 1,
                w : 45,
                h : 45,
                heightParts : 45,
                widthParts : 45,
                splitScreen : true, // share screen = true / split screen = false
                splitCommand : true
               };
  var thePlayer = {
                    number : 1,
                    sendingPosition : '',
                    widthOffset : 0,
                    heightOffset : 0,
                    area : null
                  };
  var canvas = $("#canvas")[0];
  var ctx = canvas.getContext("2d");
  var time;
  var start = false;

  //Lets save the cell width in a variable for easy control
  var canvasWidth = $('#gameView').width();
  var canvasHeight = $('#gameView').height();
  var canvasSize = 0;
  var cw;


  /**
   * First parameter (1, 2, 4) : player count in the game
   * Second parameter (1, 2, 3,4) : informations for the current user
   * notifDir : direction where the player must to send his position
   * square.x1 : horizontal start of the player area
   * square.x2 : horizontal end of the player area
   * square.y1 : vertical start of the player area
   * square.y2 : vertical end of the player area
   */
  var users = {
                1:{ 1:{ notifDir:'',
                        allowedDir : 'left right up down',
                        area:{x1:-1, x2:45,
                              y1:-1, y2:45}
                    }
                },
                2:{ 1:{ notifDir:'right',
                        allowedDir : 'left right',
                        area :{x1:-1,x2:45,
                               y1:-1,y2:45}
                    },
                    2:{ notifDir:'left',
                        allowedDir : 'up down',
                        area: {x1:46,x2:90,
                               y1:-1,y2:45}
                    }
                },
                4:{ 1:{ notifDir:'right down',
                        allowedDir : 'left',
                        area: {x1:-1,x2:45,
                               y1:-1,y2:45}
                    },
                    2:{ notifDir:'left down',
                        allowedDir : 'right',
                        area: {x1:46,x2:90,
                               y1:-1,y2:45}
                    },
                    3:{ notifDir:'right up',
                        allowedDir : 'up',
                        area: {x1:-1,x2:45,
                               y1:46,y2:90}
                    },
                    4:{ notifDir:'left up',
                        allowedDir : 'down',
                        area: {x1:46,x2:90,
                               y1:46,y2:90}
                    }
                }
              }

  // Calcul canvas Size

  if(canvasWidth < canvasHeight){
      canvasSize = canvasWidth;
  } else {
      canvasSize = canvasHeight;
  }
  if(canvasSize > 450){
    canvasSize = 450;
  }
  cw = Math.floor((canvasSize) / 45);
  // adapt size with the floored value
  canvasSize = 45 * cw;


  $('#canvas').attr('width',canvasSize)
  $('#canvas').attr('height',canvasSize);

  var d;
  var food;
  var score;

  //Lets create the snake now
  var snake_array; //an array of cells to make up the snake



  var forThisPlayer = false;

  /**
   * Set the default parameters of the game
   * -> Create Snake
   * -> Create time object for updating time compare
   * -> Set the default direction
   * -> Init the score
   * -> Start the game Loop
   */
  function init()
  {
    d = "right"; //default direction
    start = true;
    create_snake();
    time = {
      updateDirection : 0,
      updatePosition : 0
    }

    score = 0;

    //Lets move the snake now using a timer which will trigger the paint function
    //every 60ms
    if(typeof game_loop != "undefined") clearInterval(game_loop);
    game_loop = setInterval(paint, 60);
  }

  /**
   * Creating the snake array
   */
  function create_snake()
  {
    var length = 4; //Default length of the snake
    snake_array = []; //Empty array to start with
    for(var i = length-1; i>=0; i--)
    {
      //This will create a horizontal snake starting from the top left
      snake_array.push({x: i, y:0});
    }
  }



  //Lets paint the snake now
  function paint()
  {

    if(game.playerCount > 1){

    }
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, game.widthParts * cw , game.heightParts * cw);
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, game.widthParts * cw , game.heightParts * cw);


    var nx = snake_array[0].x;
    var ny = snake_array[0].y;

    if(d == "right") nx++;
    else if(d == "left") nx--;
    else if(d == "up") ny--;
    else if(d == "down") ny++;

    // Check if the player is focused
    forThisPlayer = false;
    if(game.splitScreen){
      if(nx >= thePlayer.area.x1 && nx <= thePlayer.area.x2  &&
        ny >= thePlayer.area.y1 && ny <= thePlayer.area.y2) {
        forThisPlayer = true;
      }
    } else {
      if(thePlayer.number == 1){
        forThisPlayer = true;
      }
    }

    // if player is focused, check collisions and if he must emit his positions
    if(forThisPlayer){
      if(thePlayer.sendingPosition.indexOf(d) >= 0){
        socket.emit('updatePosition',{snake:snake_array});
      }

      if(nx == -1 || nx == game.w || ny == -1 || ny == game.h || check_collision(nx, ny, snake_array))
      {
        // sending the fail to server for dispatching and restart the game
        socket.emit('fail');
        return;
      }
    }




    // debugging stuff
    $('#snakePosisition').html('X : ' + nx + ' Y : ' + ny);
    $('#snakeLength').html( snake_array.length);


    // Check if the player is focused and have a good position to eat the food
    if(forThisPlayer && nx == food.x && ny == food.y)
    {
      var tail = {x: nx, y: ny};
      snake_array.unshift(tail); //puts back the tail as the first cell

      // Sending the score event to the server for dispatching to other players
      socket.emit('score', {snake : snake_array});
    }
    else
    {
      var tail = snake_array.pop(); //pops out the last cell

      tail.x = nx; tail.y = ny;
      snake_array.unshift(tail); //puts back the tail as the first cell
    }


    for(var i = 0; i < snake_array.length; i++)
    {
      var c = snake_array[i];
      //Lets paint 10px wide cells
      paint_cell(c.x, c.y);
    }

    //Lets paint the food
    paint_cell(food.x, food.y);
    //Lets paint the score
    var score_text = "Score: " + score;
    ctx.fillText(score_text, 5, game.h * cw-5);
  }

  //Lets first create a generic function to paint cells
  function paint_cell(x, y)
  {
    var newX = x;
    var newY = y;

    ctx.fillStyle = "#04859D";
    ctx.fillRect((newX - thePlayer.widthOffset) * cw ,(newY - thePlayer.heightOffset)  * cw, cw, cw);
    ctx.strokeStyle = "white";
    ctx.strokeRect((newX - thePlayer.widthOffset) * cw , (newY - thePlayer.heightOffset)* cw, cw, cw);
  }

  /**
   * This function will check if the provided x/y coordinates exist in an array of cells or not
   * @param x : horizontal position of the snake head
   * @param y : vertical position of the snake head
   * @param array : Snake Array
   * @returns {boolean}
   */
  function check_collision(x, y, array)
  {
    for(var i = 0; i < array.length; i++)
    {
      if(array[i].x == x && array[i].y == y)
        return true;
    }
    return false;
  }

  /**
   * Connect the player to the server
   */

  socket.emit('conection');


  $('#joinRoom').click(function(e){
    e.preventDefault();

    socket.emit('joinRoom',{roomId:$('#roomId').val()})

  })



  $('input[name="player"]').on('change',function(){

    if(this.value == 1){
      $('.screen').slideUp('slow',function(){
        document.getElementById('screen_split_image').setAttribute('src','images/snake_split_screen_'+ this.value+'.png');
      });
      $('.command').slideUp('slow',function(){
        document.getElementById('command_split_image').setAttribute('src','images/snake_split_command_'+ this.value+'.png');
      });
    } else {
      document.getElementById('screen_split_image').setAttribute('src','images/snake_split_screen_'+ this.value+'.png');
      document.getElementById('command_split_image').setAttribute('src','images/snake_split_command_'+ this.value+'.png');

      $('.screen').slideDown('slow');
      $('.command').slideDown('slow');
    }

  });

  $('#createRoom').click(function(e){
    e.preventDefault();
    var maxPlayers = $('input[name="player"]:checked').val();
    var screen;
    var command;
    if(maxPlayers == 1){
      screen = 'share';
      command = 'share';
    } else {
      screen =  $('input[name="screen"]:checked').val();
      command = $('input[name="command"]:checked').val();
    }
    socket.emit('createRoom',{maxPlayers: $('input[name="player"]:checked').val(), screen : screen, command : command})
  })


  socket.on('joinRoom',function(data){

    game.playerCount = data.roomInfo.maxPlayerCount;
    game.splitScreen = data.roomInfo.splitScreen;
    game.splitCommand = data.roomInfo.splitCommand;

    thePlayer.number = data.playerInfo.playerNumber;

    // set up which part of the screen the player will see
    if(game.splitScreen){

      if(game.playerCount == 2){
        game.w = game.w * 2;
      } if(game.playerCount == 4){
        game.w = game.w * 2;
        game.h = game.h * 2 ;
      }

      if(thePlayer.number == 2 ){
        thePlayer.widthOffset = game.w / 2;
      } else if (thePlayer.number == 3) {
        thePlayer.heightOffset = game.h / 2;
      } else if (thePlayer.number == 4){
        thePlayer.widthOffset = game.w /2
        thePlayer.heightOffset = game.h /2;
      }
    }

    if(game.splitCommand){
      thePlayer.allowedDir = users[game.playerCount][thePlayer.number].allowedDir;

      $('body').find('.direction').each(function(){

        if(thePlayer.allowedDir.indexOf(this.getAttribute('data-type')) <0){
          $(this).remove();
        }
      })
    }
    thePlayer.sendingPosition = users[game.playerCount][thePlayer.number].notifDir;

    thePlayer.area = users[game.playerCount][thePlayer.number].area;

    $('#displayRoomId').html('You room is : ' + data.roomInfo.roomId);
    $('#displayPlayerNumber').html('You are the player ' + thePlayer.number);
    $('.connectionBox').addClass('hide');
    $('.readyBox').removeClass('hide');


  });


  socket.on('newPlayer',function(){
    console.log('We have a new player in the room');
  });

  socket.on('areYouReady',function(){
    console.log('All players are here go ?');
    $('.readyBox').append('<div  class="button" style="margin-top: 10%" id="go" value="">Go ! </div>')
  });

  $('body').on('click','#go',function(){
    socket.emit('ready');
    $('.readyBox').addClass('hide');

    $('#waitingOtherPlayers').removeClass('hide');

  })

  //Lets add the keyboard controls now
  $(document).keydown(function(e){
    if(start){
      var direction;
      var key = e.which;
      var oldDirection = d; // get the actual direction
      //We will add another clause to prevent reverse gear
      if(key == "37" && oldDirection != "right") direction = "left";
      else if(key == "38" && oldDirection != "down")  direction = "up";
      else if(key == "39" && oldDirection != "left") direction = "right";
      else if(key == "40" && oldDirection != "up") direction = "down";

      console.log(game.splitCommand);

      // Check if player is allowed to change snake to this direction
      if(!game.splitCommand || thePlayer.allowedDir.indexOf(direction) >= 0 ){

          var snakeInfos = {
          direction : direction,
          snake : snake_array
        }
        // Send the new position to other players
        socket.emit('direction', snakeInfos);
      }
    }
  })

  $('.direction').on('click',function(e){
    if(start){
      var direction;
      var theDirection = this.getAttribute('data-type');
      var oldDirection = d; // get the actual direction
      //We will add another clause to prevent reverse gear
      if(theDirection == "left" && oldDirection != "right") direction = "left";
      else if(theDirection == "up" && oldDirection != "down")  direction = "up";
      else if(theDirection == "right" && oldDirection != "left") direction = "right";
      else if(theDirection == "down" && oldDirection != "up") direction = "down";


      // check if player is allowed to change snake for this direction
      if(!game.splitCommand || thePlayer.allowedDir.indexOf(direction) >= 0 ){

        var snakeInfos = {
          direction : direction,
          snake : snake_array
        }
        // Send the new position to other players
        socket.emit('direction', snakeInfos);
      }
    }
  });
  /**
   * Change the direction of the snake
   */
  socket.on('direction', function(snakeInfos) {

    if(snakeInfos.time > time.updateDirection){
      d = snakeInfos.direction;
      time.updateDirection = snakeInfos.time;

    }

    if(!forThisPlayer){
      if(snakeInfos.time > time.updatePosition){
        snake_array = snakeInfos.snake;
        time.updatePosition = snakeInfos.time;
      }
    }
  });



  socket.on('start_game',function(gameInfos){

    $('#waitingOtherPlayers').fadeOut('fast');
    $('#canvas').fadeIn('fast');
    $('.directionBlock').fadeIn('fast');
    $('.debugging-stuff').fadeIn('fast');


    score = 0;

    food = gameInfos.foodPosition;
    $('#foodPosisition').html('X :' + gameInfos.foodPosition.x + ' Y : '+ gameInfos.foodPosition.y);

      init();

  })

  // Receive Score from the server
  socket.on('score',function(newInfos){
    food = newInfos.foodPosition;
    if(newInfos.playerEater != thePlayer){

      if(newInfos.time > time.updatePosition){
        snake_array = newInfos.snake;
        time.updatePosition = newInfos.time;

      }
    }
    score++;
  });
  // Receive new Position from the server
  socket.on('updatePosition',function(newInfos){
    // Check if we have receive a position more recently
    if(newInfos.time > time.updatePosition){
      snake_array = newInfos.snake;
      time.updatePosition = newInfos.time;

    }

  });
})