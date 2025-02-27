import express from 'express';
import { join } from "path";
import http from "http";
import io from "socket.io";
import tmi from 'tmi.js';
import fs from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import { handleCommand, handleSpeech, say, config, handleVote, setTitoCommands, clearSkipSongVotedUsers } from './commands'
// import { emmitVIPJoin } from './util';
import { addPoints, PointsType, addPointsUserRange, subscribedUser, addWatchTime } from './points';

const app = express();
const server = http.createServer(app);
const sio = io(server);

//#region Configuration properties
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
//#endregion Configuration properties

server.listen(8080, () => console.log("Server is running on 127.0.0.1:8080!"));

try {

    sio.on('connection', socket => {
        console.log("Client:", socket.id, "has connected!");

        socket.on('say', (message: string) => {
            say(client, config.twitch.Channel, message);
        });

        socket.on('vote', (vote: any) => {
            //title:    Am I a good steamer?
            //options:  Yes~No
            handleVote(sio, client, config.twitch.Channel, vote["title"], vote["options"].split("~"), vote["time"]);
        });

        socket.on('tito', (cmds: string) => {
            // fail~dance~jump
            cmds = cmds.replace(/"/g, "");
            setTitoCommands(cmds.split("~"));
        });
    });


    setInterval(() => {
        http.get(`http://tmi.twitch.tv/group/user/${config.twitch.Channel}/chatters`, (res) => {
            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                try {
                    addPointsUserRange(JSON.parse(body));
                    addPoints(config.twitch.Channel, 50);
                } catch (err) {
                    fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
                    console.error(err);
                };
            });

        }).on("error", (err) => {
            fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
            console.error(err.message);
        });
        clearSkipSongVotedUsers();
    }, 5 * 60000);

    setInterval(() => {
        say(client, config.twitch.Channel, "With every message you recieve 1 point. Subscribers and mods recieve a little more. ;) To view your points balance type '!points' Type '!lvl' too see what level you are!");
        http.get(`http://tmi.twitch.tv/group/user/${config.twitch.Channel}/chatters`, (res) => {
            let body = "";

            res.on("data", (chunk) => {
                body += chunk;
            });

            res.on("end", () => {
                try {
                    addWatchTime(body);
                } catch (err) {
                    fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
                    console.error(err);
                };
            });

        }).on("error", (err) => {
            fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
            console.error(err.message);
        });
        clearSkipSongVotedUsers();
    }, 60000);

} catch (err) {
    fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
    console.error(err.message);
}

try {
    client.connect();

} catch (err) {
    fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
    console.error(err.message);
}

client.on('connected', (adress, port) => {
    if (config.twitch.ShowJoinMessage) {
        client.action(config.twitch.Channel, config.twitch.JoinMessage);
    }
}).on("join", (channel, username, self) => {

    //emmitVIPJoin(sio, username);

}).on("subscription", (channel, username, tmp, message, userstate) => {
    subscribedUser(client, channel, username, 100, `${username} has subscripted! Here's a little reward of 100 points! :D`);
    say(client, channel, `${username} has subscripted! Here's a little reward of 100 points! :D`);
}).on("subgift", (channel, username, streakMonth, targetUser, methods) => {
    addPoints(username, 200, PointsType.None, true);
    say(client, channel, `${username} has gifted a sub to ${targetUser}! Such a nice guy, here's a little reward of 200 points for you too! SeemsGood`);
}).on('message', (channel, tags, message, self) => {
    try {
        if (self) return;
        const TAGS = tags;

        if (message.startsWith(config.twitch.CommandPrefix)) {
            let cmdText = message;

            handleCommand(sio, client, channel, TAGS, cmdText.replace(config.twitch.CommandPrefix, ""));

        } else {
            if (TAGS.username) {
                //addExp(TAGS.username, 0, (TAGS.subscriber || TAGS.mod) ? PointsType.SubscriberMessage : PointsType.UserMessage);
                addPoints(TAGS.username, 0, (TAGS.subscriber || TAGS.mod) ? PointsType.SubscriberMessage : PointsType.UserMessage);
            }
            if (config.speech.EnableVoiceSpeech) {
                handleSpeech(sio, client, channel, TAGS, message);
            }
        }
    } catch (err) {
        fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
        console.error(err.message);
    }
});
