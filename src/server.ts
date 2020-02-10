import express from 'express';
import { join } from "path";
import http from "http";
import io from "socket.io";
import tmi from 'tmi.js';
import fs from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import { handleCommand, handleSpeech, say } from './commands'

const app = express();
const server = http.createServer(app);
const sio = io(server);

//#region Configuration properties
// ================================================ Configuration properties ================================================
const config = JSON.parse(fs.readFileSync('config.json').toString());
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
//#endregion Configuration properties

server.listen(8080, () => console.log("Server is running on 127.0.0.1:8080!"));


sio.on('connection', socket => {
    console.log("Client:", socket.id, "has connected!");

});

sio.on('say', (message: string) => {
    say(client, config.twitch.Channel, message);
});

try {
    // client.connect();

} catch (err) {
    fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
    console.error(err.message);
}
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
            let cmdText = message;

            handleCommand(sio, client, channel, TAGS, cmdText.replace(config.twitch.CommandPrefix, ""));

        } else {
            handleSpeech(sio, client, channel, TAGS, message);
        }
    } catch (err) {
        fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
        console.error(err.message);
    }
});
