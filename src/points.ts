import sqlite3 from 'sqlite3';

let db = new sqlite3.Database("C:\\sqlite\\twitchBot.db");

class User {
    readonly id: number = -1;
    username: string;
    points: number = 0;
    dateModified: Date = new Date();
    exp: number = 0;
    watchTime: number = 0;

    constructor(username: string) {
        this.username = username;
    }
}

export enum PointsType {
    SubscriberBonus, FollowerBonus, FollowerMessage, SubscriberMessage, None
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
                // case PointsType.User:
                //     user.points += 9;
                //     break;
                case PointsType.FollowerMessage:
                    user.points += 10;
                    break;
                case PointsType.SubscriberMessage:
                    user.points += 12;
                    break;
                case PointsType.FollowerBonus:
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
