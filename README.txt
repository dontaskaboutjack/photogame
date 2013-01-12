Read ME file for SSUI Project 4 - the final project.

In this project, I have a NodeJS server running with SocketIO. To run these, you'll need to drag all of the files into one location, change the __dirname variable in the server.js file, and then run the server.js file from the command line. Then, navigate to localhost port 8000. Open two tabs to get the game started.

This project is almost exactly as I intended from the description I sent earlier:
	
	Name: Picture Game
 
	Description: Up to four people connect to a server and are added to the picture game. In each round of the site generates a phrase that appears on the screen, like “big bear” or “silver wig” – that’s when the clock starts. At this point, people have 20 seconds to go to the internet at large to find the image that best represents that phrase, sort of like how the game Apples to Apples challenges people to judge how funny/serious the group would like to be. Everyone pastes in the link to the image, and when 20 seconds are up, everyone sees everyone else’s images. At this point, there are 10 seconds to vote. Once the voting is in, the points are allocated to everyone who had their pictures selected, such that people are incentivized to pick the best photo, not just their own. Rounds continue until there are less than two people in the room.
 
	Implementation: The client side code will include the overall interface and will wait for various messages from the server. The server will handle the timing of events, the round structure, etc. Client side will be expected to fetch the picture URL and display it. I will use jQuery to make changes to the DOM on the client side. I will use one of the UI tools (likely bootstrap) to put together the interface. I will use NodeJS to make the server and handle all of the socket communication.

The game has 3 states which it cycles through, and a fourth which is a holding place for when there are not enough people to play the game. When a new person joins, the server gets their information and waits. Once a second person joins, the game is on. The server lets everyone know who is in the room, so a copy of the client information is on hand within each client. Then, the server emits what state the game is in when that stage changes. The clients respond and the server responds to their responses. Points are allocated to those clients who submitted images which were accepted by other clients.

What I learned / What to Note:
 -The only difference from the project proposal is that within the point allocation, users are not disincentivized from selecting their own photo.
 -JQuery was more complicated to manipulate than I expected; I am not using it efficiently
 -Twitter Bootstrap was less helpful than I expected; this is not the sort of site that bootstrap was meant to help build
 -I learned about how finecky server / client communication can be
 -Also, because javascript is asynchronous, there was some delicate dancing around timing issues with the setInterval and clearInterval functions