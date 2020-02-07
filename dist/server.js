"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var path_1 = require("path");
var https_1 = __importDefault(require("https"));
var http_1 = __importDefault(require("http"));
var socket_io_1 = __importDefault(require("socket.io"));
var tmi_js_1 = __importDefault(require("tmi.js"));
var fs_1 = __importDefault(require("fs"));
var body_parser_1 = __importDefault(require("body-parser"));
var cors_1 = __importDefault(require("cors"));
var cleverbot_free_1 = __importDefault(require("cleverbot-free"));
var app = express_1.default();
var server = http_1.default.createServer(app);
var sio = socket_io_1.default(server);
// ================================================ Configuration properties ================================================
var regEx_youTubeID = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
var config = JSON.parse(fs_1.default.readFileSync('config.json').toString());
var YTKEY = "AIzaSyDMPgGc8pOHzQRZOvwYcKqNFWzAzsGy8Ps";
var admins = JSON.parse(fs_1.default.readFileSync("admins.json").toString());
// ============ Adding streamer as admin if he's already not ============
if (!admins.includes(config.twitch.Channel)) {
    admins.push(config.twitch.Channel);
}
// ============ END ============
var options = {
    options: {
        debug: false
    },
    connection: {
        cluster: 'aws',
        reconnect: true,
    },
    identity: {
        username: config.twitch.BotUsername,
        password: config.twitch.Oauth
    },
    channels: [config.twitch.Channel]
};
var client = tmi_js_1.default.client(options);
app.use(cors_1.default());
app.use(body_parser_1.default.json());
app.get('/', function (_, res) {
    res.sendFile(path_1.join(process.cwd(), "index.html"));
});
// sio.use("transports", ["websocket"]);
// ================================================ END OF Configuration properties ================================================
server.listen(8080, function () { return console.log("Server is running on 127.0.0.1:8080!"); });
sio.on('connection', function (socket) {
    console.log("Client:", socket.id, "has connected!");
});
client.connect();
client.on('connected', function (adress, port) {
    if (config.twitch.ShowJoinMessage) {
        client.action(config.twitch.Channel, config.twitch.JoinMessage);
    }
});
client.on('message', function (channel, tags, message, self) {
    try {
        var TAGS_1 = tags;
        if (self)
            return;
        if (message.startsWith(config.twitch.CommandPrefix)) {
            // COMMANDS
            if (message.toLowerCase().startsWith(config.twitch.CommandPrefix + "sr ")) {
                var url_1 = message.split(" ")[1];
                var match = url_1.match(regEx_youTubeID);
                if (!match) {
                    return;
                }
                var ID_1 = match[1];
                var title_1 = "";
                https_1.default.get("https://www.googleapis.com/youtube/v3/videos?key=" + YTKEY + "&part=snippet&id=" + ID_1, function (res) {
                    var body = "";
                    res.on("data", function (chunk) {
                        body += chunk;
                    });
                    res.on("end", function () {
                        try {
                            var json = JSON.parse(body);
                            title_1 = json.items[0].snippet.title;
                            emmitSR(url_1, ID_1, title_1, TAGS_1.username ? TAGS_1.username : "");
                        }
                        catch (err) {
                            fs_1.default.appendFileSync("server_errors.log", (new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':') + "\n" + err.message + "\n\n");
                            console.error(err.message);
                        }
                        ;
                    });
                }).on("error", function (err) {
                    fs_1.default.appendFileSync("server_errors.log", (new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':') + "\n" + err.message + "\n\n");
                    console.error(err.message);
                });
            }
            else if ((message.toLowerCase().startsWith(config.twitch.CommandPrefix + "whitelist ")
                || message.toLowerCase().startsWith(config.twitch.CommandPrefix + "w ")) && admins.includes(TAGS_1.username)) {
                if (message.split(' ')[1] === "add") {
                    emmitWHAdd(message.split(' ')[2].trim());
                }
                else if (message.split(' ')[1].toLowerCase() === "remove" || message.split(' ')[1].toLowerCase() === "rm") {
                    emmitWHRemove(message.split(' ')[2].trim());
                }
            }
            else if (message.toLowerCase() === config.twitch.CommandPrefix + "admins") {
                botSay(config.twitch.Channel, "Admins: " + admins.join(", "));
            }
            else if ((message.toLowerCase().startsWith(config.twitch.CommandPrefix + "admin ")
                || message.toLowerCase().startsWith(config.twitch.CommandPrefix + "a ")) && admins.includes(TAGS_1.username)) {
                if (message.split(' ')[1].toLowerCase() === "add") {
                    if (!admins.includes(message.split(' ')[2].trim())) {
                        admins.push(message.split(' ')[2].trim());
                        fs_1.default.writeFileSync("server/admins.json", admins);
                        botSay(config.twitch.Channel, TAGS_1.username + " has added admin permissions to " + message.split(' ')[2].trim());
                    }
                    else {
                        botSay(config.twitch.Channel, "User " + message.split(' ')[2].trim() + " already has admin permissions");
                    }
                }
                else if (message.split(' ')[1].toLowerCase() === "remove" || message.split(' ')[1].toLowerCase() === "rm") {
                    if (admins.includes(message.split(' ')[2].trim())) {
                        admins.splice(admins.indexOf(message.split(' ')[2].trim()), 1);
                        botSay(config.twitch.Channel, TAGS_1.username + " has removed admin permissions to " + message.split(' ')[2].trim());
                    }
                    else {
                        botSay(config.twitch.Channel, "User " + message.split(' ')[2].trim() + " does not have admin permissions");
                    }
                }
                else {
                    botSay(config.twitch.Channel, "Unknown command!");
                }
            }
        }
        else {
            if (randomIntFromInterval(1, 5) == 5) {
                cleverbot_free_1.default(message).then(function (res) {
                    botSay(config.twitch.Channel, TAGS_1.username + ", " + res);
                });
            }
            emmitSpeech(TAGS_1.username ? TAGS_1.username : "", message);
        }
    }
    catch (err) {
        fs_1.default.appendFileSync("server_errors.log", (new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':') + "\n" + err.message + "\n\n");
        console.error(err.message);
    }
});
// Returns random number including min and max
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
// Emmits songrequest via socket to C# application
function emmitSR(url, ID, title, username) {
    client.action(config.twitch.Channel, "" + (username + " has added " + title + " to playlist! :D"));
    sio.emit('sr', { url: url, id: ID, title: title });
}
// Emmits a message to be spoken via socket to C# application
function emmitSpeech(username, message) {
    sio.emit("speech", username + "~" + message);
}
// Emmits a username to be added to shitelist via socket to C# application
function emmitWHAdd(username) {
    sio.emit("whAdd", username);
}
// Emmits a username to be removed to shitelist via socket to C# application
function emmitWHRemove(username) {
    sio.emit("whRemove", username);
}
// Bot sends a massge in Twitch chat
function botSay(channel, message) {
    var msg = "" + message;
    client.action(channel, msg);
}
