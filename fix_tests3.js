const fs = require('fs');
const file = 'backend/tests/services/payment.service.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace jest.fn<currentAny, currentAny[]>() with jest.fn<(...args: currentAny[]) => currentAny>()
content = content.replace(/jest\.fn<currentAny, currentAny\[\]>\(\)/g, 'jest.fn<(...args: currentAny[]) => currentAny>()');

// Fix ISubscription assignment at line 426
content = content.replace(/subscriptionId: \{[\s\S]*?status: "active"[\s\S]*?createdAt: new Date\(\), updatedAt: new Date\(\)\s*\},/g, 'subscriptionId: { _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId().toString(), planId: { _id: new mongoose.Types.ObjectId(), name: "Pro Plan", slug: "pro", isActive: true, price: 29, billingCycle: "monthly", features: [], credits: 100, createdAt: new Date(), updatedAt: new Date() } as currentAny, status: "active", startDate: new Date(), endDate: new Date(), renewalDate: new Date(), stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", createdAt: new Date(), updatedAt: new Date() } as currentAny,');

fs.writeFileSync(file, content);
