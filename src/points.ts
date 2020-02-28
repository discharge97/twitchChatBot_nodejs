import sqlite3 from 'sqlite3';
import { botSay } from './util';
import fs from 'fs';

export let db = new sqlite3.Database("C:\\sqlite\\twitchBot.db");

class User {
    readonly id: number = -1;
    username: string;
    points: number = 0;
    dateModified: Date = new Date();
    exp: number = 0;
    watchTime: number = 0;
    lvl: number = 1;
    giftSub: number | undefined;

    constructor(username: string) {
        this.username = username;
    }
}

let lvlRange: any = {
    "lvl1": [0, 300],
    "lvl2": [300, 900],
    "lvl3": [900, 2700],
    "lvl4": [2700, 6500],
    "lvl5": [6500, 14000],
    "lvl6": [14000, 23000],
    "lvl7": [23000, 34000],
    "lvl8": [34000, 48000],
    "lvl9": [48000, 64000],
    "lvl10": [64000, 85000],
    "lvl11": [85000, 100000],
    "lvl12": [100000, 120000],
    "lvl13": [120000, 140000],
    "lvl14": [140000, 165000],
    "lvl15": [165000, 195000],
    "lvl16": [195000, 225000],
    "lvl17": [225000, 256000],
    "lvl18": [256000, 305000],
    "lvl19": [305000, 355000],
    "lvl20": [355000, 380000],
    "lvl21": [380000, 410000],
    "lvl22": [410000, 450000],
    "lvl23": [450000, 489000],
    "lvl24": [489000, 500000],
    "lvl25": [500000, 520000],
    "lvl26": [520000, 540000],
    "lvl27": [540000, 560000],
    "lvl28": [560000, 580000],
    "lvl29": [580000, 600000],
    "lvl30": [600000, 630000]
}

try {
    lvlRange = JSON.parse(fs.readFileSync("levels.json").toString());
} catch (err) {
    fs.writeFileSync("levels.json", JSON.stringify(lvlRange));
}


export enum PointsType {
    SubscriberBonus, UserBonus, UserMessage, SubscriberMessage, None
}

export enum TopRankType {
    TopSubs = "subs", TopWatchTime = "watchtime", TopExp = "exp", TopPoints = "points", None = "none"
}

export const subscribedUser = (client: any, channel: string, username: string, points: number, message: string) => {
    addPoints(username, points, PointsType.None);
    botSay(client, channel, message);
}

export const addPointsUserRange = (chatters: any) => {
    if (chatters.moderators) {
        chatters.moderators.forEach((username: string) => {
            addPoints(username, 0, PointsType.SubscriberBonus);
        });
    }

    if (chatters.admins) {
        chatters.admins.forEach((username: string) => {
            addPoints(username, 0, PointsType.SubscriberBonus);
        });
    }

    if (chatters.global_mods) {
        chatters.global_mods.forEach((username: string) => {
            addPoints(username, 0, PointsType.SubscriberBonus);
        });
    }

    if (chatters.viewers) {
        chatters.viewers.forEach((username: string) => {
            addPoints(username, 0, PointsType.UserBonus);
        });
    }
}
export const addWatchTime = (chatters: any) => {
    if (chatters.moderators) {
        chatters.moderators.forEach((username: string) => {
            addTime(username);
        });
    }

    if (chatters.admins) {
        chatters.admins.forEach((username: string) => {
            addTime(username);
        });
    }

    if (chatters.global_mods) {
        chatters.global_mods.forEach((username: string) => {
            addTime(username);
        });
    }

    if (chatters.viewers) {
        chatters.viewers.forEach((username: string) => {
            addTime(username);
        });
    }
}

const addTime = (username: string) => {
    db.get(`SELECT * FROM USER WHERE username LIKE '${username}'`, (err, row) => {
        let user: User;
        if (row) {
            user = row;
        } else {
            user = new User(username);
        }

        user.watchTime += 1;

        user.dateModified = new Date();
        updateUser(user);
    });
}


export const addPoints = (username: string, amount: number = 0, type: PointsType = PointsType.None, gift: boolean = false) => {

    db.get(`SELECT * FROM USER WHERE username LIKE '${username}'`, (err, row) => {
        let user: User;
        if (row) {
            user = row;
        } else {
            user = new User(username);
        }
        if (amount > 0) {
            user.points += amount;
        }
        else {
            switch (type) {
                case PointsType.UserMessage:
                    user.points += 1;
                    user.exp += 10;
                    break;
                case PointsType.SubscriberMessage:
                    user.exp += 15;
                    user.points += 2;
                    break;
                case PointsType.UserBonus:
                    user.exp += 15;
                    user.points += 10;
                    break;
                case PointsType.SubscriberBonus:
                    user.exp += 20;
                    user.points += 15;
                    break;
                default:
                    break;
            }
        }
        if (gift) {
            if (user.giftSub) {
                user.giftSub += 1;
            } else {
                user.giftSub = 1;
            }
        }
        user.dateModified = new Date();
        updateUser(user);
    });
}

