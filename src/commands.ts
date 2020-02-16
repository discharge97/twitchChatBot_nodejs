import fs from 'fs';
import https from 'https';
import { botSay, emmitSR, emmitSpeech, emmitWHAdd, emmitWHRemove, randomIntFromInterval, emmitVote, emmitTitoCommand, emmitSkipSong } from './util'
import cleverbot from "cleverbot-free";
import { pointsCommand, watchTimeCommand, TopRankType, getTop } from './points';
const regEx_youTubeID = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
const YTKEY = "AIzaSyDMPgGc8pOHzQRZOvwYcKqNFWzAzsGy8Ps";
const regEx_commands = /([^\s]+)/g;
let titoCmds: string[] = [];
const updateConf = (): any => {
    return config = JSON.parse(fs.readFileSync('config.json').toString());
}
let config = updateConf();
export { config };

export const setTitoCommands = (cmds: string[]) => {
    titoCmds = cmds;
}


export const handleCommand = (io: SocketIO.Server, twClient: any, channel: string, TAGS: any, commandText: string) => {
    const cmdParts: any = commandText.match(regEx_commands);

    console.log(commandText, cmdParts);

    switch (cmdParts[0].toLowerCase()) {
        case "sr":
            console.log("!sr");
            if (!config.songRequests.AllowSongRequests) {
                break;
            }

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

            if (twClient.isMod(channel, TAGS.username) || TAGS.username === channel) {
                if (cmdParts[1] === "add") {
                    emmitWHAdd(io, cmdParts[2].replace("@", ""));
                } else if (cmdParts[1] === "remove" || cmdParts[1] === "rm") {
                    emmitWHRemove(io, cmdParts[2].replace("@", ""));
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

        case "points":
            pointsCommand(twClient, channel, TAGS.username);
            break;


        case "watchtime":
            watchTimeCommand(twClient, channel, TAGS.username);
            break;

        case "uptime":
            https.get(`https://beta.decapi.me/twitch/uptime/${channel}`, (res) => {
                let uptime = "";

                res.on("data", (chunk) => {
                    uptime += chunk;
                });

                res.on("end", () => {
                    try {
                        say(twClient, channel, `${channel} has been streaming for ${uptime}`);

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

        case "updatecfg":
            if (twClient.isMod(channel, TAGS.username) || TAGS.username === channel) {
                updateConf();
                botSay(twClient, channel, "Config file has been updated!");
            } else {
                botSay(twClient, channel, "Only mods can update the configuration file!");
            }
            break;

        case "top":

            switch (cmdParts[1]) {
                case "exp":
                    getTop(twClient, channel, TopRankType.TopExp);
                    break;

                case "subs":
                    getTop(twClient, channel, TopRankType.TopSubs);
                    break;

                case "watchtime":

                    getTop(twClient, channel, TopRankType.TopWatchTime);
                    break;

                case "points":
                    getTop(twClient, channel, TopRankType.TopPoints);
                    break;

                default:
                    botSay(twClient, channel, `Parameter '${cmdParts[1]}' is invalid. Use 'exp', 'subs' or 'watchtime'`);
                    break;
            }

            break;

        case "vote":

            if (cmdParts[1] === 'skipsong') {

            } else if (cmdParts[1].length == 1) {
                emmitVote(io, twClient, channel, TAGS.username, cmdParts[2])
            } else {
                botSay(twClient, channel, `Invalid vote option. Please use index number to vote.`);
            }

            break;

        case "tito":

            if (cmdParts.length == 2) {
                botSay(twClient, channel, `Use ${config.twitch.CommandPrefix}tito <${titoCmds.join("/")}> to play sound/video.`);
            } else {
                emmitTitoCommand(io, cmdParts[1]);
            }

            break;

        case "skipsong":
            if (twClient.isMod(channel, TAGS.username) || TAGS.username === channel) {
                emmitSkipSong(io);
            } else {
                botSay(twClient, channel, "Only mods can skip the song without a vote. If you can to suggest skipping the current song, try to vote!");
            } break;

        case "cmds": case "commands":
            botSay(twClient, channel, `*${config.twitch.CommandPrefix}whitelist(w) add/remove <username>, *${config.twitch.CommandPrefix}updatecfg, ${config.twitch.CommandPrefix}sr <YouTube_url>, ${config.twitch.CommandPrefix}mods, ${config.twitch.CommandPrefix}about, ${config.twitch.CommandPrefix}points, ${config.twitch.CommandPrefix}watchtime, ${config.twitch.CommandPrefix}uptime, ${config.twitch.CommandPrefix}commands(cmds), ${config.twitch.CommandPrefix}top exp/subs/watchtime`);
            botSay(twClient, channel, `Commands noted with '*' can only use mods.`);
            break;

        default:
            botSay(twClient, channel, `Unknown command. Type '${config.twitch.CommandPrefix}commands' or '${config.twitch.CommandPrefix}cmds' to see a list of commands`);
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

export const handleVote = (io: SocketIO.Server, twClient: any, channel: string, title: string, options: string[]) => {
    // io.emit("vote", "aa");
    let tmp = '';
    for (let i = 0; i < options.length; i++) {
        tmp += '' + (i + 1) + options[i] + ', '
    }
    botSay(twClient, channel, title);
    botSay(twClient, channel, tmp);
}
