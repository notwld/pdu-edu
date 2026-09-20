import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { Request, Response, NextFunction } from 'express';
interface JwtPayload {
    user_id: number
  }
const authorize = (req : Request, res : Response, next : NextFunction) => {
    let token = req.headers['x-access-token'] as string
    if(!token) return res.send("Access Denied")
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length)
    }
    if (!token) return res.send("Access Denied")
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET||"JWT_SECRET")  as JwtPayload
        req.session.user_id = verified.user_id
        req.session.token = token
        next()
    } catch (err) {
        res.status(400).send("Invalid Token")
    }
}

module.exports = authorize;