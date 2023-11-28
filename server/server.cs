using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

internal class server
{
    private static Dictionary<string, Game> games = new Dictionary<string, Game>();
    private static Dictionary<string, Player> players = new Dictionary<string, Player>();
    private static readonly object gamesLock = new object();
    private static readonly object playersLock = new object();

    static void Main(string[] args)
    {
        int port = 11000;
        IPAddress ip = IPAddress.Any;

        // Create a TCP/IP Socket
        Socket server = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);

        // Bind the Socket to the local IP address and port
        server.Bind(new IPEndPoint(ip, port));

        // The maximum number of client connections is set
        server.Listen(10);

        Console.WriteLine("Server started. Waiting for connections...");

        while (true)
        {
            try
            {
                // The program pauses, waiting for the client to connect
                Socket client = server.Accept();

                // Print the client IP address, port number, and thread ID
                Console.WriteLine("Client connected. IP: " + ((IPEndPoint)client.RemoteEndPoint).Address + ", Port: " + ((IPEndPoint)client.RemoteEndPoint).Port);

                // This client request is handled asynchronously
                ThreadPool.QueueUserWorkItem(HandleClient, client);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Exception: " + ex.Message);
            }
        }
    }

    private static void HandleClient(object state)
    {
        Socket client = (Socket)state;
        try
        {
            // Fetch request data
            byte[] buffer = new byte[1024];
            StringBuilder requestBuilder = new StringBuilder();

            while (true) // A loop has been added to maintain a connection to the client
            {
                int length = client.Receive(buffer);
                string part = Encoding.UTF8.GetString(buffer, 0, length);
                requestBuilder.Append(part);

                // Check whether the request ends (HTTP request ends with a blank line)
                if (part.EndsWith("\r\n"))
                {
                    string request = requestBuilder.ToString();

                    Console.WriteLine("Sent response to IP: " + ((IPEndPoint)client.RemoteEndPoint).Address + ", Port: " + ((IPEndPoint)client.RemoteEndPoint).Port + ", Thread ID: " + Thread.CurrentThread.ManagedThreadId + ". Received request: " + request);

                    // Parse HTTP request
                    HttpRequest httpRequest = HttpRequest.Parse(request);
                    // Processing HTTP requests
                    HttpResponse httpResponse = HandleHttpRequest(httpRequest);
                    // Send the response data to the client
                    byte[] responseBytes = Encoding.UTF8.GetBytes(httpResponse.ToString());
                    client.Send(responseBytes, SocketFlags.None);
                    // Empty the request constructor to prepare the next request
                    requestBuilder.Clear();
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Exception: " + ex.Message);

            // If an exception occurs, close the client connection
            client.Shutdown(SocketShutdown.Both);
            client.Close();
        }
    }


    private static HttpResponse HandleHttpRequest(HttpRequest httpRequest)
    {
        HttpResponse response;
        if (httpRequest.Method == "GET")
        {
            switch (httpRequest.Path)
            {
                case "/register":
                    response = HandleRegister(httpRequest);
                    break;
                case "/pairme":
                    response = HandlePairme(httpRequest);
                    break;
                case "/mymove":
                    response = HandleMymove(httpRequest);
                    break;
                case "/theirmove":
                    response = HandleTheirmove(httpRequest);
                    break;
                case "/quit":
                    response = HandleQuit(httpRequest);
                    break;
                default:
                    response = new HttpResponse(HttpStatusCode.BadRequest, "Invalid path");
                    break;
            }
        }
        else
        {
            response = new HttpResponse(HttpStatusCode.BadRequest, "Invalid method");
        }
        // Add the CORS header to each response
        response.Headers["Access-Control-Allow-Origin"] = "*";
        response.Headers["Access-Control-Allow-Methods"] = "GET";
        response.Headers["Access-Control-Allow-Headers"] = "Content-Type";
        return response;
    }

    // Register
    private static HttpResponse HandleRegister(HttpRequest httpRequest)
    {
        lock (playersLock)
        {
            string username = "Player" + new Random().Next(100, 999);
            Player player = new Player(username);
            players.Add(username, player);
            return new HttpResponse(HttpStatusCode.OK, "Username: " + username);
        }
    }

    // Pair
    private static HttpResponse HandlePairme(HttpRequest httpRequest)
    {
        string username = httpRequest.Query["player"];
        lock (playersLock)
        {
            if (players.ContainsKey(username))
            {
                Player player = players[username];
                lock (gamesLock)
                {
                    Game game = games.Values.FirstOrDefault(g => g.Player2 == null);
                    if (game == null)
                    {
                        game = new Game(player);
                        games.Add(game.Id, game);
                        game.State = "Waiting";
                        return new HttpResponse(HttpStatusCode.OK, $"You are Player1. Waiting for another player. Game ID: {game.Id}");
                    }
                    else
                    {
                        game.Player2 = player;
                        game.State = "Gaming";
                        return new HttpResponse(HttpStatusCode.OK, $"You are Player2. Game started. Game ID: {game.Id}");
                    }
                }
            }
            else
            {
                return new HttpResponse(HttpStatusCode.BadRequest, "Invalid player");
            }
        }
    }

    // Mymove
    private static HttpResponse HandleMymove(HttpRequest httpRequest)
    {
        string username = httpRequest.Query["player"];
        string gameId = httpRequest.Query["id"];
        string move = httpRequest.Query["move"];
        lock (gamesLock)
        {
            if (players.ContainsKey(username) && games.ContainsKey(gameId))
            {
                Game game = games[gameId];
                if (game.Player1.Username == username)
                {
                    game.LastMove1 = move;
                    return new HttpResponse(HttpStatusCode.OK, "Player1 moved. Move accepted");
                }
                else if (game.Player2 != null && game.Player2.Username == username)
                {
                    game.LastMove2 = move;
                    return new HttpResponse(HttpStatusCode.OK, "Player2 moved. Move accepted");
                }
                else
                {
                    return new HttpResponse(HttpStatusCode.BadRequest, "Invalid player");
                }
            }
            else
            {
                return new HttpResponse(HttpStatusCode.BadRequest, "Invalid player or game");
            }
        }
    }

    // Theirmove
    private static HttpResponse HandleTheirmove(HttpRequest httpRequest)
    {
        string username = httpRequest.Query["player"];
        string gameId = httpRequest.Query["id"];
        lock (gamesLock)
        {
            if (players.ContainsKey(username) && games.ContainsKey(gameId))
            {
                Game game = games[gameId];
                if (game.Player1.Username == username)
                {
                    return new HttpResponse(HttpStatusCode.OK, "Player1 move: " + game.LastMove2);
                }
                else if (game.Player2 != null && game.Player2.Username == username)
                {
                    return new HttpResponse(HttpStatusCode.OK, "Player2 move: " + game.LastMove1);
                }
                else
                {
                    return new HttpResponse(HttpStatusCode.BadRequest, "Invalid player");
                }
            }
            else
            {
                return new HttpResponse(HttpStatusCode.BadRequest, "Invalid player or game");
            }
        }
    }

    // Quit
    private static HttpResponse HandleQuit(HttpRequest httpRequest)
    {
        string username = httpRequest.Query["player"];
        string gameId = httpRequest.Query["id"];
        lock (gamesLock)
        {
            if (players.ContainsKey(username) && games.ContainsKey(gameId))
            {
                Game game = games[gameId];
                if (game.Player1.Username == username || (game.Player2 != null && game.Player2.Username == username))
                {
                    games.Remove(gameId);
                    return new HttpResponse(HttpStatusCode.OK, "Game quit");
                }
                else
                {
                    return new HttpResponse(HttpStatusCode.BadRequest, "Invalid player");
                }
            }
            else
            {
                return new HttpResponse(HttpStatusCode.BadRequest, "Invalid player or game");
            }
        }
    }
}

internal class Player
{
    public string Username { get; set; }

    public Player(string username)
    {
        Username = username;
    }
}

internal class Game
{
    public string Id { get; set; }
    public string State { get; set; }
    public Player Player1 { get; set; }
    public Player Player2 { get; set; }
    public string LastMove1 { get; set; }
    public string LastMove2 { get; set; }

    public Game(Player player1)
    {
        Id = new Random().Next(00, 99).ToString();
        Player1 = player1;
    }
}

internal class HttpRequest
{
    public string Method { get; set; }
    public string Path { get; set; }
    public Dictionary<string, string> Query { get; set; }

    public static HttpRequest Parse(string request)
    {
        string[] lines = request.Split(new[] { "\r\n" }, StringSplitOptions.None);
        string[] requestLine = lines[0].Split(' ');
        string method = requestLine[0];
        string path = requestLine[1];
        Dictionary<string, string> query = new Dictionary<string, string>();
        if (path.Contains("?"))
        {
            string[] parts = path.Split('?');
            path = parts[0];
            string[] queryParams = parts[1].Split('&');
            foreach (string queryParam in queryParams)
            {
                string[] keyValue = queryParam.Split('=');
                query.Add(keyValue[0], keyValue[1]);
            }
        }
        return new HttpRequest { Method = method, Path = path, Query = query };
    }
}

internal class HttpResponse
{
    public HttpStatusCode StatusCode { get; set; }
    public string Content { get; set; }
    public Dictionary<string, string> Headers { get; set; }

    public HttpResponse(HttpStatusCode statusCode, string content)
    {
        StatusCode = statusCode;
        Content = content;
        Headers = new Dictionary<string, string>();
    }

    public override string ToString()
    {
        StringBuilder response = new StringBuilder();
        response.Append("HTTP/1.1 " + (int)StatusCode + " " + StatusCode + "\r\n");
        foreach (var header in Headers)
        {
            response.Append(header.Key + ": " + header.Value + "\r\n");
        }
        response.Append("Content-Length: " + Content.Length + "\r\n");
        response.Append("\r\n" + Content + "\r\n");
        return response.ToString();
    }

}
