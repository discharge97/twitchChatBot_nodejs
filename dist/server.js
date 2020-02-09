"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var path_1 = require("path");
var http_1 = __importDefault(require("http"));
var socket_io_1 = __importDefault(require("socket.io"));
var tmi_js_1 = __importDefault(require("tmi.js"));
var fs_1 = __importDefault(require("fs"));
var body_parser_1 = __importDefault(require("body-parser"));
var cors_1 = __importDefault(require("cors"));
var commands_1 = require("./commands");
var app = express_1.default();
var server = http_1.default.createServer(app);
var sio = socket_io_1.default(server);
// ================================================ Configuration properties ================================================
var config = JSON.parse(fs_1.default.readFileSync('config.json').toString());
var admins = [];
try {
    admins = JSON.parse(fs_1.default.readFileSync("admins.json").toString());
}
catch (error) { }
// ============ Adding streamer as admin if he's already not ============
if (!admins.includes(config.twitch.Channel)) {
    admins.push(config.twitch.Channel);
    fs_1.default.writeFileSync("admins.json", admins);
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
try {
    client.connect();
}
catch (err) {
    fs_1.default.appendFileSync("server_errors.log", (new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':') + "\n" + err.message + "\n\n");
    console.error(err.message);
}
client.on('connected', function (adress, port) {
    if (config.twitch.ShowJoinMessage) {
        client.action(config.twitch.Channel, config.twitch.JoinMessage);
    }
});
client.on('message', function (channel, tags, message, self) {
    try {
        if (self)
            return;
        var TAGS = tags;
        if (message.startsWith(config.twitch.CommandPrefix)) {
            var cmdText = message;
            // cmdText.replace(config.twitch.CommandPrefix, "");
            commands_1.handleCommand(sio, client, channel, admins, TAGS, cmdText.replace(config.twitch.CommandPrefix, ""));
        }
        else {
            commands_1.handleSpeech(sio, client, channel, TAGS, message);
        }
    }
    catch (err) {
        fs_1.default.appendFileSync("server_errors.log", (new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':') + "\n" + err.message + "\n\n");
        console.error(err.message);
    }
});
