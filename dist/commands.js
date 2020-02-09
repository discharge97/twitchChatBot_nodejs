"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var https_1 = __importDefault(require("https"));
var util_1 = require("./util");
var cleverbot_free_1 = __importDefault(require("cleverbot-free"));
var regEx_youTubeID = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
var YTKEY = "AIzaSyDMPgGc8pOHzQRZOvwYcKqNFWzAzsGy8Ps";
var regEx_commands = /([^\s]+)/g;
exports.handleCommand = function (io, twClient, channel, admins, TAGS, commandText) {
    var cmdParts = commandText.match(regEx_commands);
    console.log(commandText, cmdParts);
    switch (cmdParts[0].toLowerCase()) {
        case "sr":
            console.log("!sr");
            var url_1 = cmdParts[1];
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
                        util_1.emmitSR(io, twClient, channel, url_1, ID_1, title_1, TAGS.username ? TAGS.username : "");
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
            break;
        case "whitelist":
        case "w":
            console.log("!whitelist");
            if (admins.includes(TAGS.username)) {
                if (cmdParts[1] === "add") {
                    util_1.emmitWHAdd(io, cmdParts[2]);
                }
                else if (cmdParts[2] === "remove" || cmdParts[2] === "rm") {
                    util_1.emmitWHRemove(io, cmdParts[2]);
                }
            }
            else {
                util_1.botSay(twClient, channel, "Only admins can add/remove people from whitelist. Type !admin/!a add/remove(rm) <username> to add/remove a user to admin group");
            }
            break;
        case "admins":
            console.log("!admins");
            util_1.botSay(twClient, channel, "Admins: " + admins.join(", "));
            break;
        case "admin":
        case "a":
            console.log("!admin");
            if (admins.includes(TAGS.username)) {
                if (cmdParts[1] === "add" && !admins.includes(cmdParts[2])) {
                    admins.push(cmdParts[2].trim());
                    util_1.botSay(twClient, channel, TAGS.username + " has added admin role to user " + cmdParts[2]);
                }
                else if (cmdParts[1] === "remove" || cmdParts[1] === "rm") {
                    admins.splice(admins.indexOf(cmdParts[2].trim()), 1);
                    util_1.botSay(twClient, channel, TAGS.username + " has removed admin role from user " + cmdParts[2]);
                }
                fs_1.default.writeFileSync("server/admins.json", admins);
            }
            else {
                util_1.botSay(twClient, channel, "Only admins can add/remove admin role from user. Type !admin/!a add/remove(rm) <username> to add/remove a user to admin group");
            }
            break;
        default: break;
    }
};
exports.handleSpeech = function (io, twClient, channel, TAGS, message) {
    if (util_1.randomIntFromInterval(1, 5) == 5) {
        cleverbot_free_1.default(message).then(function (res) {
            util_1.botSay(twClient, channel, TAGS.username + ", " + res);
        });
    }
    util_1.emmitSpeech(io, TAGS.username ? TAGS.username : "", message);
};
