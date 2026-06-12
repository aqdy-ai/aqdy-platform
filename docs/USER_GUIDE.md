# User Guide — Aqdy Platform

Welcome to Aqdy! This guide walks you through all features of the Aqdy Platform, including contract analysis, plan management, and billing.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Uploading Contracts](#uploading-contracts)
4. [Contract Analysis](#contract-analysis)
5. [Clause Chat](#clause-chat)
6. [Credits System](#credits-system)
7. [Plan Management & Upgrades](#plan-management--upgrades)
8. [Billing & Payments](#billing--payments)
9. [Contract History](#contract-history)
10. [Exporting Analysis Results](#exporting-analysis-results)
11. [Account Settings](#account-settings)
12. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Getting Started

### Creating an Account

1. Visit [aqdy.ai](https://aqdy.ai) and click **Sign Up**
2. Enter your details:
   - Full Name
   - Email address
   - Strong password (8+ characters, must include uppercase, lowercase, number, and special character)
3. Click **Create Account**
4. Verify your email (if prompted)
5. You're all set! You'll automatically receive a **Free Plan** with 50 credits

### Logging In

- Visit [aqdy.ai/login](https://aqdy.ai/login)
- Enter your email and password
- Click **Sign In**

### Resetting Your Password

1. Click **Forgot Password?** on the login page
2. Enter your email address
3. Check your email for a reset link
4. Follow the link and create a new password
5. Log back in with your new password

---

## Dashboard Overview

After logging in, you'll see the main dashboard with:

### Dashboard Sections

**Left Sidebar:**
- 📄 **Contracts** - List of all uploaded contracts
- 💬 **Chat** - Clause Q&A conversations (premium feature)
- ⚙️ **Account** - Profile and settings
- 📊 **Analytics** - Usage stats and credits

**Main Content Area:**
- Recent contracts
- Analysis results
- Quick actions

### Top Bar

- **User Menu** (top right) - Profile, settings, logout
- **Notifications** (if any payment or quota alerts)

---

## Uploading Contracts

### Upload a New Contract

1. Click **Upload Contract** button
2. Select a file (PDF, DOCX, or plain text)
3. Choose the language:
   - **English (en)** for contracts in English
   - **Arabic (ar)** for contracts in Arabic
4. Click **Upload**

**Supported Formats:**
- PDF documents
- Microsoft Word (.docx)
- Plain text (.txt)
- Maximum file size: 50 MB

**Processing:**
- Small contracts: ~30 seconds
- Large contracts (20+ pages): ~2-3 minutes
- Status appears in real-time

### Storage Limits

Your storage allowance depends on your plan:

| Plan | Storage Limit |
|------|---------------|
| **Free** | 10 contracts |
| **Pro** | 100 contracts |
| **Enterprise** | Unlimited |

Once you reach your limit, upload a new contract by:
1. Deleting an old contract, or
2. Upgrading your plan

---

## Contract Analysis

### Starting an Analysis

After uploading a contract, click **Analyze** to:
1. Extract all clauses from the contract
2. Classify each clause by risk level
3. Generate redline suggestions for high-risk clauses
4. Provide explanations in your language

### Analysis Breakdown

**Results show:**

1. **Executive Summary**
   - Overall risk level (Low, Medium, High, Critical)
   - Number of total clauses
   - Number of risky clauses
   - AI-generated summary

2. **Clause-by-Clause Analysis**
   - Clause text
   - Risk level with confidence score
   - AI explanation (in your language)
   - Recommended redline (safer alternative wording)

3. **Risk Levels**
   - 🟢 **Low** - Standard, acceptable clause
   - 🟡 **Medium** - Needs review; consider negotiating
   - 🔴 **High** - Potentially problematic; recommend changes
   - 🔴🔴 **Critical** - High-risk clause; strongly recommend redlining

### Credits Required

Each analysis costs credits based on the contract size:

- **Base cost:** 10 credits (per analysis)
- **Variable cost:** Additional credits based on contract length

**Example:**
- 15-clause contract: ~55 credits
- 5-clause contract: ~20 credits
- 50-clause contract: ~150 credits

**View your credit balance:**
- See "Credits: X remaining" in the top right
- Click to open the credits widget for details

---

## Clause Chat

### Ask Questions About a Clause

After analyzing a contract, click **Chat** on any clause card to:
- Ask questions about that specific clause
- Get AI-powered explanations
- Discuss negotiation strategies

### Example Questions

- "What does this liability cap mean?"
- "Is this indemnification clause standard?"
- "How can we negotiate this clause?"
- "What's a safer alternative to this language?"

### Chat Guidelines

- **Focused:** Chat only answers questions about the specific clause
- **Grounded:** Answers are based on the clause text and analysis context
- **Language:** Respond in your language (English or Arabic)
- **Out of Scope:** Cannot answer questions unrelated to the clause

### Chat Rate Limits

- **Free Plan:** 10 messages per clause, per day
- **Pro Plan:** 100 messages per clause, per day
- **Enterprise:** Unlimited

### Credits for Chat

Each chat message costs **5 credits**

**Example:**
- 10 chat messages: 50 credits
- 100 chat messages: 500 credits

---

## Credits System

### Understanding Credits

Credits are a quota system that limits your usage of Aqdy features. Every analysis and chat message costs credits.

**Your credit balance resets monthly** when your subscription renews.

### Viewing Your Credits

1. Click the **Credits Widget** in the top right (shows "Credits: X remaining")
2. See:
   - Current balance
   - Plan allowance (monthly limit)
   - Progress bar
   - Recent transactions (topups, deductions)

### Credit Transactions

**Transactions include:**
- ✅ **Topups** - Monthly plan allowance
- ✅ **Topups** - Plan upgrades (prorated)
- ❌ **Deductions** - Contract analysis
- ❌ **Deductions** - Clause chat messages

### Running Out of Credits

**If you have insufficient credits:**
- Analysis: 402 error "Insufficient credits"
- Chat: "Not enough credits for this message"

**To continue:**
1. Upgrade your plan (get more monthly credits)
2. Wait for next billing cycle

### Credit Allowance by Plan

| Plan | Monthly Credits | Analyses | Chat Messages |
|------|-----------------|----------|---------------|
| **Free** | 50 | ~1 large contract | ~10 messages |
| **Pro** | 500 | ~10 large contracts | ~100 messages |
| **Enterprise** | Unlimited | Unlimited | Unlimited |

---

## Plan Management & Upgrades

### Current Plan

View your current plan on the **Account** page:
- Plan name and billing cycle
- Features included
- Renewal date
- Monthly credit allowance

### Upgrading Your Plan

1. Click **Upgrade Plan** button
2. Select a new plan:
   - **Free** - No payment, limited credits
   - **Pro** - Best for individuals, $9.99/month
   - **Enterprise** - For teams, custom pricing
3. Choose billing cycle:
   - **Monthly** - $9.99/month
   - **Annual** - $99/year (save 2 months!)
4. Click **Upgrade Now**
5. Complete payment on Stripe Checkout
6. Credits are immediately added to your account
7. Your new plan is active

### Payment Processing

- **Payment Method:** Stripe (secure)
- **Payment Confirmation:** Email receipt
- **Redirect:** Back to dashboard after payment

### Plan Downgrade

To downgrade from Pro to Free:
1. Go to **Account** → **Subscription**
2. Click **Downgrade Plan**
3. Confirm downgrade
4. Your subscription changes at end of current billing period
5. You'll lose access to paid features but can keep existing data

### Cancelling Your Subscription

To cancel:
1. Go to **Account** → **Subscription**
2. Click **Cancel Subscription**
3. Confirm cancellation
4. Your subscription ends at end of current billing period
5. You can reactivate anytime by upgrading

---

## Billing & Payments

### Payment History

View all past payments:
1. Go to **Account** → **Billing**
2. See list of transactions with dates and amounts
3. Click **View Invoice** to download PDF receipt

### Downloading Invoices

1. Go to **Account** → **Billing**
2. Find the payment in the list
3. Click **Download Invoice**
4. PDF downloads (filename: `invoice-{id}.pdf`)
5. Save for tax or accounting records

### Payment Methods

Payments are processed via **Stripe**:
- Visa / Mastercard
- American Express
- Other cards supported by Stripe
- No PayPal or cryptocurrency

### Billing Cycle

- **Monthly plans** renew on the same day each month
- **Annual plans** renew once per year
- Renew automatically using saved payment method
- Invoice sent to your email on renewal date

### Failed Payments

If a payment fails:
1. Email notification sent
2. Your subscription moves to "Past Due"
3. Features may be limited
4. Update payment method in Stripe billing portal
5. Stripe retries payment automatically

---

## Contract History

### View Contract History

Track all changes to a contract:

1. Open any contract
2. Click **History** tab
3. See timeline of all edits and analyses

**History includes:**
- When contract was uploaded
- Who made changes (if shared)
- Analysis dates and results
- Notes and annotations

### Export History

Export contract history as JSON or CSV:

1. Open contract history
2. Click **Export**
3. Choose format (JSON or CSV)
4. File downloads to your computer

### Restore from History

You can restore a previous version of analysis results:

1. Open History tab
2. Click **Restore** on an older version
3. Confirm restoration
4. Previous results are restored

---

## Exporting Analysis Results

### Export Formats

Export your analysis results in multiple formats:

**Supported Formats:**
- 📄 **PDF** - Professional report with charts
- 📊 **CSV** - Spreadsheet of clauses and risk levels
- 📝 **JSON** - Raw data for integration
- 📋 **DOCX** - Microsoft Word document

### Export Analysis

1. Open a contract analysis
2. Click **Export** button
3. Choose format
4. Select which sections to include:
   - Executive summary
   - All clauses
   - Risk summary
   - Redline suggestions
5. Click **Export**
6. File downloads to your computer

### PDF Report

The PDF includes:
- Cover page with contract name and date
- Executive summary with charts
- Clause-by-clause breakdown
- Risk distribution summary
- Recommendations

### CSV Export

The CSV includes:
- Clause number
- Clause text
- Risk level
- Confidence score
- Explanation
- Redline suggestion

Perfect for importing into Excel or Sheets for further analysis!

---

## Account Settings

### Profile

View and edit your profile:

1. Go to **Account** → **Profile**
2. Update:
   - Full Name
   - Email address
   - Password
3. Click **Save Changes**

**Changing your email:**
- You'll need to verify the new email address
- Check your new email for a verification link

**Changing your password:**
- Required: Current password for security
- New password must be 8+ characters with uppercase, lowercase, number, and special character

### Language Preferences

Set your preferred language for analysis results and UI:

1. Go to **Account** → **Settings**
2. Select language:
   - English (en)
   - Arabic (ar)
3. Click **Save**

**Note:** This is your preference for future analyses. Existing analyses remain in their original language.

### Notifications

Manage email notifications:

1. Go to **Account** → **Notifications**
2. Toggle on/off:
   - Analysis complete emails
   - Payment confirmations
   - Plan renewal reminders
   - Credit low-balance alerts
3. Click **Save**

### Delete Account

⚠️ **Warning: This is permanent and cannot be undone!**

To delete your account:
1. Go to **Account** → **Settings** → **Danger Zone**
2. Click **Delete Account**
3. Type your email to confirm
4. Click **I understand, delete my account**
5. All data is permanently deleted

---

## FAQ & Troubleshooting

### Q: How long does contract analysis take?

**A:** 
- Small contracts (1-5 pages): 30 seconds - 1 minute
- Medium contracts (5-15 pages): 1-2 minutes
- Large contracts (15+ pages): 2-5 minutes

The status bar shows real-time progress.

---

### Q: What languages does Aqdy support?

**A:** 
- **English** - Full support
- **Arabic** - Full support for contracts and explanations
- Additional languages coming soon

---

### Q: How much does Aqdy cost?

**A:**
- **Free Plan** - Free forever (limited to 50 credits/month)
- **Pro Plan** - $9.99/month or $99/year
- **Enterprise** - Custom pricing for teams

Visit [aqdy.ai/pricing](https://aqdy.ai/pricing) for details.

---

### Q: Can I export my data?

**A:**
Yes! Export analysis results as:
- PDF reports
- CSV spreadsheets
- JSON data

Use the **Export** button on any analysis.

---

### Q: What if I run out of credits mid-month?

**A:**
- Analyses and chat will be blocked
- Upgrade your plan to get more credits immediately
- Or wait until next month for credits to reset

---

### Q: Can I share contracts with my team?

**A:**
Currently, Aqdy is single-user only. Team features are coming soon!

For now, you can:
- Export analysis results and share via email
- Export as PDF/CSV for team review

---

### Q: Is my contract data secure?

**A:**
Yes! Security features include:
- ✅ HTTPS/TLS encryption in transit
- ✅ AES-256 encryption at rest
- ✅ SOC 2 compliance
- ✅ No data sharing with third parties
- ✅ Your data is yours (GDPR compliant)

See [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) and [SECURITY_REPORT.md](../SECURITY_REPORT.md) for details.

---

### Q: What happens to my data if I cancel?

**A:**
- You can view past analyses for 30 days
- After 30 days, data is deleted
- Download and export before cancellation if you need to keep it

---

### Q: Can I recover a deleted contract?

**A:**
No, deletion is permanent. Always export important analyses before deleting.

---

### Q: Why is my payment failing?

**A:**
Common reasons:
1. **Incorrect card details** - Double-check card number, expiry, CVV
2. **Insufficient funds** - Ensure card has available balance
3. **Card declined by bank** - Contact your bank
4. **Address mismatch** - Billing address must match card issuer

**Solutions:**
- Try a different card
- Contact your bank to authorize the transaction
- Check Stripe checkout for detailed error messages

---

### Q: How do I cancel my subscription?

**A:**
1. Go to **Account** → **Subscription**
2. Click **Cancel Subscription**
3. Confirm cancellation
4. Your subscription ends at end of current billing period
5. You won't be charged again

---

### Q: Can I change my plan mid-cycle?

**A:**
Yes! When you upgrade:
- New credits are added immediately (prorated if switching mid-cycle)
- Old plan is cancelled
- You pay the difference

If you downgrade:
- Change takes effect at end of current billing period
- You're refunded the unused portion

---

### Q: Is there a free trial for Pro?

**A:**
Currently no free trial, but you can:
- Start with the Free Plan (50 credits)
- Upgrade to Pro anytime ($9.99/month)
- Cancel anytime (no long-term commitment)

---

## Getting Help

### Support

Need help? Contact us:
- 📧 **Email:** support@aqdy.ai
- 💬 **Chat:** In-app support chat (coming soon)
- 📖 **Docs:** Full API docs at [docs.aqdy.ai](https://docs.aqdy.ai)

### Reporting Issues

Found a bug? Let us know:
1. Go to **Help** → **Report Issue**
2. Describe the problem
3. Include steps to reproduce
4. Our team will investigate

---

## Related Documentation

- [PAYMENTS.md](PAYMENTS.md) - Detailed billing and subscription information
- [CREDITS.md](CREDITS.md) - Technical details on the credits system
- [SECURITY_REPORT.md](../SECURITY_REPORT.md) - Security practices
- [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) - Privacy and data handling
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute to Aqdy
