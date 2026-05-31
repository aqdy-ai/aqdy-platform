class PDFParse {
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
module.exports = { PDFParse };
