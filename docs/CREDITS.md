# Credits System Architecture

## Overview

The Credits System is a quota-based mechanism for controlling user access to platform features. Users are allocated credits based on their subscription plan, and credits are deducted when they perform billable actions (contract analysis, clause chat).

**Key Features:**
- Plan-based credit allowance (topup on subscription)
- Weighted-token pricing formula for analysis
- Flat-rate pricing for clause chat
- Immutable audit trail (CreditLedger)
- Atomic deductions with zero-credit enforcement

---

## Core Concepts

### Credit Balance
- Stored in `User.creditBalance` (Number)
- Updated atomically when credits are deducted or topped up
- Can be viewed via `/api/account/credits` endpoint

### Credit Ledger
- Immutable append-only transaction log
- Records every credit movement (topup, deduction, refund)
- Enables audit trails and historical analysis

### Pricing Models
1. **Analysis (Contract Review)** - Weighted-token formula
2. **Chat (Clause Questions)** - Flat-rate per message

---

## CreditLedger Schema

### Model: `CreditLedger`

```typescript
interface ICreditLedger extends Document {
  userId: ObjectId;                    // Reference to User
  delta: number;                       // Credit change (+topup, -deduction)
  balanceAfter: number;                // User's balance after transaction
  reason: CreditLedgerReason;          // Categorizes the transaction type
  metadata: {
    tokensUsed?: number;               // Tokens consumed (for analysis)
    hostingCost?: number;              // Hosting cost breakdown
    contractId?: string;               // Associated contract (if any)
  };
  createdAt: Date;                     // Transaction timestamp
  updatedAt: Date;                     // Last modified timestamp
}
```

### Reason Types

```typescript
type CreditLedgerReason =
  | "plan_topup"              // New subscription or renewal
  | "analysis_deduction"      // Contract analysis
  | "chat_deduction"          // Clause chat message
  | "manual_adjustment"       // Admin adjustment
  | "refund";                 // Refund or reversal
```

### Indexes

- `userId` (ascending) - Fast user lookups
- `userId, createdAt` (userId ASC, createdAt DESC) - Efficient ledger queries

---

## Credits Service API

Location: `backend/src/services/credits.service.ts`

### Core Methods

#### 1. **calculateAnalysisCost(inputTokens, outputTokens) → number**

Calculates credits for a contract analysis using the weighted-token formula:

```
COST = CREDIT_BASE_FEE + ceil((inputTokens×1 + outputTokens×OUTPUT_WEIGHT) / TOKEN_UNIT)
```

**Parameters:**
- `inputTokens` (number) - Tokens in the contract text
- `outputTokens` (number) - Tokens in the LLM analysis output

**Returns:** Credits required (integer)

**Example:**
```typescript
const cost = creditsService.calculateAnalysisCost(83000, 23500);
// With defaults: 10 + ceil((83000 + 94000) / 4000) = 10 + 45 = 55 credits
```

**Formula Tuning (Environment Variables):**
- `CREDIT_BASE_FEE` - Fixed cost per analysis (default: 10)
- `CREDIT_OUTPUT_WEIGHT` - Weight multiplier for output tokens (default: 4)
- `CREDIT_TOKEN_UNIT` - Divisor for variable cost (default: 4000)

---

#### 2. **calculateChatCost(inputTokens, outputTokens) → number**

Returns flat-rate credit cost for a clause chat message.

**Parameters:**
- `inputTokens` (number) - Unused (kept for API consistency)
- `outputTokens` (number) - Unused (kept for API consistency)

**Returns:** Credits required (integer, typically 5)

**Environment Variable:**
- `CHAT_CREDIT_COST` - Cost per chat message (default: 5)

---

#### 3. **estimateCost(combinedTokens) → number**

Estimates analysis cost from a rough token count (legacy method).

Assumes 70% input tokens, 30% output tokens, then calls `calculateAnalysisCost()`.

**Parameters:**
- `combinedTokens` (number) - Approximate total tokens

**Returns:** Estimated credits

---

#### 4. **getBalance(userId) → Promise<number>**

Retrieves user's current credit balance.

**Parameters:**
- `userId` (string) - User ID

**Returns:** Current balance (integer)

