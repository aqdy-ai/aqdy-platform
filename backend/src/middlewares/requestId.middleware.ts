import { Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { RequestWithId } from "../types/audit.js";

export default function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) {
  const reqId =
    typeof req.headers["x-request-id"] === "string"
      ? req.headers["x-request-id"]
      : uuidv4();
  req.requestId = reqId;
  res.setHeader("x-request-id", reqId);
  next();
}
