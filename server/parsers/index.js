const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

async function parseDocument(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      return data.text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filePath.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimeType === 'text/plain' || filePath.endsWith('.txt')) {
      return fs.readFileSync(filePath, 'utf8');
    } else {
      throw new Error('Unsupported file type: ' + mimeType);
    }
  } catch (err) {
    console.error('Error parsing document', err);
    throw err;
  }
}

module.exports = { parseDocument };
