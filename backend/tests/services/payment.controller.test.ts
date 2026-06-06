import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { Request, Response } from "express";

// 1. 🛡️ Define mock for the payment service
jest.unstable_mockModule("../../src/services/payment.service.js", () => ({
  paymentService: {
    createCheckoutSession: jest.fn(),
    confirmSession: jest.fn(),
    handleWebhook: jest.fn()
  }
}));

// 2. 📦 Import controller and mocked service
const { paymentService } = await import("../../src/services/payment.service.js");
const { paymentController } = await import("../../src/controllers/payment.controller.js");

describe("PaymentController Unit Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    it("should create a checkout session and return the URL", async () => {
      const mockUser = { _id: { toString: () => "user123" } };
      mockRequest = {
        user: mockUser,
        body: { planSlug: "premium" },
      } as any;

      const mockResult = { url: "http://stripe.com/session" };
      (paymentService.createCheckoutSession as jest.Mock).mockResolvedValue(mockResult);

      await paymentController.createCheckoutSession(mockRequest as any, mockResponse as Response, nextFunction);

      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith("user123", "premium");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: mockResult
      }));
    });

    it("should pass errors to next()", async () => {
      mockRequest.body = { planSlug: "premium" };
      mockRequest.user = { _id: { toString: () => "user123" } } as any;
      (paymentService.createCheckoutSession as jest.Mock).mockRejectedValue(new Error("API Error"));

      await paymentController.createCheckoutSession(mockRequest as any, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("confirmSession", () => {
    it("should confirm the session with a valid session_id", async () => {
      mockRequest.query = { session_id: "sess_123" };
      const mockResult = { status: "succeeded" };
      (paymentService.confirmSession as jest.Mock).mockResolvedValue(mockResult);

      await paymentController.confirmSession(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(paymentService.confirmSession).toHaveBeenCalledWith("sess_123");
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockResult }));
    });
  });

  describe("handleWebhook", () => {
    it("should call handleWebhook in service", async () => {
      mockRequest = {
        headers: { "stripe-signature": "sig_123" },
        body: Buffer.from("{}"),
      } as any;

      (paymentService.handleWebhook as jest.Mock).mockResolvedValue(undefined);

      await paymentController.handleWebhook(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(mockRequest.body, "sig_123");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });
  });
});