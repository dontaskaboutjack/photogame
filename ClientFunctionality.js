//MAKE SURE THAT THE IO.CONNECT FOR THE CLIENT IS CONNECTING TO THE CORRECT IP - var socket = io.connect("http://127.0.0.1");

/*
Global Variables Used By Clients
*/
var socket = io.connect("http://127.0.0.1");
var user_id = "";
var socket_id = "";
var clientIDsArray = []; //stores the userIDs of all clients
var socketGeneratedIDArray = []; //stores the socket_ids of all clients
var currentState = "";
var previousState = ""; //used to figure out when its the right time to join a round
var joinedAndPlaying = false; //"boolean" which tracks whether a client is pending to join a round (false) or currently playing (true)
var roundEntriesArray = []; 
var roundEntriesReceived = false;
var roundEntryReceivingInterval = function (){} //this will eventually be assigned to a function that will be called on an interval
var socketOfSelectedImage; //this represents the socket_id of the user who this user has selected
var previousSocketOfSelectedImage; //this is used to track which clientDiv to highlight

//on connection to the server, collect their userID
socket.on('connect', function () {
	socket.emit('setUserID', prompt('What is your user ID?'))
});

//this only gets called for this client, that's why it needs to be kept separate from newUserAndSocketJoined
socket.on('userAndSocketID', function (userID, socketID){
	user_id = userID;
	socket_id = socketID
	//console.log('your user_id has been set to ', user_id);
	//console.log('FYI, your socket_id is ', socket_id);
});

//this gets emitted to everyone when someone new joins. This client will receive the message also, and will use it to draw the clientDiv.
//This function adds the userID and socketID to this client's copy of that information and then draws the clientDivs for the new person
socket.on('newUserAndSocketJoined',function (userID, socketID) {
	clientIDsArray.push(userID);
	console.log("new user ", userID," joined the game!")
	socketGeneratedIDArray.push(socketID);
	//console.log("new socket ", socketID," joined the game!")
	if(socket_id == socketID){
		console.log('drawing your clientDiv')
		addClient(user_id, socket_id, "reveal");
	}
	else {addClient(userID, socketID, "grey");}
})

//this gets emitted just to the socket which is joining so they know who else is currently in the room.
//the function lets the user append their information about who's also online and then draw all appropriate clientDivs
socket.on('ConnectedClients', function (arrayOfClients, arrayOfSocketIDs){

	// console.log("arrayOfClients is " + arrayOfClients);
	// console.log("arrayOfSocketIDs is " + arrayOfSocketIDs);
	// //the arrays will already have their user_id and socket_id, so these values need to be removed
	// for(i=0;i<arrayOfClients.length;i++){
	// 	if(user_id == arrayOfClients[i]){
	// 		arrayOfClients.splice(i,1);
	// 	}
	// }
	// //the arrays will already have their user_id and socket_id, so these values need to be removed
	// for(j=0;j<arrayOfSocketIDs.length;j++){
	// 	if(socket_id == arrayOfSocketIDs[j]){
	// 		arrayOfSocketIDs.splice(j,1);
	// 	}
	// }

	//the copies of the two arrays should be == the servers with my own data appended at the end
	//traverse the array of socket IDs and then check to see if the Dom has something by that element by ID 
	//if you cant find it, then draw it	
	console.log("clientIDsArray is " + clientIDsArray);
	console.log("socketGeneratedIDArray is " + socketGeneratedIDArray);

	clientIDsArray = arrayOfClients;
	clientIDsArray.push(user_id);
	socketGeneratedIDArray = arrayOfSocketIDs;
	socketGeneratedIDArray.push(socket_id);

	console.log("clientIDsArray is " + clientIDsArray);
	console.log("socketGeneratedIDArray is " + socketGeneratedIDArray);
	for (var k=0;k<socketGeneratedIDArray.length;k++)
	{
		if ($('#clientDiv_' + socketGeneratedIDArray[k]).length == 0) {
			console.log("adding client " + clientIDsArray[k]);
			addClient(clientIDsArray[k], socketGeneratedIDArray[k],"grey");
		}
		else {console.log($('#clientDiv_' + socketGeneratedIDArray[k]))};
	}


//	console.log("clientIDsArray is " + clientIDsArray);
	//console.log("socketGeneratedIDArray is " + socketGeneratedIDArray);
	// clientIDsArray = clientIDsArray.concat(arrayOfClients);
	// socketGeneratedIDArray = socketGeneratedIDArray.concat(arrayOfSocketIDs);
	// console.log("clientIDsArray is " + clientIDsArray);
	// console.log("socketGeneratedIDArray is " + socketGeneratedIDArray);


	// for (var k=0;k<socketGeneratedIDArray.length;k++){
	// 	if(socket_id != socketGeneratedIDArray[k]){
	// 		//console.log('drawing the clientDiv for '+socketGeneratedIDArray[i])
	// 		addClient(clientIDsArray[k], socketGeneratedIDArray[k],"grey")
	// 	}
	// }
})

