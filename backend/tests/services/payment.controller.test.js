import { jest, describe, it, expect, beforeEach } from "@jest/globals";
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
const { paymentService } = await import("../../src/services/payment.service.js");
const { paymentController } = await import("../../src/controllers/payment.controller.js");
describe("PaymentController Unit Tests", () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        nextFunction = jest.fn();
        jest.clearAllMocks();
    });
    describe("createCheckoutSession", () => {
        it("should create a checkout session and return the URL", async () => {
            const mockUser = { _id: { toString: () => "user123" } };
            mockRequest = {
                user: mockUser,
                body: { planSlug: "premium" },
            };
            const mockResult = { url: "http://stripe.com/session" };
            paymentService.createCheckoutSession.mockResolvedValue(mockResult);
            await paymentController.createCheckoutSession(mockRequest, mockResponse, nextFunction);
            expect(paymentService.createCheckoutSession).toHaveBeenCalledWith("user123", "premium", "monthly");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockResult,
            }));
        });
        it("should pass errors to next()", async () => {
            mockRequest.body = { planSlug: "premium" };
            mockRequest.user = { _id: { toString: () => "user123" } };
            paymentService.createCheckoutSession.mockRejectedValue(new Error("API Error"));
            await paymentController.createCheckoutSession(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
    });
    describe("confirmSession", () => {
        it("should confirm the session with a valid session_id", async () => {
            mockRequest.query = { session_id: "sess_123" };
            const mockResult = { status: "succeeded" };
            paymentService.confirmSession.mockResolvedValue(mockResult);
            await paymentController.confirmSession(mockRequest, mockResponse, nextFunction);
            expect(paymentService.confirmSession).toHaveBeenCalledWith("sess_123");
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockResult }));
        });
    });
    describe("handleWebhook", () => {
        it("should call handleWebhook in service", async () => {
            mockRequest = {
                headers: { "stripe-signature": "sig_123" },
                body: Buffer.from("{}"),
            };
            paymentService.handleWebhook.mockResolvedValue(undefined);
            await paymentController.handleWebhook(mockRequest, mockResponse, nextFunction);
            expect(paymentService.handleWebhook).toHaveBeenCalledWith(mockRequest.body, "sig_123");
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
            };
            const mockPayments = {
                payments: [{ _id: "pay1", amount: 100 }],
                pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
            };
            paymentService.getUserPayments.mockResolvedValue(mockPayments);
            await paymentController.getUserPayments(mockRequest, mockResponse, nextFunction);
            expect(paymentService.getUserPayments).toHaveBeenCalledWith("user123", 1, 10);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockPayments,
                message: "Payment history retrieved successfully",
            }));
        });
        it("should pass errors to next()", async () => {
            mockRequest = { user: { _id: { toString: () => "user123" } } };
            paymentService.getUserPayments.mockRejectedValue(new Error("DB Error"));
            await paymentController.getUserPayments(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
    });
    describe("getPaymentDetail", () => {
        it("should return a single payment detail for the authenticated user", async () => {
            const mockUser = { _id: { toString: () => "user123" } };
            mockRequest = {
                user: mockUser,
                params: { id: "pay123" },
            };
            const mockPayment = { _id: "pay123", amount: 100, status: "succeeded" };
            paymentService.getPaymentById.mockResolvedValue(mockPayment);
            await paymentController.getPaymentDetail(mockRequest, mockResponse, nextFunction);
            expect(paymentService.getPaymentById).toHaveBeenCalledWith("pay123", "user123");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockPayment,
                message: "Payment details retrieved successfully",
            }));
        });
        it("should pass errors to next()", async () => {
            mockRequest = {
                user: { _id: { toString: () => "user123" } },
                params: { id: "pay123" },
            };
            paymentService.getPaymentById.mockRejectedValue(new Error("Payment not found"));
            await paymentController.getPaymentDetail(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
    });
    describe("downloadInvoice", () => {
        it("should generate and return a PDF invoice", async () => {
            const mockUser = { _id: { toString: () => "user123" } };
            mockRequest = {
                user: mockUser,
                params: { id: "pay123" },
            };
            const mockPdfBuffer = Buffer.from("mock pdf content");
            paymentService.generateInvoicePdf.mockResolvedValue(mockPdfBuffer);
            // Mock res.setHeader and res.send
            mockResponse.setHeader = jest.fn();
            mockResponse.send = jest.fn();
            await paymentController.downloadInvoice(mockRequest, mockResponse, nextFunction);
            expect(paymentService.generateInvoicePdf).toHaveBeenCalledWith("pay123", "user123");
            expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
            expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Disposition", `attachment; filename="invoice-pay123.pdf"`);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith(mockPdfBuffer);
        });
        it("should pass errors to next()", async () => {
            mockRequest = {
                user: { _id: { toString: () => "user123" } },
                params: { id: "pay123" },
            };
            paymentService.generateInvoicePdf.mockRejectedValue(new Error("PDF generation failed"));
            await paymentController.downloadInvoice(mockRequest, mockResponse, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=payment.controller.test.js.map