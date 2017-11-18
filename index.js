// Config
var useHttps = false;
var port = (process.env.PORT || 8100);

// imports
var express = require('express')
var app = express();
var fs = require('fs');
var https = require('https');
var http = require('http');
var io = null;
//var ExpressPeerServer = require('./lib/peer').ExpressPeerServer;
var server = null;


if(!useHttps){
  server = http.Server(app);
  //io = require('socket.io')(http);
}
else{
  var privateKey = fs.readFileSync( 'ssl/server.key' );
  var certificate = fs.readFileSync( 'ssl/server.crt' );
  
  server = https.createServer({
      key: privateKey,
      cert: certificate
  }, app);
  //io = require('socket.io')(https);
}

/*
app.use('/peerjs', ExpressPeerServer(server, {
    //debug: true
}));
*/

// static for ui
app.use(express.static(__dirname + '/ui'))



server.listen(port, function(){
  console.log('listening on *:' + port);
});
