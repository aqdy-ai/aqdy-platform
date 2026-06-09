const fs = require('fs');
const files = ['backend/tests/services/payment.service.test.ts', 'backend/tests/unit/subscription.service.test.ts'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/as jest\.Mock<any, any\[\]>\./g, 'as jest.Mock<any, any[]>).');
  content = content.replace(/as jest\.Mock<any, any\[\]>\(\)/g, 'as jest.Mock<any, any[]>)()');
  fs.writeFileSync(file, content);
}
