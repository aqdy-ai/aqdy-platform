import { Router, Request, Response } from "express";
import { ApiResponse } from "../types";

const router = Router();

router.get("/health", (req: Request, res: Response) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  };
  res.status(200).json(response);
});

export default router;
