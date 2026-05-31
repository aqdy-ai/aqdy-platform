import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export default function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const reqId = req.headers["x-request-id"] || uuidv4();
  (req as any).requestId = reqId;
  res.setHeader("x-request-id", reqId);
  next();
}
