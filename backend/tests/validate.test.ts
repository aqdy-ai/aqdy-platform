/* backend/tests/validate.test.ts */
import { jest, describe, it, expect } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import {
  validate,
  validateFileUpload,
  sanitizeInput,
} from "../src/middlewares/validate.js";
import { z } from "zod";

const mockResponse = () => {
  const res = {} as Partial<Response>;
  res.status = jest.fn().mockReturnValue(res) as unknown as Response["status"];
  res.json = jest.fn().mockReturnValue(res) as unknown as Response["json"];
  return res as Response;
};

const dummySchema = z.object({
  title: z.string().min(3),
  riskLevel: z.number().min(1),
});

describe("🛡️ TypeScript Input & File Validation Middleware Tests", () => {
  describe("File Upload Edge Cases", () => {
    it("Case 1: Should reject when no file is present", () => {
      const req = { headers: {} } as Partial<Request> as Request;
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      validateFileUpload(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it("Case 2: Should reject invalid mimetypes (e.g., exe, png)", () => {
      const req = {
        file: { mimetype: "image/png", size: 1024 } as Express.Multer.File,
        headers: {},
      } as Partial<Request> as Request;
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      validateFileUpload(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("Case 3: Should reject oversized files (> 10MB)", () => {
      const req = {
        file: {
          mimetype: "application/pdf",
          size: 15 * 1024 * 1024,
        } as Express.Multer.File,
        headers: {},
      } as Partial<Request> as Request;
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      validateFileUpload(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("Case 4: Should pass valid PDF file within size limit", () => {
      const req = {
        file: {
          mimetype: "application/pdf",
          size: 2 * 1024 * 1024,
        } as Express.Multer.File,
        headers: {},
      } as Partial<Request> as Request;
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      validateFileUpload(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("API Request Body Edge Cases", () => {
    it("Case 5: Should reject empty request bodies", async () => {
      const req = { body: {}, headers: {} } as Request;
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      await validate(dummySchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("Case 6: Should reject when required fields are missing", async () => {
      const req = { body: { title: "عقد جديد" }, headers: {} } as Request;
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      await validate(dummySchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("Case 7: Should reject wrong data types", async () => {
      const req = {
        body: { title: "عقد", riskLevel: "high_instead_of_number" },
        headers: {},
      } as Request;
      const res = mockResponse();
      const next = jest.fn() as NextFunction;

      await validate(dummySchema)(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("String Sanitization Edge Cases", () => {
    it("Case 8: Should strip dangerous XSS scripts and HTML tags", () => {
      const dangerousInput = '<script>alert("hacked")</script> العقد الأصلي';
      const cleanResult = sanitizeInput(dangerousInput);

      expect(cleanResult).not.toContain("<script>");
      expect(cleanResult).toContain("&lt;script&gt;");
    });

    it("Case 9: Should clean nested objects and trim whitespaces recursively", () => {
      const dirtyObj = {
        nested: {
          text: "   نص يحمل مسافات خطرة   ",
        },
      };

      const cleanResult = sanitizeInput(dirtyObj) as {
        nested: { text: string };
      };

      expect(cleanResult).toBeTruthy();
      expect(cleanResult.nested).toBeTruthy();
      expect(cleanResult.nested.text).toBe("نص يحمل مسافات خطرة");
    });
  });
});