//the first two players need to have this value set manually so the game will start
socket.on('joinedAndPlayingIsTrue', function(){
	joinedAndPlaying = true;
	console.log("setting joinedAndPlayingIsTrue");
})

//the final player left needs to have this set manually so that the game will hold until more user arrive
socket.on('joinedAndPlayingIsFalse', function(){
	joinedAndPlaying = false;
	console.log("setting joinedAndPlayingIsFalse");
})

//this is the primary function for handling gameplay
//the main parameter is the current state which the server / game is in
//based on what state the game is currently in, the function determines which actions to execute
socket.on("updateState", function(currentStateReceived) {
	//console.log("just got and updateState and the currentState is ", currentState)
	console.log(currentState)
	currentState = currentStateReceived
	console.log(currentState)
	//this only happens if you're the third or further person, so you can wait to join at the appropriate time
	//basically it makes you sit through a round if you join at the wrong time
	if(previousState == "PointTally" && currentState == "ImgRecon") {
		joinedAndPlaying = true;
	}

	//this only happens if you're the first person and there's no one else there
	if (currentState == "NotEnoughClients") {
		$('#gameState').text("You're the only one playing right now")
		$('#stringDiv').remove();
		changeMyClientDiv("grey");
		return;

	}

	//play the game if you've been allowed entrance
	if (joinedAndPlaying) {playGame(currentState);}
	
	//used to check when the correct time to enter a round is
	previousState = currentState;
});

//This is the secondary function to handle game play. If there is a state which needs to be executed, this function handles it.
function playGame (currentState){

	//ImgRecon is the time to look for images based on the string
	//this portion also resets some variables so they are not carried over to later rounds
	if (currentState == "ImgRecon") {
		$('#gameState').text("Find the best image corresponding to")
		changeMyClientDiv("submit");
		changeOtherClientDivs("grey");
		socketOfSelectedImage = ""
		previousSocketOfSelectedImage = ""
	}

	//during ImgReveal, the clients send their URLs to the server; the server concatenates all of these and then sends back to the clients
	if (currentState == "ImgReveal") {
		//pull the url from your clientDiv and submit that and your socketID to the server as a JSON object
		imageURL = $("#newClientDivImgSubmitInput_" + socket_id).val()
		imageEntry = {
			socketID : socket_id,
			URL : imageURL
		}
		console.log(imageEntry);
		socket.emit('entry',imageEntry);

		roundEntryReceivingInterval = setInterval(function(){setImageURLs();},100)

	}

	//In the PointTally state, the clients send their selections to the server. The server computes who should get points and then sends ount the new points
	if (currentState == "PointTally") {
		socket.emit('imageSelection',socketOfSelectedImage)
		console.log("the socketOfSelectedImage is ",socketOfSelectedImage);
		$('#gameState').text("We have a winner!")
		for(i=0;i<$(".clientDiv").length;i++){
			$(".clientDiv")[i].style.backgroundColor = "white";
		}
		$('#stringDiv').remove()
		roundEntriesReceived = false;
	}
}

//This function sets the image HTML element src attribute for the correct socket_id.
function setImageURLs() {

	//first, in the case that someone does not submit an actual image, set their image to this instead
	for (k=0;k<roundEntriesArray.length;k++){
		if(roundEntriesArray[k].URL == ""){
			roundEntriesArray[k].URL = "http://cdn.memegenerator.net/instances/400x/30856134.jpg"
		}
	}

	//only do this if the client has actually received the image urls and sockets for this round
	if (roundEntriesReceived == true) {
		//console.log("in setImageURLs and roundEntriesReceived = true");

		//for every urlsubmit thing
		for (i=0;i<$(".reveal").length;i++){
			//for every socket in the array
			for (j=0;j<roundEntriesArray.length;j++){
				//if the socket matches, 
				if($(".reveal")[i].id == "Img_"+roundEntriesArray[j].socketID){
					//set the url
					$(".reveal")[i].src = roundEntriesArray[j].URL
					//NEED TO ALSO SET THE LINK URL
					//$(".reveal")[i].src = roundEntriesArray[j].URL
				}
			}
		}
		$('#gameState').text("Select The Best Image")
		changeMyClientDiv("reveal")
		changeOtherClientDivs("reveal")
	}
}

