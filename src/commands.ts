import fs from 'fs';
import https from 'https';
import { botSay, emmitSR, emmitSpeech, emmitWHAdd, emmitWHRemove, randomIntFromInterval, emmitVote, emmitTitoCommand, emmitSkipSong, emmitSetVolume, emmitYTCommand } from './util'
import cleverbot from "cleverbot-free";
import { pointsCommand, TopRankType, getTop, addPoints, db, updateUser } from './points';
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

let voteActive: boolean = false;

const startVoteTimer = (minutes: number) => {
    setTimeout(() => {
        voteActive = false;
        usersVoted = [];
    }, minutes * 60000);
}

const startRoulette = (twClient: any, channel: string) => {
    botSay(twClient, channel, `Roulette has started! In 1 minute we will announce the landing number! Type ${config.twitch.CommandPrefix}roulette <'odd'/'event'/your_number> <points_amount> to join!`);
    rouletteActive = true;
    setTimeout(() => {
        const num = randomIntFromInterval(0, 36);
        let halfPoints: string[] = [];
        let fullPoints: string[] = [];
        let jackpot: string[] = [];

        rouletteUserList.forEach(user => {
            if (user.guess === 'odd' && num % 2 != 0 || user.guess === 'even' && num % 2 == 0) {
                addPoints(user.username, user.amount + user.amount / 2);
                halfPoints.push(user.username);
            } else if (num == user.guess) {
                addPoints(user.username, user.amount * 2);
                fullPoints.push(user.username);
            } else if (num == user.guess && num == 0) {
                addPoints(user.username, user.amount * 3);
                jackpot.push(user.username);
            }
        });

        botSay(twClient, channel, `Roulette has landed on ${num}! Roulette is now on a 5min cooldown!`);
        if (halfPoints.length > 0) {
            botSay(twClient, channel, `${halfPoints.join(", ")} scored with half of invested amount by betting on ${(num % 2 == 0) ? "EVEN" : "ODD"}!`);
        }

        if (fullPoints.length > 0) {
            botSay(twClient, channel, `${fullPoints.join(", ")} scored with invested amount by betting on ${num}!`);
        }

        if (jackpot.length > 0) {
            botSay(twClient, channel, `${jackpot.join(", ")} scored double their invested amount by betting on 0!`);
        }

        rouletteCooldown = true;
        rouletteActive = false;
        rouletteUserList = [];

        setTimeout(() => {
            rouletteActive = false;
            rouletteUserList = [];
            rouletteCooldown = false;
        }, 5 * 60000);

    }, 60000);
}

let usersVoted: string[] = [];
let usersSkipSongVoted: string[] = [];

let rouletteActive: boolean = false;
let rouletteUserList: any[] = [];
let rouletteCooldown: boolean = false;

export const clearSkipSongVotedUsers = () => {
    usersSkipSongVoted = [];
}

