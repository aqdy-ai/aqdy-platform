// route for Stripe Webhook endpoint
import express, { Router } from "express";
import { paymentService } from "../services/payment.service.js";

const router = Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"] as string;

    // handleWebhook already handles logging and idempotency
    await paymentService.handleWebhook(req.body, signature);
    res.status(200).json({ received: true });
  },
);

export default router;