**Behavior:**
- Returns `User.creditBalance` if positive
- Falls back to plan allowance if balance is 0 or undefined

---

#### 5. **ensureInitialPlanCredits(userId) → Promise<number>**

One-time bootstrap for accounts with zero balance.

**Parameters:**
- `userId` (string) - User ID

**Returns:** Current or topped-up balance

**Behavior:**
1. Get current balance
2. If balance > 0, return it
3. If balance ≤ 0 AND no prior topup found:
   - Call `topupForPlanAllowance()` to add credits from plan allowance
4. Return final balance

**Use Case:** Called before operations that require credits (analysis, chat).

---

#### 6. **getLedgerEntries(userId, limit) → Promise<ICreditLedger[]>**

Retrieves recent credit transactions for a user.

**Parameters:**
- `userId` (string) - User ID
- `limit` (number, optional) - Max entries to return (default: 20)

**Returns:** Array of CreditLedger documents (sorted by createdAt DESC)

**Use Case:** Populating credit history UI widget.

---

#### 7. **topup(userId, amount, reason) → Promise<ICreditLedger>**

Adds credits to user's account (for subscriptions, refunds, admin adjustments).

**Parameters:**
- `userId` (string) - User ID
- `amount` (number) - Credits to add (must be > 0)
- `reason` (CreditLedgerReason) - Must be in TOPUP_REASONS

**Returns:** New CreditLedger entry

**Throws:**
- 400 error if amount ≤ 0
- 400 error if reason invalid
- 404 error if user not found

**Atomic Update:**
- Increments `User.creditBalance` and creates ledger in single transaction
- Rollback on ledger save failure

**Allowed Reasons:**
- `plan_topup` - Subscription credit grant
- `manual_adjustment` - Admin action
- `refund` - Refund credit reversal

---

#### 8. **topupForPlanAllowance(userId) → Promise<ICreditLedger | null>**

Grants credits based on user's current subscription plan.

**Parameters:**
- `userId` (string) - User ID

**Returns:** New ledger entry if topup successful, null if plan not found or allowance is 0

**Behavior:**
1. Fetch user's subscription and associated plan
2. Extract `plan.creditAllowance`
3. Call `topup()` with reason `"plan_topup"`
4. Return result

**Use Cases:**
- Called after successful payment (Stripe webhook)
- Called on subscription renewal
- Called during plan upgrade

---

#### 9. **deduct(userId, cost, metadata) → Promise<ICreditLedger>**

Deducts credits for a billable action (analysis, chat).

**Parameters:**
- `userId` (string) - User ID
- `cost` (number) - Credits to deduct (must be > 0)
- `metadata` (CreditMetadata, optional):
  - `tokensUsed`: number - Tokens consumed
  - `hostingCost`: number - Hosting cost in cents
  - `contractId`: string - Related contract ID
  - `reason`: CreditLedgerReason - Must be in DEDUCTION_REASONS

**Returns:** New CreditLedger entry

**Throws:**
- 400 error if cost ≤ 0
- 400 error if reason invalid
- **402 InsufficientCreditsError** if balance < cost

**Atomic Update:**
- Only succeeds if `User.creditBalance ≥ cost` (zero-credit gate)
- Atomically decrements balance
- Creates immutable ledger entry
- Rolls back ledger save if create fails

**Allowed Reasons:**
- `analysis_deduction` - Contract analysis
- `chat_deduction` - Clause chat message
- `manual_adjustment` - Admin action

**Example:**
```typescript
try {
  const cost = creditsService.calculateAnalysisCost(83000, 23500); // 55
  await creditsService.deduct(userId, cost, {
    tokensUsed: 83000 + 23500,
    contractId: contractId,
    reason: "analysis_deduction",
  });
} catch (err) {
  if (err instanceof InsufficientCreditsError) {
    res.status(402).json({ error: "Insufficient credits" });
  }
}
```

---

## Credit Allowance Per Plan

Located in `Plan.creditAllowance` field.

### Example Plan Configuration

| Plan | Monthly Analyses | Chat Messages | Credit Allowance |
|------|------------------|---------------|------------------|
| **Free** | 5 | 10 | 50 |
| **Pro** | 30 | 100 | 500 |
| **Enterprise** | Unlimited | Unlimited | -1 (unlimited) |