export const handleCommand = (io: SocketIO.Server, twClient: any, channel: string, TAGS: any, commandText: string) => {
    const cmdParts: any = commandText.match(regEx_commands);

    switch (cmdParts[0].toLowerCase()) {
        case "sr":
            db.get(`SELECT * FROM USER WHERE username LIKE '${TAGS.username}'`, (err, row) => {
                if (!row) return;

                if (row.points - 20 < 0) {
                    botSay(twClient, channel, `${TAGS.username} you need to have at least 20 points to request a song.`);
                    return;
                } else {


                    row.points -= 20;


                    updateUser(row);
                }

                if (!config.songRequests.AllowSongRequests) {
                    return;
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
            });
            break;

        case "whitelist": case "w":

            if (twClient.isMod(channel, TAGS.username) || ('#' + TAGS.username) === channel) {
                if (cmdParts[1] === "add") {
                    emmitWHAdd(io, cmdParts[2].replace("@", ""));
                } else if (cmdParts[1] === "remove" || cmdParts[1] === "rm") {
                    emmitWHRemove(io, cmdParts[2].replace("@", ""));
                }
            } else {
                botSay(twClient, channel, "Only mods can add/remove people from whitelist. Type !admin/!a add/remove(rm) <username> to add/remove a user to admin group");
            }
            break;

        case "about":
            botSay(twClient, channel, "My creators name is Aleksandar(Alexander) Stojadinović. He's an okey guy, sometimes. He may join the chat from time to time under the nick 'discharge97', so watch out! Kappa");
            break;

        case "points":
            pointsCommand(twClient, channel, TAGS.username);
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
            if (twClient.isMod(channel, TAGS.username) || ('#' + TAGS.username) === channel) {
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

                case "points":
                    getTop(twClient, channel, TopRankType.TopPoints);
                    break;

                default:
                    botSay(twClient, channel, `Parameter '${cmdParts[1]}' is invalid. Use 'exp', 'subs' or 'points'`);
                    break;
            }

            break;

        case "vote":

            if (cmdParts[1] === 'skipsong') {
                emmitVote(io, twClient, channel, TAGS.username, "skipsong");
                usersSkipSongVoted.push(TAGS.username);
                break;
            }

            if (usersVoted.includes(TAGS.username)) {
                botSay(twClient, channel, `You can only vote once per poll.`);
                break;
            }

            if (voteActive) {
                if (!isNaN(cmdParts[1])) {
                    emmitVote(io, twClient, channel, TAGS.username, cmdParts[1]);
                    usersVoted.push(TAGS.username);
                } else {
                    botSay(twClient, channel, `Invalid vote option. Please use index number to vote.`);
                }
            } else {
                botSay(twClient, channel, `There is no active vote poll.`);
            }
            break;

        case "tito":
            db.get(`SELECT * FROM USER WHERE username LIKE '${TAGS.username}'`, (err, row) => {
                if (!row) return;

                if (row.points - 50 < 0) {
                    botSay(twClient, channel, `${TAGS.username} you need to have at least 50 points to use tito command.`);
                    return;
                } else {
                    row.points -= 50;
                    updateUser(row);
                }

                if (cmdParts.length <= 1) {
                    botSay(twClient, channel, `To use special commands type ${config.twitch.CommandPrefix}tito <${titoCmds.join("/")}>`);
                } else {
                    emmitTitoCommand(io, cmdParts[1]);
                }
            });
            break;

        case "skipsong":
            if (twClient.isMod(channel, TAGS.username) || ('#' + TAGS.username) === channel) {
                emmitSkipSong(io);
            } else {
                botSay(twClient, channel, "Only mods can skip the song without a vote. If you can to suggest skipping the current song, try to vote!");
            } break;

        case "volume":
            if (twClient.isMod(channel, TAGS.username) || ('#' + TAGS.username) === channel) {
                emmitSetVolume(io, parseInt(cmdParts[1]));
            } else {
                botSay(twClient, channel, "Only mods can set the volume of music.");
            }
            break;

        case "music":
            if (twClient.isMod(channel, TAGS.username) || ('#' + TAGS.username) === channel) {
                if (cmdParts[1].includes("volume")) {
                    emmitSetVolume(io, parseInt(cmdParts[2]));
                }
                else if (cmdParts[1].includes("start") || cmdParts[1].includes("pause") || cmdParts[1].includes("play") || cmdParts[1].includes("stop")) {
                    emmitYTCommand(io, cmdParts[1]);
                }
                else {
                    botSay(twClient, channel, "Invalid music command");
                }
            } else {
                botSay(twClient, channel, "Only mods can set the volume of music.");
            }
            break;

        case "roulette":

            if ((!isNaN(cmdParts[1]) || cmdParts[1].toLowerCase() === 'odd' || cmdParts[1].toLowerCase() === 'even') && cmdParts[2]) {
                if (!rouletteCooldown) {
                    if (!rouletteActive) {
                        startRoulette(twClient, channel);
                    }

                    db.get(`SELECT * FROM USER WHERE username LIKE '${TAGS.username}'`, (err, row) => {
                        if (!row) return;

                        if (row.points - parseInt(cmdParts[2]) < 0) {
                            botSay(twClient, channel, `${TAGS.username} you don't have enough points.`);
                            return;
                        } else {
                            row.points -= parseInt(cmdParts[2]);
                            updateUser(row);
                        }

                        rouletteUserList.push({ username: TAGS.username, amount: cmdParts[2], guess: cmdParts[1] });
                        botSay(twClient, channel, `ROULETTE | ${TAGS.username} has placed ${cmdParts[2]}points on ${cmdParts[1]}. Type ${config.twitch.CommandPrefix}roulette <'odd'/'event'/your_number> <points_amount> to join!`);
                    });

                } else {
                    botSay(twClient, channel, `Roulette is on a 5min cooldown. Try again later`);
                }
            } else {
                botSay(twClient, channel, `${TAGS.username}, ${cmdParts[1]} or ${cmdParts[2]} is not a valid.`);
            }
            break;

        case "cmds": case "commands":
            botSay(twClient, channel, `*${config.twitch.CommandPrefix}whitelist(w) add/remove <username>, *${config.twitch.CommandPrefix}updatecfg,*${config.twitch.CommandPrefix}volume <amount>,*${config.twitch.CommandPrefix}music <play/pause/volume <amount>>,*${config.twitch.CommandPrefix}skipsong,${config.twitch.CommandPrefix}vote <option_index/skipsong>, ${config.twitch.CommandPrefix}sr <YouTube_url>, ${config.twitch.CommandPrefix}about, ${config.twitch.CommandPrefix}points, ${config.twitch.CommandPrefix}uptime, ${config.twitch.CommandPrefix}commands(cmds), ${config.twitch.CommandPrefix}top <exp/subs/points>,${config.twitch.CommandPrefix}roulette <'odd'/'event'/your_number> <points_amount>, ${config.twitch.CommandPrefix}tito <${titoCmds.join("/")}>`);
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
        }).catch((err) => {
            fs.appendFileSync("server_errors.log", `${(new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':')}\n${err.message}\n\n`);
            console.error(err);
        });
    }
    emmitSpeech(io, TAGS.username ? TAGS.username : "", message);
}

export const say = (twClient: any, channel: string, message: string) => {
    botSay(twClient, channel, message);
}

export const handleVote = (io: SocketIO.Server, twClient: any, channel: string, title: string, options: string[], minutes: number) => {
    // io.emit("vote", "aa");
    let tmp = '';
    for (let i = 0; i < options.length; i++) {
        tmp += (i + 1) + ". " + options[i];
        if (i + 1 < options.length) tmp += ', ';
    }
    voteActive = true;
    startVoteTimer(minutes);
    botSay(twClient, channel, `A vote poll has started and will end in ${minutes} minutes! To vote type ${config.twitch.CommandPrefix}vote <index>! ${title}`);
    botSay(twClient, channel, tmp);
}
