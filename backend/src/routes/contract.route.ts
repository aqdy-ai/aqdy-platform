import { Router } from "express";
import { uploadContract, getContract } from "../controllers/contract.controller.js";
import { validate } from "../middlewares/validate.js";
import { ContractZodSchema } from "../models/contract.model.js";

const router = Router();

router.post("/upload", validate(ContractZodSchema), uploadContract);
router.get("/:id", getContract);

export default router;