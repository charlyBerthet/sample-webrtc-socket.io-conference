var socket = io();
var remoteVideo = document.querySelector('#remoteVideo');
var localVideo = document.querySelector('#localVideo');
var stateDiv = document.querySelector("#state");
stateDiv.style.display = 'block';

var room  = prompt('room');
var username  = prompt('username');
var localStream = null;


var configuration = { 
    "iceServers": [{ 'url': 'stun:stun.l.google.com:19302' }]
}; 
var listenerPc = null;

var casterPcs = [];


socket.emit('join', {room: room, username:username});


socket.on('start-casting', () => {
    stateDiv.innerHTML = "You are the caster";
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      })
      .then(stream => {
            localVideo.src = window.URL.createObjectURL(stream); 
            localStream = stream;
            console.log('getUserMedia', localStream, casterPcs);
            socket.emit('stream-ready');
      })
      .catch(function(e) {
        console.log('getUserMedia() error: ', e);
      });
})



socket.on('connect-to', username => {
    console.log('connect-to', username, localStream);
    casterPcs[username] = {
        connection : new RTCPeerConnection(configuration),
        isStreamAdded : false
    };
    var pc = casterPcs[username];
    tryAddStream(pc);
    createOffer(pc, username);
})

function tryAddStream(pc){
    console.log('tryAddStream', localStream, pc);
    if(localStream != null && !pc.isStreamAdded){
        pc.connection.addStream(localStream);
        pc.isStreamAdded = true;
    }
}

function createOffer(pc, username){
    pc.connection.createOffer(function (offer) { 
        socket.emit('offer', {offer:offer, username: username});
        pc.connection.setLocalDescription(offer);   
    },function (error) { 
        alert("Error when creating an offer"); 
        console.log(error);
    });
};


socket.on('offer', offer => {
    console.log('offer', offer);
    listenerPc.setRemoteDescription(new RTCSessionDescription(offer));
	
    //create an answer to an offer 
    listenerPc.createAnswer(function (answer) { 
        console.log('send answer', answer);
        listenerPc.setLocalDescription(answer); 
        socket.emit('answer', {answer:answer, username:username});
    }, function (error) { 
      alert("Error when creating an answer"); 
      console.log(error);
    }); 
});


socket.on('answer', data => {
    console.log('answer', data);
    if(casterPcs[data.username]){
        console.log("anwser > setRemoteDescription", casterPcs[data.username]);
        casterPcs[data.username].connection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
});

socket.on('candidate', data => {
    console.log('candidate', data);
    if(casterPcs[data.username]){
        console.log('add candidate', data);
        casterPcs[data.username].connection.addIceCandidate(new RTCIceCandidate(data.candidate)); 
    }
});


socket.on('mentor-hangup', () => {
    console.log('mentor-hangup');
    listenerPc.close();
    listenerPc = new RTCPeerConnection(configuration);
    stateDiv.style.display = 'block';
    resetListenerPc();
    console.log('Mentor leave');
});
socket.on('listener-hangup', username => {
    console.log('listener-hangup');
    if(casterPcs[username]){
        casterPcs[username].connection.close();
        delete casterPcs[username];
    }
    console.log(username + ' leave');
});


socket.on('caster-full', () => {
    state.innerHTML = "Sorry, somebody is already casting on this room.";
})


function resetListenerPc(){
    listenerPc = new RTCPeerConnection(configuration);
    listenerPc.onaddstream = function (e) { 
        console.log('onaddstream', e);
        stateDiv.style.display = 'none';
        remoteVideo.src = window.URL.createObjectURL(e.stream); 
    };
    listenerPc.onicecandidate = function (event) {
        console.log('onicecandidate', event);
        if (event.candidate) { 
            socket.emit('candidate', {candidate:event.candidate, username:username});
        } 
    };    
};
resetListenerPc();