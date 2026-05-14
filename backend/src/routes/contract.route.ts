import { Router } from "express";
import { uploadContract } from "../controllers/contract.controller.js";
import { validate } from "../middlewares/validate.js";
import { ContractZodSchema } from "../models/contract.model.js";

const router = Router();

/**
 * POST /api/contracts/upload
 * Upload a contract for analysis.
 *
 * Body: { filename, language, text, userId, fileSize }
 */
router.post("/upload", validate(ContractZodSchema), uploadContract);

export default router;