### How Credits Are Granted

1. User subscribes to a plan
2. Stripe webhook (`checkout.session.completed`) triggers `fulfillSubscription()`
3. Backend calls `creditsService.topupForPlanAllowance(userId)`
4. Credits are added to `User.creditBalance`
5. CreditLedger entry created with reason `"plan_topup"`

---

## Token Rate Formula

### For Analysis (Contract Review)

```
COST = CREDIT_BASE_FEE + ceil((INPUT_TOKENS×1 + OUTPUT_TOKENS×CREDIT_OUTPUT_WEIGHT) / CREDIT_TOKEN_UNIT)
```

**Components:**

| Component | Default | Purpose |
|-----------|---------|---------|
| `CREDIT_BASE_FEE` | 10 | Minimum cost per analysis |
| `OUTPUT_WEIGHT` | 4 | Importance of output tokens relative to input |
| `TOKEN_UNIT` | 4000 | Divisor for variable cost (tokens per unit) |

**Example Calculation:**

For a typical 15-clause contract:
- Input: 83,000 tokens (contract text)
- Output: 23,500 tokens (analysis results)

```
COST = 10 + ceil((83000×1 + 23500×4) / 4000)
     = 10 + ceil((83000 + 94000) / 4000)
     = 10 + ceil(44.25)
     = 10 + 45
     = 55 credits
```

### Environment Variables for Configuration

Add to `.env`:

```bash
# Analysis credit pricing (weighted-token formula)
CREDIT_BASE_FEE=10              # Fixed cost per analysis
CREDIT_OUTPUT_WEIGHT=4          # Output token weight (vs input)
CREDIT_TOKEN_UNIT=4000          # Tokens per unit (higher = cheaper)

# Chat credit pricing (flat-rate)
CHAT_CREDIT_COST=5              # Cost per chat message

# Legacy (deprecated, kept for backward compatibility)
CREDIT_BASE_COST=0
CREDIT_TOKEN_RATE=0.001
CREDIT_CHAT_BASE=3
```

### How to Adjust Pricing

**To make analysis cheaper (more tokens per unit):**
```bash
CREDIT_TOKEN_UNIT=5000    # Instead of 4000
```

**To add a higher analysis base fee:**
```bash
CREDIT_BASE_FEE=15        # Instead of 10
```

**To charge more for output tokens:**
```bash
CREDIT_OUTPUT_WEIGHT=5    # Instead of 4
```

---

## How Deductions Work

### Analysis Deduction Flow

1. **Request arrives** at `POST /api/analysis/:contractId`

2. **Pre-flight check** (middleware):
   - Estimate token cost: `estimateCost(contractText.length / 4)`
   - Check if user has sufficient credits

3. **Deduction (before analysis)**:
   ```typescript
   const inputTokens = countTokens(contractText);
   const cost = creditsService.calculateAnalysisCost(inputTokens, 0); // Rough estimate
   await creditsService.deduct(userId, cost, {
     contractId,
     reason: "analysis_deduction",
   });
   ```

4. **If deduction fails** (InsufficientCreditsError):
   - Return 402 status
   - No analysis performed
   - No credits deducted

5. **If deduction succeeds**:
   - Analysis runs
   - Results stored
   - CreditLedger entry created

### Chat Deduction Flow

1. **Request arrives** at `POST /api/contracts/:contractId/clauses/:clauseIndex/chat`

2. **Credit check** (in controller):
   ```typescript
   const creditCost = creditsService.calculateChatCost(0, 0); // Flat rate
   const balance = await creditsService.ensureInitialPlanCredits(userId);
   if (balance < creditCost) {
     res.status(402).json({ error: "Insufficient credits" });
     return;
   }
   ```

3. **Deduction** (during chat stream):
   ```typescript
   await creditsService.deduct(userId, creditCost, {
     contractId,
     reason: "chat_deduction",
   });
   ```

4. **Stream response** to user via SSE

---

## API Endpoints for Credits

### GET /api/account/credits

Retrieve user's credit balance and transaction history.

