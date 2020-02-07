const express = require('express');
const app = express();
const https = require('https');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const tmi = require('tmi.js');
const fs = require('fs');
const bodyParser = require('body-parser')
const cors = require('cors')
const cleverbot = require("cleverbot-free");

// ================================================ Configuration properties ================================================
const regEx_youTubeID = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
const config = JSON.parse(fs.readFileSync('config.json'));
const YTKEY = "AIzaSyDMPgGc8pOHzQRZOvwYcKqNFWzAzsGy8Ps";
let admins = JSON.parse(fs.readFileSync("admins.json"));

// ============ Adding streamer as admin if he's already not ============
if (!admins.includes(config.twitch.Channel)) {
    admins.push(config.twitch.Channel);
}
// ============ END ============

const options = {
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

const client = new tmi.client(options);
app.use(cors());
app.use(bodyParser.json());
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
io.set("transports", ["websocket"]);

// ================================================ END OF Configuration properties ================================================

server.listen(8080, () => console.log("Server is running on 127.0.0.1:8080!"));


io.on('connection', socket => {
    console.log("Client:", socket.id, "has connected!");

});

client.connect();
client.on('connected', (adress, port) => {
    if (config.twitch.ShowJoinMessage) {
        client.action(config.twitch.Channel, config.twitch.JoinMessage);
    }
});


client.on('message', (channel, tags, message, self) => {
    try {
        const TAGS = tags;


        if (self) return;
        if (message.startsWith(config.twitch.CommandPrefix)) {
            // COMMANDS
            if (message.toLowerCase().startsWith(`${config.twitch.CommandPrefix}sr `)) {

                const url = message.split(" ")[1];
                const ID = url.match(regEx_youTubeID)[1];
                let title = "";

                https.get(`https://www.googleapis.com/youtube/v3/videos?key=${YTKEY}&part=snippet&id=${ID}`, (res) => {
                    let body = "";

                    res.on("data", (chunk) => {
                        body += chunk;
                    });

                    res.on("end", () => {
                        try {
                            let json = JSON.parse(body);
                            title = json.items[0].snippet.title;

                            emmitSR(url, ID, title, TAGS.username);

                        } catch (err) {
                            fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
                            console.error(err.message);
                        };
                    });

                }).on("error", (err) => {
                    fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
                    console.error(err.message);
                });

            }
            else if ((message.toLowerCase().startsWith(`${config.twitch.CommandPrefix}whitelist `)
                || message.toLowerCase().startsWith(`${config.twitch.CommandPrefix}w `)) && admins.includes(TAGS.username)) {
                if (message.split(' ')[1] === "add") {
                    emmitWHAdd(message.split(' ')[2].trim());
                } else if (message.split(' ')[1].toLowerCase() === "remove" || message.split(' ')[1].toLowerCase() === "rm") {
                    emmitWHRemove(message.split(' ')[2].trim())
                }
            } else if (message.toLowerCase() === `${config.twitch.CommandPrefix}admins`) {
                botSay(config.twitch.Channel, "Admins: " + admins.join(", "));
            }
            else if ((message.toLowerCase().startsWith(`${config.twitch.CommandPrefix}admin `)
                || message.toLowerCase().startsWith(`${config.twitch.CommandPrefix}a `)) && admins.includes(TAGS.username)) {
                if (message.split(' ')[1].toLowerCase() === "add") {
                    if (!admins.includes(message.split(' ')[2].trim())) {
                        admins.push(message.split(' ')[2].trim());
                        fs.writeFileSync("server/admins.json", admins);

                        botSay(config.twitch.Channel, `${TAGS.username} has added admin permissions to ${message.split(' ')[2].trim()}`);
                    } else {
                        botSay(config.twitch.Channel, `User ${message.split(' ')[2].trim()} already has admin permissions`);
                    }
                } else if (message.split(' ')[1].toLowerCase() === "remove" || message.split(' ')[1].toLowerCase() === "rm") {
                    if (admins.includes(message.split(' ')[2].trim())) {
                        admins.splice(admins.indexOf(message.split(' ')[2].trim()), 1);
                        botSay(config.twitch.Channel, `${TAGS.username} has removed admin permissions to ${message.split(' ')[2].trim()}`);
                    } else {
                        botSay(config.twitch.Channel, `User ${message.split(' ')[2].trim()} does not have admin permissions`);
                    }
                } else {
                    botSay(config.twitch.Channel, `Unknown command!`);
                }

            }

        } else {
            if (randomIntFromInterval(1, 5) == 5) {
                cleverbot(message).then(res => {
                    botSay(config.twitch.Channel, TAGS.username + ", " + res);
                });
            }
            emmitSpeech(TAGS.username, message);
        }
    } catch (err) {
        fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
        console.error(err.message);

    }
});

// Returns random number including min and max
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
// Emmits songrequest via socket to C# application
function emmitSR(url, ID, title, username) {
    client.action(config.twitch.Channel, "" + `${username} has added ${title} to playlist! :D`);
    io.emit('sr', { url: url, id: ID, title: title });
}
// Emmits a message to be spooken via socket to C# application
function emmitSpeech(username, message) {
    io.emit("speech", `${username}~${message}`);
}
// Emmits a username to be added to shitelist via socket to C# application
function emmitWHAdd(username) {
    io.emit("whAdd", username);
}
// Emmits a username to be removed to shitelist via socket to C# application
function emmitWHRemove(username) {
    io.emit("whRemove", username);
}
// Bot sends a massge in Twitch chat
function botSay(channel, message) {
    let msg = "" + message;
    client.action(channel, msg);
}