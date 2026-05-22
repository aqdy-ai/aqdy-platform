# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\e2e\contract-flow.spec.ts >> Contract Upload UI >> should display all upload UI elements correctly
- Location: tests\e2e\contract-flow.spec.ts:4:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Contract Upload UI', () => {
  4  |   test('should display all upload UI elements correctly', async ({ page }) => {
> 5  |     await page.goto('/')
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  | 
  7  |     // Verify Card structure using existing text/roles
  8  |     await expect(page.getByText(/Supported formats: PDF, DOCX/i)).toBeVisible()
  9  |     await expect(
  10 |       page.getByText(/Click or drag to upload contract/i)
  11 |     ).toBeVisible()
  12 | 
  13 |     // Check file input exists by ID
  14 |     await expect(page.locator('#contract-file')).toBeAttached()
  15 | 
  16 |     // Perform a UI interaction (upload)
  17 |     await page.locator('#contract-file').setInputFiles({
  18 |       name: 'test-contract.pdf',
  19 |       mimeType: 'application/pdf',
  20 |       buffer: Buffer.from('ui test content'),
  21 |     })
  22 | 
  23 |     // Verify the UI updates to show the filename
  24 |     await expect(page.getByText('test-contract.pdf')).toBeVisible()
  25 |     await expect(page.getByRole('button', { name: /analyze/i })).toBeEnabled()
  26 |   })
  27 | })
  28 | 
```