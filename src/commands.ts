import fs from 'fs';
import https from 'https';
import { botSay, emmitSR, emmitSpeech, emmitWHAdd, emmitWHRemove, randomIntFromInterval } from './util'
import cleverbot from "cleverbot-free";
const regEx_youTubeID = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
const YTKEY = "AIzaSyDMPgGc8pOHzQRZOvwYcKqNFWzAzsGy8Ps";
const regEx_commands = /([^\s]+)/g;

export const handleCommand = (io: SocketIO.Server, twClient: any, channel: string, admins: string[], TAGS: any, commandText: string) => {
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

            if (admins.includes(TAGS.username)) {
                if (cmdParts[1] === "add") {
                    emmitWHAdd(io, cmdParts[2]);
                } else if (cmdParts[2] === "remove" || cmdParts[2] === "rm") {
                    emmitWHRemove(io, cmdParts[2]);
                }
            } else {
                botSay(twClient, channel, "Only admins can add/remove people from whitelist. Type !admin/!a add/remove(rm) <username> to add/remove a user to admin group");
            }
            break;

        case "admins":
            console.log("!admins");

            botSay(twClient, channel, "Admins: " + admins.join(", "));
            break;

        case "admin": case "a":
            console.log("!admin");

            if (admins.includes(TAGS.username)) {
                if (cmdParts[1] === "add" && !admins.includes(cmdParts[2])) {
                    admins.push(cmdParts[2].trim());
                    botSay(twClient, channel, `${TAGS.username} has added admin role to user ${cmdParts[2]}`);
                } else if (cmdParts[1] === "remove" || cmdParts[1] === "rm") {
                    admins.splice(admins.indexOf(cmdParts[2].trim()), 1);
                    botSay(twClient, channel, `${TAGS.username} has removed admin role from user ${cmdParts[2]}`);
                }
                fs.writeFileSync("server/admins.json", admins);
            } else {
                botSay(twClient, channel, "Only admins can add/remove admin role from user. Type !admin/!a add/remove(rm) <username> to add/remove a user to admin group");
            }
            break;



        default: break;
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
