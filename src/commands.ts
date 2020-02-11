import fs from 'fs';
import https from 'https';
import { botSay, emmitSR, emmitSpeech, emmitWHAdd, emmitWHRemove, randomIntFromInterval } from './util'
import cleverbot from "cleverbot-free";
const regEx_youTubeID = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
const YTKEY = "AIzaSyDMPgGc8pOHzQRZOvwYcKqNFWzAzsGy8Ps";
const regEx_commands = /([^\s]+)/g;


export const handleCommand = (io: SocketIO.Server, twClient: any, channel: string, TAGS: any, commandText: string) => {
    const cmdParts: any = commandText.match(regEx_commands);

    console.log(commandText, cmdParts);

    switch (cmdParts[0].toLowerCase()) {
        case "sr":
            console.log("!sr");

            const url = cmdParts[1];
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
                        emmitSR(io, twClient, channel, url, ID, title, TAGS.username ? TAGS.username : "");

                    } catch (err) {
                        fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
                        console.error(err.message);
                    };
                });

            }).on("error", (err) => {
                fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
                console.error(err.message);
            });

            break;

        case "whitelist": case "w":
            console.log("!whitelist");

            if (twClient.isMod(channel, TAGS.username)) {
                if (cmdParts[1] === "add") {
                    emmitWHAdd(io, cmdParts[2]);
                } else if (cmdParts[2] === "remove" || cmdParts[2] === "rm") {
                    emmitWHRemove(io, cmdParts[2]);
                }
            } else {
                botSay(twClient, channel, "Only mods can add/remove people from whitelist. Type !admin/!a add/remove(rm) <username> to add/remove a user to admin group");
            }
            break;

        case "mods":
            console.log("!mods");

            botSay(twClient, channel, "Mods: " + twClient.mods().join(", "));
            break;

        case "about":
            botSay(twClient, channel, "My creators name is Aleksandar(Alexander) Stojadinović. He's an okey guy, sometimes. He may join the chat from time to time under the nick 'discharge97', so watch out! Kappa");
            break;

        default:
            botSay(twClient, channel, "Unknown command.");
            break;
    }
}

export const handleSpeech = (io: SocketIO.Server, twClient: any, channel: string, TAGS: any, message: string) => {
    if (randomIntFromInterval(1, 5) == 5) {
        (cleverbot(message) as unknown as Promise<string>).then(res => {
            botSay(twClient, channel, TAGS.username + ", " + res);
        });
    }
    emmitSpeech(io, TAGS.username ? TAGS.username : "", message);
}

export const say = (twClient: any, channel: string, message: string) => {
    botSay(twClient, channel, message);
}
