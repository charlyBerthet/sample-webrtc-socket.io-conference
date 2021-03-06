// Config
var useHttps = false;
var port = (process.env.PORT || 8100);
// Substitute your Twilio AccountSid and ApiKey details
var ACCOUNT_SID = 'AC9e6c39ae91c23b148b2a16fac754d228';
var API_KEY_SID = 'SK24b7671b999092a01cf351e44c965683';
var API_KEY_SECRET = 'iWh6fUXI33J3q6RHX4w4OgaQl5DV57pF';

// imports
var express = require('express')
var app = express();
var fs = require('fs');
var https = require('https');
var http = require('http');
var io = null;
var AccessToken = require('twilio').jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;
var cors = require('cors');


if(!useHttps){
  http = http.Server(app);
  io = require('socket.io')(http);
}
else{
  var privateKey = fs.readFileSync( 'ssl/server.key' );
  var certificate = fs.readFileSync( 'ssl/server.crt' );
  
  https = https.createServer({
      key: privateKey,
      cert: certificate
  }, app);
  io = require('socket.io')(https);
}


// static for ui
app.use(express.static(__dirname + '/ui'))
app.use(cors());

var casters = {};
var listeners = {};

io.on('connection', function(socket){
  console.log('a user connected');
  var room = null;
  var username = null;
  socket.on('join', data => {
    
    if(data.room == data.username){
      if(casters[data.room]){
        socket.emit('caster-full');
      }else{
        console.log('a user (caster) join',  data);
        room = data.room;
        username = data.username;
        socket.join(room);
        casters[room] = {
          socket: socket,
          username: username  
        };
        socket.emit('start-casting');
      }
    }else {
      console.log('a user (listener) join',  data);
      room = data.room;
      username = data.username;
      socket.join(room);
      if(!listeners[room]) listeners[room] = [];
      listeners[room].push({
        socket: socket,
        username: username
      });
      
      if(casters[room]){
        casters[room].socket.emit('connect-to', username);
      }
    }
  });


  socket.on('stream-ready', () => {
    if(listeners[room]){
      listeners[room].forEach(listener => {
        casters[room].socket.emit('connect-to', listener.username);
      })
    }
  })

  socket.on('offer', function(data){
    console.log('offer', data);
    listeners[room].forEach(listener => {
      if(listener.username == data.username){
        listener.socket.emit('offer', data.offer);
      }
    })
  });
  socket.on('answer', function(data){
    console.log('answer', data);
    if(casters[room]){
      casters[room].socket.emit('answer', {answer:data.answer, username:data.username});
    }
  });
  socket.on('candidate', function(data){
    console.log('candidate', data);
    if(casters[room]){
      casters[room].socket.emit('candidate', {candidate:data.candidate, username:data.username});
    }
  });


  socket.on('disconnect', function(){
    console.log('user disconnected');
    if(username == room){
      delete casters[room];
      socket.to(room).emit('mentor-hangup');
    }else{
      delete listeners[room];
      if(casters[room]){
        casters[room].socket.emit('listener-hangup', username);
      }
    }
  });
});



app.get('/twilio-token/:room/:username', function (req, res, next) {
  // Create an Access Token
  var accessToken = new AccessToken(
    ACCOUNT_SID,
    API_KEY_SID,
    API_KEY_SECRET
  );

  // Set the Identity of this token
  console.log("username/room", req.params.username, req.params.room);
  accessToken.identity = req.params.username;

  // Grant access to Video
  var grant = new VideoGrant();
  grant.room = req.params.room;
  accessToken.addGrant(grant);

  // Serialize the token as a JWT
  var jwt = accessToken.toJwt();
  res.json({jwt: jwt})
})



// HTTP
if(!useHttps){
  http.listen(port, function(){
    console.log('listening on *:' + port);
  });
}
// HTTPS
else{
  https.listen(port, function(){
    console.log('listening on *:'+ port);
  });
}