//This function handles receiving round entries by setting the global variable for later reference
socket.on('roundEntries', function (roundEntries){
	console.log(roundEntries);
	roundEntriesArray = [];
	roundEntriesArray = roundEntries;
	roundEntriesReceived = true;
})


//this function updates all of the points of the current users
socket.on('newPoints',function (socketAndPointsArray){
	//go through each of the ids that are the points ones
	for (i=0;i<socketAndPointsArray.length;i++){
		for(j=0;j<$(".points").length;j++) {
			if(socketAndPointsArray[i].socketID == $(".points")[j].id.substring(7)){
				$(".points")[j].innerText = socketAndPointsArray[i].points
			}
		}
	}
})

//Within the clientDiv, there are three parts in one section, only one of which is shown at a given time.
//This function changes which of those sections is shown
function changeMyClientDiv (divSectionToShow) {
	$("#clientDiv_" + socket_id + " .submit")[0].style.display = "none"
	$("#clientDiv_" + socket_id + " .reveal")[0].style.display = "none"
	$("#clientDiv_" + socket_id + " .grey")[0].style.display = "none"
	if(divSectionToShow == "grey") {$("#clientDiv_" + socket_id + " ." + divSectionToShow)[0].style.display = "block"}
	else {$("#clientDiv_" + socket_id + " ." + divSectionToShow)[0].style.display = "inline"}
}

//this function changes which of those three sections is shown for everyone else who is playing
function changeOtherClientDivs (divSectionToShow) {
	for (i=0;i<socketGeneratedIDArray.length;i++){
		if(socket_id != socketGeneratedIDArray[i]){
			$("#clientDiv_" + socketGeneratedIDArray[i] + " .submit")[0].style.display = "none"
			$("#clientDiv_" + socketGeneratedIDArray[i] + " .reveal")[0].style.display = "none"
			$("#clientDiv_" + socketGeneratedIDArray[i] + " .grey")[0].style.display = "none"
			if (divSectionToShow == "grey") {
				$("#clientDiv_" + socketGeneratedIDArray[i] + " ." +divSectionToShow)[0].style.display = "block"
			}
		 	else {$("#clientDiv_" + socketGeneratedIDArray[i] + " ." +divSectionToShow)[0].style.display = "inline"}
		}
	}
}

//This function handles the event that another user left the room
socket.on('userLeft', function (userToRemove, socketIDToRemove){
	console.log('the user ',userToRemove,' has left');
	console.log('the socket ',socketIDToRemove,' has left');

	//remove from the array of client IDs
	for (var i=0;i<clientIDsArray.length;i++){
		if (userToRemove == clientIDsArray[i]) {
			clientIDsArray.splice(i,1);
		}
	}
	//remove from the array of socket IDs
	for (var i=0;i<socketGeneratedIDArray.length;i++){
		if (socketIDToRemove == socketGeneratedIDArray[i]) {
			socketGeneratedIDArray.splice(i,1);
			//console.log("currently connected array = ",clientIDsArray);
		}
	}
	//remove DOM elements
	for (var j=0; j<$('.clientDiv').length; j++) {
		if ($('.clientDiv')[j].id == "clientDiv_"+socketIDToRemove){
			$($('.clientDiv')[j]).remove()
		}
	}
})

//this function is responsible for changing the DOM when a new phrase to find an image for is received
socket.on('stringToFind', function (string) {
	stringDiv = document.createElement('div');
	stringDiv.id = "stringDiv";
	stringDiv.class = "stringDiv";
	stringDiv.innerText = string;

	if($('#gameState').text() != "") {
		//string div.insertAfter($('#gameState'))
		insertAfter(document.getElementById("gameState"),stringDiv);
	}
})

//function which handles inserting a DOM element after another one. Likely could have been replaced by jquery
function insertAfter(referenceNode, newNode) {
	if(referenceNode.nextSibling != null) {
		    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
	}
	else {referenceNode.parentNode.appendChild(newNode)}
}

//this function handles the creation of a new clientDiv for a particular user in a particular state
function addClient(userID, socket_id, clientDivState) {
	divToAdd = createDivElement(userID, socket_id, clientDivState);
	if (document.getElementsByClassName('clientDiv').length%2 == 0) {
		gameDivLeftColumn.appendChild(divToAdd)
	}
	else {
		gameDivRightColumn.appendChild(divToAdd);
	}
}

