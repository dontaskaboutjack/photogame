//MAKE SURE THAT THE PORT IS CORRECT  - APP.LISTEN(XXXX)


/*
Global Variables Used By Server
*/
var stateArrayPos = 0; //Establishes the states that the server can be in
var stateArray = ["ImgRecon","ImgReveal","PointTally","NotEnoughClients"]; //The server states
var currentState = "NotEnoughClients"; //The default state for when the first person joins is that there are not enough people to play
var time = 0; //A timer keeps track of game progress and advancement

var clientIDsArray = []; //holds the array of userIDs
var socketGeneratedIDArray = []; //holds the array of socketIDs

var roundEntriesArray = []; //helps to keep track of who submitted what image. It holds the array of image URLs and the sockets which they came from
var roundEntriesSent = false; //this variable helps to make sure that the round entries are only sent once
var roundEntrySendingInterval = function(){}; // this function will be a setInterval function is that defined later

var socketsOfSelectedImagesArray = []; //holds the socket IDs of the players who's images were selected
var socketsAndPointsArray = []; // holds objects that contain the socket ids and the points for that socket

var tempStrings = ["euro","platypus face","10 cat","yolo", "mafioso", "hansen", "4chan"]



//Variables required for socket.io and node.js
var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	fs = require('fs'),
	path = require('path')

//added according to http://stackoverflow.com/questions/7503632/node-js-port-issue-on-heroku-cedar-stack
var port = process.env.PORT || 3000;
app.listen(port);

//added according to https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku and http://stackoverflow.com/questions/6223867/can-i-set-up-socket-io-chat-on-heroku
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

var __dirname = 'C://Users//Jack Benjamin//Documents//Carnegie-Mellon MHCII//SSUI//Final Project';

//this handler function can be moved up to the app line
function handler (req, res) {

	//console.log('request starting...');
     
    var filePath = '.' + req.url;
    if (filePath == './')
        filePath = '/index.html';

    if (filePath.substring(0,2) == './') {
    	filePath = filePath.replace("./","/")
    }
         
    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }

	fs.readFile(__dirname + filePath,
		function (err, data) {
			if (err) {
				console.log(err);
				res.writeHead(500);
				return res.end('Error loading index.html');
			}
			res.writeHead(200, {'Content-Type': contentType });
			res.end(data);
		});
}



//helps to update the state based upon the time. cycles through stateArray.
setInterval(function(){
	time++;

	//if you're in state 1 or 2, then just push to the next state and tell everyone
	if (time ==30 && (currentState == "ImgRecon" || currentState == "ImgReveal") ){
		stateArrayPos++;
		currentState=stateArray[stateArrayPos];
		io.sockets.emit('updateState',currentState);
		executeState(currentState);
		time-=30;
	}

	//if you're in state 3, go back to the beginning of the array
	else if (time == 10 && currentState == "PointTally") {
		stateArrayPos=0;
		currentState=stateArray[stateArrayPos];
		io.sockets.emit('updateState',currentState);
		executeState(currentState);
		time = 0;
		roundEntriesSent = false;
		roundEntriesArray = [];
	}
	},1000)

setInterval(function(){
	console.log("the current state is ",currentState," and the current time is ",time)
},2500)


//when a person connects, request their userID
io.sockets.on('connection', function (socket) {
	
	socket.on('setUserID', function (userID) { // when someone connects
		socket.set('userID', userID, function () { //set their userID to the socket, and only then
			socket.emit('userAndSocketID',userID, socket.id); //tell them their userID back, this lets client set their own copy of the user id
			io.sockets.emit('newUserAndSocketJoined', userID, socket.id) //tell everyone that someone new joined. this lets previously connected clients update their copy of clientIDsArray with the new person
			
			
			socketAndPointsItem = {
				socketID: socket.id,
				points: 0
			}
			socketsAndPointsArray.push(socketAndPointsItem);

			//if there's only one person connected
			if(clientIDsArray.length == 0) {
				socket.emit("updateState",currentState); // tell him that he's the only one
				//console.log("the clientIDsArray length is ", clientIDsArray.length, " and the currentState is ", currentState);
			}

			//if two people are connected, the game play can start
			if(clientIDsArray.length == 1){
				io.sockets.emit('joinedAndPlayingIsTrue'); //used for tracing when clients can join a round
				socket.emit("ConnectedClients", clientIDsArray, socketGeneratedIDArray); //tell them the list of clients who are connected so they can draw all people previously there
				time = 0;
				currentState = stateArray[0];
				//console.log("this game is about to start and the currentState is ",currentState)
				io.sockets.emit("updateState",currentState)
				emitString();
			}

			//if there are more than two people playing, just let them know who's there and what state the game is in
			if(clientIDsArray.length > 1) {
				socket.emit("ConnectedClients", clientIDsArray, socketGeneratedIDArray); //tell them the list of clients who are connected so they can draw all people previously there
				socket.emit("updateState",currentState);
			}
			clientIDsArray.push(userID); //update the server's copy of connected clients
			//console.log(clientIDsArray)
			socketGeneratedIDArray.push(socket.id);//update the server's copy of the connected clients' socketIDs
			
		})
	})

	//what to do when a client leaves
	socket.on('disconnect', function () {
		//get the userID from the socket and tell everyone 		
 		socket.get('userID', function (err, userID) {
 			disconnectedUser = userID;
 			io.sockets.emit('userLeft',disconnectedUser, socket.id);
 			//console.log("the user ", disconnectedUser, " has disconnected");
 		})

		//splice that userID out of the clientIDsArray array THESE THREE CAN BE COMBINED
		removeClientID(disconnectedUser);
		removeSocketID(socket.id);
		removeSocketAndPointsEntry(socket.id);
	
		//if there is one user, emit that there's only one user and go to the NotEnoughClientsState
		if(clientIDsArray.length == 1) {
			currentState = "NotEnoughClients"
			io.sockets.emit("updateState",currentState);
			io.sockets.emit("joinedAndPlayingIsFalse");
			setTimeout(function(){console.log("there's ", clientIDsArray.length, " client(s) and the currentState is ", currentState, " and the time is ",time)},5000);
		}

		//if there are zero users, go to the NotEnoughClientsState
		else if (clientIDsArray.length == 0) {
			currentState = "NotEnoughClients"
		}

		//may need to delete the socket, perhaps with delete[clients.id] 
		//http://stackoverflow.com/questions/9918203/remove-objects-on-disconnect-socket-io
	});

	
	//this checks if a URL that is coming in is an image and if so, it pushes it onto the array of URLs
	//it would be nice if this also checked to see if the image was real.
	socket.on("entry", function (imageEntry){

		if(checkURLExtension(imageEntry.URL)){
			roundEntriesArray.push(imageEntry);
		}
		else {
			imageEntry.URL = ""
			roundEntriesArray.push(imageEntry)
		}
		//console.log(imageEntry)
		//console.log(roundEntriesArray)
	})

	//this handles when a client sends to the server the image he would like to give points to
	socket.on('imageSelection',function (socketOfSelectedImage){
		console.log(socketOfSelectedImage)
		if(socketOfSelectedImage==null){return}
		socketsOfSelectedImagesArray.push(socketOfSelectedImage);
	})

});

