const fs = require('fs');
const file = 'backend/tests/services/payment.service.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace all plain jest.fn() with typed version
content = content.replace(/jest\.fn\(\)/g, 'jest.fn<currentAny, currentAny[]>()');

// Fix string to ObjectId error at line 425
content = content.replace(/userId: new mongoose\.Types\.ObjectId\(\)\.toString\(\),/g, 'userId: new mongoose.Types.ObjectId() as currentAny,');

// Fix subscriptionId error at line 426
content = content.replace(/planId: \{ _id: new mongoose\.Types\.ObjectId\(\), name: "Pro Plan", slug: "pro", isActive: true, price: 29, billingCycle: "monthly", features: \[\]/g, 'planId: { _id: new mongoose.Types.ObjectId(), name: "Pro Plan", slug: "pro", isActive: true, price: 29, billingCycle: "monthly", features: [] as currentAny');

// Write back
fs.writeFileSync(file, content);
