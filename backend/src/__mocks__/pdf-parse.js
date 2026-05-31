import { jest } from '@jest/globals';

export class PDFParse {
  constructor(options) {
    this.options = options;
  }
  async getText() {
    return {
      text: 'Mock PDF content for testing',
      total: 1
    };
  }
  async destroy() {}
}

const pdfParse = jest.fn().mockResolvedValue({
  text: 'Mock PDF content for testing',
  numpages: 1,
  info: {},
  metadata: {},
  version: '1.10.100'
});

export default pdfParse;