function checkURLExtension(url) {
    return(url.match(/\.(jpeg|jpg|gif|png)$/) != null);
}

function removeClientID(userID){
	for (i=0;i<clientIDsArray.length;i++){
		if (userID == clientIDsArray[i]) {
			clientIDsArray.splice(i,1);
			//console.log('the new array of clients is ', clientIDsArray);
		}
	}
}

function removeSocketID(socketID){
	for (i=0;i<socketGeneratedIDArray.length;i++){
		if (socketID == socketGeneratedIDArray[i]) {
			socketGeneratedIDArray.splice(i,1);
			//console.log('the new array of socketIDs is ', socketGeneratedIDArray);
		}
	}
}

function removeSocketAndPointsEntry(socketIDToRemove) {
	for (i=0;i<socketsAndPointsArray.length;i++){
		if (socketIDToRemove == socketsAndPointsArray[i].socketID) {
			socketGeneratedIDArray.splice(i,1);
		}
	}
}

//This is the main function for handling the execution of the current state
function executeState(currentState) {
	if (currentState == "ImgRecon") {
		console.log("there are ", clientIDsArray.length, " clients connected" );
		setTimeout(function() {emitString();},500); //give a brief timeout so that all clients who can join set their statuses properly
		socketsOfSelectedImagesArray = []; //reset this array so no one is unfairly allocated points later on
	}

	if (currentState == "ImgReveal"){
		console.log('entering the executeState function with ImgReveal')
		var roundEntrySendingInterval = setInterval( function(){ //needed to use an interval here to be able to keep attempting to send until it was actually sent.
			if (roundEntriesSent == false) {
				sendRoundEntries();
			}
			else {
				clearInterval(roundEntrySendingInterval);
			}
		}, 500);	
	}

	if (currentState == "PointTally"){
		//wait for a second to make sure that we have received all of the selections
		//for every item in the winning socket array, allocate points to those people based on some rules
		console.log("socketsOfSelectedImagesArray is ", socketsOfSelectedImagesArray);
		console.log("socketsAndPointsArray is ", socketsAndPointsArray);
		setTimeout(function (){ //waiting a second to count and send out the new points so that everyone is tallied.
			for (i=0;i<socketsOfSelectedImagesArray.length;i++){
				for (j=0;j<socketsAndPointsArray.length;j++){
					if(socketsOfSelectedImagesArray[i] == socketsAndPointsArray[j].socketID){
						socketsAndPointsArray[j].points = socketsAndPointsArray[j].points + 5;
						console.log('updating points')
					}
				}
			}
			io.sockets.emit('newPoints',socketsAndPointsArray);
		},1000)
			}
}

function emitString(){
	stringToEmit = tempStrings[Math.round((tempStrings.length-1)*Math.random())]
	console.log("the string that will be sent out is ",stringToEmit);
	console.log("there are ", clientIDsArray.length, " clients connected" );
	io.sockets.emit("stringToFind",stringToEmit);
}

function sendRoundEntries() {
	console.log("entering sendRoundEntries");
	console.log(roundEntriesSent);
	if(roundEntriesSent == false){
		io.sockets.emit('roundEntries', roundEntriesArray);
		roundEntriesSent = true;
	}
	else{return}
}