**Authentication:** Required (cookie-based)

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 125,
    "planAllowance": 500,
    "ledger": [
      {
        "_id": "...",
        "userId": "...",
        "delta": -10,
        "balanceAfter": 125,
        "reason": "analysis_deduction",
        "metadata": {
          "tokensUsed": 15000,
          "contractId": "6a2c6b906b46d52bf0d9849b"
        },
        "createdAt": "2026-06-12T10:30:00Z"
      }
    ]
  },
  "message": "Credits retrieved successfully."
}
```

**Status Codes:**
- **200** - Success
- **401** - Not authenticated
- **500** - Server error

---

## Integration Examples

### Checking Credits Before Analysis

```typescript
import { creditsService } from "../services/credits.service.js";

async function analyzeContract(userId, contractText) {
  // Calculate estimated cost
  const estimatedCost = creditsService.estimateCost(contractText.length / 4);
  
  // Check balance
  const balance = await creditsService.getBalance(userId);
  if (balance < estimatedCost) {
    throw new InsufficientCreditsError(
      `Need ${estimatedCost} credits, but only have ${balance}`
    );
  }
  
  // Deduct credits
  await creditsService.deduct(userId, estimatedCost, {
    contractId: contractId,
    reason: "analysis_deduction",
  });
  
  // Perform analysis
  // ...
}
```

### Granting Credits on Subscription

```typescript
// In Stripe webhook handler (payment.service.ts)
async function fulfillSubscription(userId) {
  // ... create subscription ...
  
  // Grant credits from plan allowance
  const ledgerEntry = await creditsService.topupForPlanAllowance(userId);
  
  logger.info("Subscription fulfilled and credits granted", {
    userId,
    creditsGranted: ledgerEntry?.delta,
  });
}
```

---

## Best Practices

### For Backend Developers

1. **Always check credits before deduction**
   - Prevents "insufficient credits" errors during processing
   - Show error to user before expensive operations

2. **Use proper deduction reasons**
   - Enables audit trails and analytics
   - Helps identify issues (e.g., buggy chat costing too much)

3. **Capture metadata**
   - Store tokens used, contracts, hosting costs
   - Enables debugging and cost analysis

4. **Handle InsufficientCreditsError**
   ```typescript
   try {
     await creditsService.deduct(userId, cost, metadata);
   } catch (err) {
     if (err instanceof InsufficientCreditsError) {
       res.status(402).json({ error: err.message });
     } else {
       throw err;
     }
   }
   ```

### For Operations/Admins

1. **Monitor credit allocation**
   - Use admin endpoints to review payments and subscriptions
   - Adjust plan allowances if pricing needs changes

2. **Manual adjustments**
   - Use `creditsService.topup(userId, amount, "manual_adjustment")`
   - For refunds or special cases

3. **Environment variable tuning**
   - Adjust `CREDIT_TOKEN_UNIT` to make features cheaper/expensive
   - Monitor real token counts via CreditLedger metadata

---

## Troubleshooting

### Q: User sees "Insufficient credits" but dashboard shows balance > 0

**A:** The dashboard might be stale. Verify:
1. Check actual balance: `User.creditBalance` in DB
2. Check ledger: latest deduction reason (contract or chat?)
3. Check if deduction happened: review CreditLedger for userId

### Q: Credits not being granted after payment

**A:** Check:
1. Stripe webhook received: search `payment.service.ts` logs
2. `topupForPlanAllowance()` called successfully
3. Plan has `creditAllowance > 0`
4. User subscription linked to correct plan

### Q: Chat costs too much / too little

**A:** Adjust environment variable:
```bash
CHAT_CREDIT_COST=3    # Reduce from default 5
```

Restart backend and chat again.

### Q: Analysis costs are unpredictable

**A:** Check token counts in CreditLedger:
1. Find ledger entry for the analysis
2. Check `metadata.tokensUsed`
3. Verify formula: `BASE_FEE + ceil((tokens / TOKEN_UNIT))`
4. If wildly off, check `CREDIT_OUTPUT_WEIGHT` value

---

## Related Documentation

- [PAYMENTS.md](PAYMENTS.md) - Subscription and billing system
- [USER_GUIDE.md](USER_GUIDE.md) - Credits widget and plan upgrade flow
- [backend/src/services/credits.service.ts](../backend/src/services/credits.service.ts) - Full implementation
- [backend/src/models/creditLedger.model.ts](../backend/src/models/creditLedger.model.ts) - Schema definition
