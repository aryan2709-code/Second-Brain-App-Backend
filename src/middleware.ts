import { Request , Response, NextFunction } from "express";
import { JWT_PASSWORD } from "./config";
import jwt,{JwtPayload} from "jsonwebtoken";





export const UserMiddleware = (req:Request , res:Response , next: NextFunction) => {
    const header = req.headers.authorization;

    const decoded = jwt.verify(header as string , JWT_PASSWORD) as JwtPayload;
    if(decoded)
    {
        req.userId = decoded.userId;
        next()
    }
    else
    {
        res.status(403).json({
            message : "You are not logged in"
        })
    }
}