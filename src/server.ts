import express from 'express';
import { join } from "path";
import https from 'https';
import http from "http";
import io, { Socket } from "socket.io";
import tmi from 'tmi.js';
import fs from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import cleverbot from "cleverbot-free";
import { handleCommand } from './commands'

const app = express();
const server = http.createServer(app);
const sio = io(server);

// ================================================ Configuration properties ================================================
const config = JSON.parse(fs.readFileSync('config.json').toString());
let admins = JSON.parse(fs.readFileSync("admins.json").toString());

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

const client = tmi.client(options);
app.use(cors());
app.use(bodyParser.json());
app.get('/', (_, res) => {
    res.sendFile(join(process.cwd(), "index.html"));
});
// sio.use("transports", ["websocket"]);

// ================================================ END OF Configuration properties ================================================

server.listen(8080, () => console.log("Server is running on 127.0.0.1:8080!"));


sio.on('connection', socket => {
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
        if (self) return;
        const TAGS = tags;

        if (message.startsWith(config.twitch.CommandPrefix)) {
            // COMMANDS
            handleCommand(config.twitch.CommandPrefix, message); // TO BE CONTINUED... \|/

            if (message.toLowerCase().startsWith(`${config.twitch.CommandPrefix}sr `)) {

                const url = message.split(" ")[1];
                const match = url.match(regEx_youTubeID);
                if (!match) {
                    return;
                }
                const ID = match[1];
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
                            emmitSR(url, ID, title, TAGS.username ? TAGS.username : "");

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
                (cleverbot(message) as unknown as Promise<string>).then(res => {
                    botSay(config.twitch.Channel, TAGS.username + ", " + res);
                });
            }
            emmitSpeech(TAGS.username ? TAGS.username : "", message);
        }
    } catch (err) {
        fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
        console.error(err.message);

    }
});

// Returns random number including min and max
function randomIntFromInterval(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
// Emmits songrequest via socket to C# application
function emmitSR(url: string, ID: string, title: string, username: string): void {
    client.action(config.twitch.Channel, "" + `${username} has added ${title} to playlist! :D`);
    sio.emit('sr', { url: url, id: ID, title: title });
}
// Emmits a message to be spoken via socket to C# application
function emmitSpeech(username: string, message: string): void {
    sio.emit("speech", `${username}~${message}`);
}
// Emmits a username to be added to shitelist via socket to C# application
function emmitWHAdd(username: string): void {
    sio.emit("whAdd", username);
}
// Emmits a username to be removed to shitelist via socket to C# application
function emmitWHRemove(username: string): void {
    sio.emit("whRemove", username);
}
// Bot sends a massge in Twitch chat
function botSay(channel: string, message: string): void {
    let msg = "" + message;
    client.action(channel, msg);
}