//this function is an event handler for clicking on a clientDiv to select it.
//It pulls out the socket_id of the clientDiv that you just clicked on and then changes the color appropriately
function setImgSelection(event) {
	//console.log(event)
	socketOfSelectedImage = event.target.id.substring((event.target.id.indexOf("_")+1))
	if(previousSocketOfSelectedImage != "" && previousSocketOfSelectedImage!=socketOfSelectedImage) {
		$('#clientDiv_'+previousSocketOfSelectedImage)[0].style.backgroundColor = "white";
	}
	//console.log(socketOfSelectedImage);
	$('#clientDiv_'+socketOfSelectedImage)[0].style.backgroundColor = "yellow";
	previousSocketOfSelectedImage = socketOfSelectedImage
}

//this function creates dom elements for all joining clients. 
//anytime this function is called, it is also given a particular state to show.
function createDivElement(userID, socket_id, clientDivState) {
	newClientDiv = document.createElement('div');
	newClientDiv.className+="clientDiv";
	newClientDiv.id="clientDiv_" + socket_id;
	newClientDiv.onclick = function(){if(currentState == "ImgReveal") {setImgSelection(event);}}

	newClientDivNavBar = document.createElement('div');
	newClientDivNavBar.className+="navbar navbar-inverse";
	newClientDivNavBar.id="navBar_"+socket_id;

	newClientDivUsername = document.createElement('div');
	newClientDivUsername.className+="username";
	newClientDivUsername.id="Username_" + socket_id;
	newClientDivUsername.innerText = userID;

	newClientDivPoints = document.createElement('div');
	newClientDivPoints.className+="points";
	newClientDivPoints.id="Points_" + socket_id;
	newClientDivPoints.innerText=0;

	newClientDivTopClear = document.createElement('div');
	newClientDivTopClear.className+="clear";

		newClientDivImgReveal = document.createElement('img');
		newClientDivImgReveal.className+= "reveal";
		newClientDivImgReveal.id = "Img_" + socket_id;
		newClientDivImgReveal.src=""
		newClientDivImgReveal.style.width="100%";
		if(clientDivState != 'reveal') {newClientDivImgReveal.style.display = "none"}

		newClientDivImgSubmit = document.createElement('div');
		newClientDivImgSubmit.className+= "submit";
		newClientDivImgSubmit.id="imgSubmit_"+socket_id;
		if(clientDivState != 'submit') {newClientDivImgSubmit.style.display = "none"};

			newClientDivImgSubmitInput = document.createElement('input');
			newClientDivImgSubmitInput.className += "submitInput";
			newClientDivImgSubmitInput.id = "newClientDivImgSubmitInput_" + socket_id
			newClientDivImgSubmitInput.value = "paste your URL in here"
			newClientDivImgSubmitInput.onclick = function(){document.getElementById("newClientDivImgSubmitInput_" + socket_id).value=""}

		newClientDivImgGrey = document.createElement('div');
		newClientDivImgGrey.className+="grey";
		newClientDivImgGrey.style.backgroundColor = "#f3f3f3"
		newClientDivImgGrey.id = "grey_" + socket_id;
		if(clientDivState != 'grey') {newClientDivImgGrey.style.display = "none"}

	newClientDivBottomNav = document.createElement('div');
	newClientDivBottomNav.className+="navbar navbar-inverse";
	newClientDivBottomNav.id = "bottomNav_" + socket_id;
	newClientDivBottomNav.style.display = "none";

	newClientDivA = document.createElement('a');
	newClientDivA.id="a_" + socket_id;

	newClientDivLink = document.createElement('div');
	newClientDivLink.className+="linkToImage"
	newClientDivLink.id="ImgLink_" + socket_id
	newClientDivLink.innerText = "Link To Photo"

	newClientDivSelect = document.createElement('div');
	newClientDivSelect.className+="select"
	newClientDivSelect.innerText = "Select Photo"
	newClientDivSelect.id = "divSelect_" +socket_id;

	newClientDivBottomClear = document.createElement('div');
	newClientDivBottomClear.className+="clear"

	//piece together the bottom nav bar
	newClientDivA.appendChild(newClientDivLink);
	newClientDivBottomNav.appendChild(newClientDivA);
	newClientDivBottomNav.appendChild(newClientDivSelect);
	newClientDivBottomNav.appendChild(newClientDivBottomClear);

	//piece together the top nav bar
	newClientDivNavBar.appendChild(newClientDivUsername);
	newClientDivNavBar.appendChild(newClientDivPoints);
	newClientDivNavBar.appendChild(newClientDivTopClear);

	//piece togeter the top level components
	newClientDiv.appendChild(newClientDivNavBar);

		newClientDiv.appendChild(newClientDivImgReveal);
		newClientDivImgSubmit.appendChild(newClientDivImgSubmitInput)
		newClientDiv.appendChild(newClientDivImgSubmit);
		newClientDiv.appendChild(newClientDivImgGrey);
	
	newClientDiv.appendChild(newClientDivBottomNav);

	return newClientDiv;
}