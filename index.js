// Config
var useHttps = false;
var port = (process.env.PORT || 8100);

// imports
var express = require('express')
var app = express();
var fs = require('fs');
var https = require('https');
var http = require('http');
var ExpressPeerServer = require('./lib/peer/lib/index').ExpressPeerServer;
var server = null;


if(!useHttps){
  server = http.Server(app);
}
else{
  var privateKey = fs.readFileSync( 'ssl/server.key' );
  var certificate = fs.readFileSync( 'ssl/server.crt' );
  
  server = https.createServer({
      key: privateKey,
      cert: certificate
  }, app);
}


app.use('/peerjs', ExpressPeerServer(server, {
    debug: true
}));


// static for ui
app.use(express.static(__dirname + '/ui'))



server.listen(port, function(){
  console.log('listening on *:' + port);
});
