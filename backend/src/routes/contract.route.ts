import { Router } from "express";
import {
  uploadContract,
  getContract,
} from "../controllers/contract.controller.js";
import { clauseChatController } from "../controllers/clauseChat.controller.js";
import { validate } from "../middlewares/validate.js";
import { ContractZodSchema } from "../models/contract.model.js";
import {
  authenticateJwt,
  requireAuth,
} from "../middlewares/auth.middleware.js";
import { verifyContractOwnership } from "../middlewares/contractOwnership.middleware.js";

const router = Router();

router.post("/upload", validate(ContractZodSchema), uploadContract);
router.get("/:id", getContract);

router.post(
  "/:contractId/clauses/:clauseIndexStr/chat",
  authenticateJwt,
  requireAuth,
  verifyContractOwnership,
  clauseChatController,
);

export default router;
