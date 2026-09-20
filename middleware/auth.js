"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const authorize = (req, res, next) => {
    let token = req.headers['x-access-token'];
    if (!token)
        return res.send("Access Denied");
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }
    if (!token)
        return res.send("Access Denied");
    try {
        const verified = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "JWT_SECRET");
        req.session.user_id = verified.user_id;
        req.session.token = token;
        next();
    }
    catch (err) {
        res.status(400).send("Invalid Token");
    }
};
module.exports = authorize;
