// Returns random number including min and max
export const randomIntFromInterval = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Emmits songrequest via socket to C# application
export const emmitSR = (io: SocketIO.Server, client: any, channel: string, url: string, ID: string, title: string, username: string) => {
    client.action(channel, "" + `${username} has added ${title} to playlist! :D`);
    io.emit('sr', { url: url, id: ID, title: title });
}

// Emmits a message to be spooken via socket to C# application
export const emmitSpeech = (io: SocketIO.Server, username: string, message: string) => {
    io.emit("speech", `${username}~${message}`);
}

// Emmits a username to be added to shitelist via socket to C# application
export const emmitWHAdd = (io: SocketIO.Server, username: string) => {
    io.emit("whAdd", username);
}

// Emmits a username to be removed to shitelist via socket to C# application
export const emmitWHRemove = (io: SocketIO.Server, username: string) => {
    io.emit("whRemove", username);
}

// Bot sends a massge in Twitch chat
export const botSay = (client: any, channel: string, message: string) => {
    // let msg = "" + message;
    client.action(channel, message);
}

export const emmitVIPJoin = (io: SocketIO.Server, username: string) => {
    io.emit("vip", `${username}~ has joined the channel!`);
}

export const emmitTitoCommand = (io: SocketIO.Server, fileName: string) => {
    io.emit("tito", fileName);
}

export const emmitVote = (io: SocketIO.Server, client: any, channel: string, username: string, pos: string) => {
    io.emit("vote", pos);
    botSay(client, channel, `${username} has just voted for pos.`);
}

export const emmitSkipSong = (io: SocketIO.Server) => {
    io.emit("skipSong", "skip");
}