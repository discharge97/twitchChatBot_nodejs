"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Returns random number including min and max
exports.randomIntFromInterval = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};
// Emmits songrequest via socket to C# application
exports.emmitSR = function (io, client, channel, url, ID, title, username) {
    client.action(channel, "" + (username + " has added " + title + " to playlist! :D"));
    io.emit('sr', { url: url, id: ID, title: title });
};
// Emmits a message to be spooken via socket to C# application
exports.emmitSpeech = function (io, username, message) {
    io.emit("speech", username + "~" + message);
};
// Emmits a username to be added to shitelist via socket to C# application
exports.emmitWHAdd = function (io, username) {
    io.emit("whAdd", username);
};
// Emmits a username to be removed to shitelist via socket to C# application
exports.emmitWHRemove = function (io, username) {
    io.emit("whRemove", username);
};
// Bot sends a massge in Twitch chat
exports.botSay = function (client, channel, message) {
    var msg = "" + message;
    client.action(channel, msg);
};
