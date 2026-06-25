import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { Request, Response } from "express";

// 1. 🛡️ Define mock for the payment service
jest.unstable_mockModule("../../src/services/payment.service.js", () => ({
  paymentService: {
    createCheckoutSession: jest.fn(),
    confirmSession: jest.fn(),
    handleWebhook: jest.fn(),
    getUserPayments: jest.fn(),
    getPaymentById: jest.fn(),
    generateInvoicePdf: jest.fn(),
  },
}));

// 2. 📦 Import controller and mocked service
const { paymentService } =
  await import("../../src/services/payment.service.js");
const { paymentController } =
  await import("../../src/controllers/payment.controller.js");

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
      (paymentService.createCheckoutSession as jest.Mock).mockResolvedValue(
        mockResult,
      );

      await paymentController.createCheckoutSession(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(
        "user123",
        "premium",
        "monthly",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
        }),
      );
    });

    it("should pass errors to next()", async () => {
      mockRequest.body = { planSlug: "premium" };
      mockRequest.user = { _id: { toString: () => "user123" } } as any;
      (paymentService.createCheckoutSession as jest.Mock).mockRejectedValue(
        new Error("API Error"),
      );

      await paymentController.createCheckoutSession(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("confirmSession", () => {
    it("should confirm the session with a valid session_id", async () => {
      mockRequest.query = { session_id: "sess_123" };
      const mockResult = { status: "succeeded" };
      (paymentService.confirmSession as jest.Mock).mockResolvedValue(
        mockResult,
      );

      await paymentController.confirmSession(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(paymentService.confirmSession).toHaveBeenCalledWith("sess_123");
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockResult }),
      );
    });
  });

  describe("handleWebhook", () => {
    it("should call handleWebhook in service", async () => {
      mockRequest = {
        headers: { "stripe-signature": "sig_123" },
        body: Buffer.from("{}"),
      } as any;

      (paymentService.handleWebhook as jest.Mock).mockResolvedValue(undefined);

      await paymentController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        mockRequest.body,
        "sig_123",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe("getUserPayments", () => {
    it("should return paginated payments for the authenticated user", async () => {
      const mockUser = { _id: { toString: () => "user123" } };
      mockRequest = {
        user: mockUser,
        query: { page: "1", limit: "10" },
      } as any;

      const mockPayments = {
        payments: [{ _id: "pay1", amount: 100 }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      (paymentService.getUserPayments as jest.Mock).mockResolvedValue(
        mockPayments,
      );

      await paymentController.getUserPayments(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(paymentService.getUserPayments).toHaveBeenCalledWith(
        "user123",
        1,
        10,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockPayments,
          message: "Payment history retrieved successfully",
        }),
      );
    });

    it("should pass errors to next()", async () => {
      mockRequest = { user: { _id: { toString: () => "user123" } } } as any;
      (paymentService.getUserPayments as jest.Mock).mockRejectedValue(
        new Error("DB Error"),
      );

      await paymentController.getUserPayments(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("getPaymentDetail", () => {
    it("should return a single payment detail for the authenticated user", async () => {
      const mockUser = { _id: { toString: () => "user123" } };
      mockRequest = {
        user: mockUser,
        params: { id: "pay123" },
      } as any;

      const mockPayment = { _id: "pay123", amount: 100, status: "succeeded" };
      (paymentService.getPaymentById as jest.Mock).mockResolvedValue(
        mockPayment,
      );

      await paymentController.getPaymentDetail(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(paymentService.getPaymentById).toHaveBeenCalledWith(
        "pay123",
        "user123",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockPayment,
          message: "Payment details retrieved successfully",
        }),
      );
    });

    it("should pass errors to next()", async () => {
      mockRequest = {
        user: { _id: { toString: () => "user123" } },
        params: { id: "pay123" },
      } as any;
      (paymentService.getPaymentById as jest.Mock).mockRejectedValue(
        new Error("Payment not found"),
      );

      await paymentController.getPaymentDetail(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("downloadInvoice", () => {
    it("should generate and return a PDF invoice", async () => {
      const mockUser = { _id: { toString: () => "user123" } };
      mockRequest = {
        user: mockUser,
        params: { id: "pay123" },
      } as any;

      const mockPdfBuffer = Buffer.from("mock pdf content");
      (paymentService.generateInvoicePdf as jest.Mock).mockResolvedValue(
        mockPdfBuffer,
      );

      // Mock res.setHeader and res.send
      mockResponse.setHeader = jest.fn();
      mockResponse.send = jest.fn();

      await paymentController.downloadInvoice(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(paymentService.generateInvoicePdf).toHaveBeenCalledWith(
        "pay123",
        "user123",
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf",
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        `attachment; filename="invoice-pay123.pdf"`,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it("should pass errors to next()", async () => {
      mockRequest = {
        user: { _id: { toString: () => "user123" } },
        params: { id: "pay123" },
      } as any;
      (paymentService.generateInvoicePdf as jest.Mock).mockRejectedValue(
        new Error("PDF generation failed"),
      );

      await paymentController.downloadInvoice(
        mockRequest as any,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
