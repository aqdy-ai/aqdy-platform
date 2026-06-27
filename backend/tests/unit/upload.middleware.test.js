import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import multer from "multer";
import { handleUploadError, upload, } from "../../src/middlewares/upload.middleware.js";
import { sanitizeText } from "../../src/middlewares/security.middleware.js";
describe("Upload Middleware", () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    let mockStatus;
    let mockJson;
    beforeEach(() => {
        mockStatus = jest.fn().mockReturnThis();
        mockJson = jest.fn();
        mockResponse = {
            status: mockStatus,
            json: mockJson,
        };
        mockNext = jest.fn();
        mockRequest = {};
    });
    describe("handleUploadError", () => {
        test("should handle LIMIT_FILE_SIZE multer error", () => {
            const err = new multer.MulterError("LIMIT_FILE_SIZE");
            handleUploadError(err, mockRequest, mockResponse, mockNext);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: "File size exceeds 10MB limit.",
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        test("should handle generic multer error", () => {
            const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE", "field");
            handleUploadError(err, mockRequest, mockResponse, mockNext);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: err.message,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        test("should handle general Error", () => {
            const err = new Error("Invalid file type. Only PDF and DOCX files are allowed.");
            handleUploadError(err, mockRequest, mockResponse, mockNext);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: "Invalid file type. Only PDF and DOCX files are allowed.",
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        test("should call next() if no error is passed", () => {
            handleUploadError(undefined, mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockStatus).not.toHaveBeenCalled();
        });
    });
    describe("fileFilter validation configurations", () => {
        const fileFilter = upload.fileFilter;
        test("should accept application/pdf mime type", () => {
            const mockFile = { mimetype: "application/pdf" };
            const callback = jest.fn();
            fileFilter({}, mockFile, callback);
            expect(callback).toHaveBeenCalledWith(null, true);
        });
        test("should accept valid DOCX mime type", () => {
            const mockFile = {
                mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            };
            const callback = jest.fn();
            fileFilter({}, mockFile, callback);
            expect(callback).toHaveBeenCalledWith(null, true);
        });
        test("should reject invalid file types (.exe, .txt, .jpg, .zip)", () => {
            const invalidTypes = [
                "application/x-msdownload", // .exe
                "text/plain", // .txt
                "image/jpeg", // .jpg
                "application/zip", // .zip
            ];
            for (const mime of invalidTypes) {
                const mockFile = { mimetype: mime };
                const callback = jest.fn();
                fileFilter({}, mockFile, callback);
                expect(callback).toHaveBeenCalledWith(expect.any(Error));
                expect(callback.mock.calls[0][0].message).toBe("Invalid file type. Only PDF and DOCX files are allowed.");
            }
        });
        test("should block double extension filenames or bypasses based on mimetype filtering", () => {
            // Standard upload filter blocks via mimetype, ensuring double extension mime mappings (like .pdf.exe -> application/x-msdownload) fail
            const mockFile = {
                originalname: "exploit.pdf.exe",
                mimetype: "application/x-msdownload",
            };
            const callback = jest.fn();
            fileFilter({}, mockFile, callback);
            expect(callback).toHaveBeenCalledWith(expect.any(Error));
        });
        test("should properly sanitize filenames containing XSS script payloads", () => {
            const taintedFilename = "<script>alert('xss')</script>contract_final.pdf";
            const cleanFilename = sanitizeText(taintedFilename);
            expect(cleanFilename).toBe("contract_final.pdf");
        });
    });
});
//# sourceMappingURL=upload.middleware.test.js.map