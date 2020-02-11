import sqlite3 from 'sqlite3';
import { botSay } from './util';

let db = new sqlite3.Database("C:\\sqlite\\twitchBot.db");

class User {
    readonly id: number = -1;
    username: string;
    points: number = 0;
    dateModified: Date = new Date();
    exp: number = 0;
    watchTime: number = 0;
    lvl: number = 1;

    constructor(username: string) {
        this.username = username;
    }
}

export enum PointsType {
    SubscriberBonus, UserBonus, UserMessage, SubscriberMessage, None
}

export const addPointsUserRange = (chatters: any, subs: string[]) => {

    chatters.moderators.forEach((username: string) => {
        addPoints(username, 0, PointsType.SubscriberBonus);
    });

    chatters.admins.forEach((username: string) => {
        addPoints(username, 0, PointsType.SubscriberBonus);
    });

    chatters.global_mods.forEach((username: string) => {
        addPoints(username, 0, PointsType.SubscriberBonus);
    });

    chatters.viewers.forEach((username: string) => {
        addPoints(username, 0, subs.includes(username) ? PointsType.SubscriberBonus : PointsType.UserBonus);
    });
}

export const addPoints = (username: string, amount: number = 0, type: PointsType = PointsType.None) => {

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
                    break;
                case PointsType.SubscriberMessage:
                    user.points += 2;
                    break;
                case PointsType.UserBonus:
                    user.points += 10;
                    break;
                case PointsType.SubscriberBonus:
                    user.points += 15;
                    break;
                default:
                    break;
            }
        }
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
        updateUser(user);
    });
}


const updateUser = (user: User) => {

    if (user.id >= 0) {
        db.exec(`update user set points=${user.points},exp=${user.exp},dateModified='${user.dateModified.toLocaleDateString()}', where id=${user.id}`, (err) => {
            console.error(err);
        });
    } else {
        db.exec(`insert into user (username, points, exp, dateModified, watchTime) VALUES (${user.username},${user.points}, ${user.exp},'${(new Date).toLocaleDateString()}',watchTime=${user.watchTime});`, (err) => {
            console.error(err);
        });
    }
}
