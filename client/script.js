window.onload = function() {
    let username = null;
    let gameId = null;
    let playerColor = null; // 0 for black, 1 for white

    // Register button click event handler
    document.getElementById('registerButton').addEventListener('click', function() {
        fetch('http://localhost:11000/register', { method: 'GET', mode: 'cors' })
            .then(response => response.text())
            .then(data => {
                username = data.split(": ")[1];
                console.log("Successful registration, Username: " + username);
            });
    });

// Pair button click event handler
    document.getElementById('pairButton').onclick = function() {
        fetch(`http://localhost:11000/pairme?player=${username}`, { method: 'GET', mode: 'cors' })
            .then(response => response.text())
            .then(data => {
                gameId = data.split("Game ID: ")[1];
                console.log("Successful pairing, Game ID: " + gameId);
                // Assuming the first player paired is always black
                playerColor = data.includes("Player1") ? 0 : 1;
                console.log(playerColor);
            });
    }

// Quit button click event handler
    document.getElementById('quitButton').onclick = function() {
        fetch(`http://localhost:11000/quit?player=${username}&id=${gameId}`, { method: 'GET', mode: 'cors' })
            .then(response => response.text())
            .then(data => {
                console.log(data);
                username = null;
                gameId = null;
            });
    }

// Move button click event handler
    document.getElementById('moveButton').onclick = function() {
        fetch(`http://localhost:11000/theirmove?player=${username}&id=${gameId}`, { method: 'GET', mode: 'cors' })
            .then(response => response.text())
            .then(data => {
                console.log("Opponent's move: " + data);
                var opponentPosition = convertMoveToPosition(data);
                updateBoard(opponentPosition, playerColor === 0);
            });
    }

    var Screen = {
        documentWidth: 500,
        containerWidth: 400, // Default container width
        cellWidth: 20 // Cell width
    }

// Adjust screen dimensions if necessary
    if (document.documentElement.clientWidth < 500) {
        Screen.documentWidth = document.documentElement.clientWidth;
        Screen.containerWidth = Screen.documentWidth * 0.8;
        Screen.cellWidth = Screen.containerWidth * 0.05;
    }

// Constants
    var reg = /\d{1,2}/g;
    var white = []; // Stores white pieces
    var black = []; // Stores black pieces
    var Color = false; // Indicates whether it's black's turn (false) or white's turn (true)
    var notOver = true; // Indicates if the game is not over
    var tips = "welcome"; // Move prompt
    var count = 0; // Number of connected pieces
    var Blackwin = false; // Indicates if black wins
    var Whitewin = false; // Indicates if white wins
    var yCan = []; // Array to store elements in the same vertical line
    var xCan = []; // Array to store elements in the same horizontal line
    var xyCan = []; // Array to store elements in the same positive diagonal line
    var yxCan = []; // Array to store elements in the same negative diagonal line

// Timer to check for victory
    var time = setInterval(function() {
        if (Blackwin) {
            tips = "Player 2 wins";
            document.getElementsByTagName("span")[0].innerText = tips;
            for (var i = 0; i < document.getElementsByClassName("pieceBox").length; i++) {
                document.getElementsByClassName("pieceBox")[i].onclick = null;
            }
            clearInterval(time);
        }
        if (Whitewin) {
            tips = "Player 1 wins";
            document.getElementsByTagName("span")[0].innerText = tips;
            for (var i = 0; i < document.getElementsByClassName("pieceBox").length; i++) {
                document.getElementsByClassName("pieceBox")[i].onclick = null;
            }
            clearInterval(time);
        }
    }, 100);

    newGame();
    function newGame() {
        if (document.getElementsByTagName("table").length) {
            for (var i = 0; i < document.getElementsByTagName("table").length; i++) {
                document.getElementsByTagName("table")[i].remove();
            }
        }
        // Initialize the following
        bgInit();
        pieceInit();
        spanFn();
        white = [];
        black = [];
        Color = false;
        notOver = true;
        tips = "welcome";
        count = 0;
        Blackwin = false;
        xCan = [];
        yCan = [];
        xyCan = [];
        yxCan = [];
    }

    //Judge victory
    function victory(target, c) {
        if (target.length >= 5) {
            for (var m = 0; m < target.length; m++) {
                for (var n = 0; n < target.length; n++) {
                    if (target[n][0] == target[m][0]) {
                        xCan.push(target[n]);//Put the same y values into xCan
                    }
                }
                xWin(xCan, c);
                xCan = [];
            }
            for (var i = 0; i < target.length; i++) {
                for (var j = 0; j < target.length; j++) {
                    if (target[j][1] == target[i][1]) {
                        yCan.push(target[j]);//Put the same value as x into the array yCan
                    }
                }
                yWin(yCan, c);
                yCan = [];
            }
            for (var a = 0; a < target.length; a++) {
                for (var b = 0; b < target.length; b++) {
                    if (parseInt(target[b][0]) + parseInt(target[b][1]) == parseInt(target[a][0]) + parseInt(target[a][1])) {
                        xyCan.push(target[b])
                    }
                }
                yWin(xyCan, c);
                xyCan = [];
            }
            for (var v = 0; v < target.length; v++) {
                for (var w = 0; w < target.length; w++) {
                    if (parseInt(target[w][0]) - parseInt(target[w][1]) == parseInt(target[v][0]) - parseInt(target[v][1])) {
                        yxCan.push(target[w])
                    }
                }
                xWin(yxCan, c);
                yxCan = [];
            }
        }
    }
    function xWin(xCan, c) {
        var sortArray = [];
        for (var i = 0; i < xCan.length; i++) {
            sortArray.push(xCan[i][1]);
        }
        sortArray.sort(function (x, y) {
            return x - y;
        });
        for (var j = 0; j < sortArray.length; j++) {
            if (sortArray[j + 1]) {
                if (parseInt(sortArray[j]) + 1 == parseInt(sortArray[j + 1])) {
                    count++;
                    if (count == 4 && c == 0) {
                        Blackwin = true;
                        notOver = false;
                        return;
                    } else if (count == 4 && c == 1) {
                        Whitewin = true;
                        notOver = false;
                        return;
                    }
                } else {
                    count = 0;
                }
            }
        }
        count = 0;
    }
    function yWin(yCan, c) {
        var sortArray = [];
        for (var i = 0; i < yCan.length; i++) {
            sortArray.push(yCan[i][0]);
        }
        sortArray.sort(function (x, y) {
            return x - y;
        });
        for (var j = 0; j < sortArray.length; j++) {
            if (sortArray[j + 1]) {
                if (parseInt(sortArray[j]) + 1 == parseInt(sortArray[j + 1])) {
                    count++;
                    if (count == 4 && c == 0) {
                        Blackwin = true;
                        notOver = false;
                        return;
                    } else if (count == 4 && c == 1) {
                        Whitewin = true;
                        notOver = false;
                        return;
                    }
                } else {
                    count = 0;
                }
            }
        }
        count = 0;
    }
    function spanFn() {
        var span = document.createElement("span");
        document.body.insertBefore(span, document.getElementsByTagName("script")[0]);
        span.innerText = tips;
    }

    // Checkerboard initialization
    function bgInit() {
        var table = document.createElement("table");
        table.className = "box"
        table.style = "position: absolute; top: 0; left:50%; margin-left:-" + (Screen.containerWidth + 42) / 2 + "px";
        for (var y = 0; y < 20; y++) {
            var tr = document.createElement("tr");
            for (var x = 0; x < 20; x++) {
                var td = "<td class='box-" + y + "-" + x + "' style='width: " + Screen.cellWidth + "px; height: " + Screen.cellWidth + "px; border: 1px solid #9c9c9c'></td>";
                tr.innerHTML += td;
            }
            table.appendChild(tr);
        }
        document.body.insertBefore(table, document.getElementsByTagName("script")[0]);
    }
    // Chess piece initialization
    function pieceInit() {
        var table = document.createElement("table");
        table.className = "piece"
        table.style = "position: absolute; top: 0; left:50%; margin-left:-" + (Screen.containerWidth + 42) / 2 + "px";
        for (var y = 0; y < 20; y++) {
            var tr = document.createElement("tr");
            for (var x = 0; x < 20; x++) {
                var td = "<td class='piece-" + y + "-" + x + " pieceBox' style='width: " + Screen.cellWidth + "px; height: " + Screen.cellWidth + "px;border:1px solid transparent;border-radius: 50%;'></td>";
                tr.innerHTML += td;
            }
            table.appendChild(tr);
        }
        document.body.insertBefore(table, document.getElementsByTagName("script")[0]);
    }

    //Click on the board to play chess
    var pieceBoxes = document.getElementsByClassName("pieceBox");
    var first = 0;
    for (var i = 0; i < pieceBoxes.length; i++) {
        pieceBoxes[i].onclick = function() {
            var position;
            var move;
            if (playerColor == 0) {
                this.style.backgroundColor = "#000"; // black
                Color = 1;
                black.push(this.className.match(reg));
                victory(black, 0); //Judge whether Black wins or not
                position = this.className.match(reg);
                move = `Player moved to position (${position[0]},${position[1]})`;
            } else {
                this.style.backgroundColor = "#fff"; // white
                Color = 0;
                white.push(this.className.match(reg));
                victory(white, 1); //Judge whether White wins or not
                position = this.className.match(reg);
                move = `Player moved to position (${position[0]},${position[1]})`;
            }
            console.log(move);
            this.onclick = null; // Click and cancel the click event
            if (playerColor == 0 && first == 0){
                fetch(`http://localhost:11000/mymove?player=${username}&id=${gameId}&move=${move}`, { method: 'GET', mode: 'cors' })
                    .then(response => response.text())
                    .then(data => {
                        console.log(data);
                    });
                first = 9999;
            }
            else{
                // Send location information to the server
                fetch(`http://localhost:11000/mymove?player=${username}&id=${gameId}&move=${move}`, { method: 'GET', mode: 'cors' })
                    .then(response => response.text())
                    .then(data => {
                        console.log(data);
                    });
                first = 9999;
            }
        }
    }
    function convertMoveToPosition(move) {
        var result = move.match(/\((\d+),(\d+)\)/);
        if (result && result.length >= 3) {
            var position = [parseInt(result[1]), parseInt(result[2])];
            return position;
        } else {
            console.error(`Invalid move format: ${move}`);
            return [null, null];
        }
    }

    // Update the board
    function updateBoard(position, isBlack) {
        var piece = document.querySelector(`.piece-${position[0]}-${position[1]}`);
        if (piece) {
            if (isBlack) {
                piece.style.backgroundColor = "#fff"; // white
                white.push(piece.className.match(reg));
                victory(white, 1); //Judge whether White wins or not

            } else {
                piece.style.backgroundColor = "#000"; // black
                black.push(piece.className.match(reg));
                victory(black, 0); //Judge whether Black wins or not
            }
        } else {
            console.error('No piece found at position');
        }
    }
};