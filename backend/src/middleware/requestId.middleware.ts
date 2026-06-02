import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

interface RequestWithRequestId extends Request {
  requestId?: string;
}

export default function requestIdMiddleware(
  req: RequestWithRequestId,
  res: Response,
  next: NextFunction,
) {
  const reqId = req.headers["x-request-id"] || uuidv4();
  req.requestId = reqId;
  res.setHeader("x-request-id", reqId);
  next();
}
