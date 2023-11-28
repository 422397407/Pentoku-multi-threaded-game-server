For server:
Drag server-kcui996 into Visual Studio to open it After running the server, open two command prompt windows and 
enter "telnet localhost 11000" in each window. 

Perform the following HTTP command tests in the two windows: 
GET /register HTTP/1.1 
GET /pairme?player={username} HTTP/1.1 
GET /mymove?player={username}&id={gameId}&move={move} HTTP/1.1 
GET /theirmove?player={username}&id={gameId} HTTP/1.1 
GET /quit?player={username}&id={gameId} HTTP/1.1


For Client:
First, run the server through Visual Studio, then the client.
Open two browsers, such as Edge and Google Chrome. Each browser represents a player.
Click the "Register" button and the "Match" button in the two browsers respectively. You can see the output in the web console.
In the game, 0 represents player 1 with black pieces and 1 represents player 2 with white pieces.
Players can click on positions on the board to move.
The black pieces move first, and before each move, the "checkmove" button needs to be clicked to retrieve the other player's moves
(I didn't implement a real-time response to have other players receive and display a move as soon as one player moves)