export const pointsCommand = (twClient: any, channel: string, username: string) => {

    db.get(`SELECT * FROM USER WHERE username LIKE '${username}'`, (err, row) => {
        if (row) {
            botSay(twClient, channel, `${username} Points: ${row.points}`);
        } return;
    });
}

export const watchTimeCommand = (twClient: any, channel: string, username: string) => {

    db.get(`SELECT * FROM USER WHERE username LIKE '${username}'`, (err, row) => {
        let user: User;
        if (row) {
            user = row;
            user.watchTime
            botSay(twClient, channel, `${username} Points: ${row.points}`);
        } return;
    });
}

export const handleLevelCommand = (twClient: any, channel: string, username: string) => {

    db.get(`SELECT * FROM USER WHERE username LIKE '${username}'`, (err, row) => {
        let user: User;
        if (row) {
            user = row;
        } else {
            user = new User(username);
        }

        botSay(twClient, channel, `${username} Level ${user.lvl} with ${user.exp} experience!`);

    });


}



export const removePoints = (username: string, amount: number, all: boolean = false) => {

    db.get(`SELECT * FROM USER WHERE username LIKE '${username}'`, (err, row) => {
        let user: User;
        if (row) {
            user = row;
        } else {
            user = new User(username);
        }

        if (all) {
            user.points = 0;
        }
        else {
            user.points = (user.points - amount < 0) ? 0 : user.points - amount;
        }
        user.dateModified = new Date();
        updateUser(user);
    });
}

export const addExp = (username: string, amount: number, type: PointsType) => {

    db.get(`SELECT * FROM USER WHERE username LIKE '${username}'`, (err, row) => {
        let user: User;
        if (row) {
            user = row;
        } else {
            user = new User(username);
        }
        if (amount > 0) {
            user.exp += amount;
        }
        else {
            switch (type) {
                case PointsType.UserMessage:
                    user.exp += 1;
                    break;
                case PointsType.SubscriberMessage:
                    user.exp += 2;
                    break;
                case PointsType.UserBonus:
                    user.exp += 5;
                    break;
                case PointsType.SubscriberBonus:
                    user.exp += 8;
                    break;
                default:
                    break;
            }
        }

        for (let i = 1; i <= 100; i++) {
            if (user.exp >= lvlRange["lvl" + i][0] && user.exp < lvlRange["lvl" + i][1]) {
                user.lvl = i;
                break;
            }
        }

        user.dateModified = new Date();
        updateUser(user);
    });
}

export const getTop = (twClient: any, channel: string, type: TopRankType, amount: number = 10) => {
    let users: string[] = [];
    let sql = "";

    switch (type) {
        case TopRankType.TopExp:
            sql = `SELECT username FROM user order by exp desc LIMIT ${amount > 10 ? 10 : amount};`;
            break;
        case TopRankType.TopSubs:
            sql = `SELECT username FROM user order by giftSub desc LIMIT ${amount > 10 ? 10 : amount};`;
            break;
        case TopRankType.TopWatchTime:
            sql = `SELECT username FROM user order by watchTime desc LIMIT ${amount > 10 ? 10 : amount};`;
            break;
        case TopRankType.TopPoints:
            sql = `SELECT username FROM user order by points desc LIMIT ${amount > 10 ? 10 : amount};`;
            break;
        default:
            return;
            break;
    }
    db.each(sql, (err, row) => {
        if (row) {
            users.push(row.username);
        }
    }, () => {
        if (users.length > 0) {
            botSay(twClient, channel, `Top ${users.length} users by ${type.toString()}: ${users.join(", ")}`);
        }
    });
}


export const updateUser = (user: User) => {
    if (user.id >= 0) {
        db.exec(`update user set points=${user.points},exp=${user.exp},dateModified='${(user.dateModified instanceof Date) ? user.dateModified.toLocaleDateString() : user.dateModified}' where id=${user.id}`, (err) => {
            if (err) {
                console.error("update user", err);
            }
        });
    } else {
        db.exec(`insert into user (username, points, exp, dateModified, watchTime) VALUES ('${user.username}',${user.points}, ${user.exp},'${(new Date).toLocaleDateString()}',${user.watchTime});`, (err) => {
            if (err) {
                console.error("insert user", err);
            }
        });
    }
}
