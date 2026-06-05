import { http, HttpResponse } from 'msw'

/**
 * Centralized API handlers for MSW.
 * Add your backend API endpoints here to mock them globally.
 */
export const handlers = [
  http.get('https://api.escuelajs.co/api/v1/users', () => {
    return HttpResponse.json([
      { id: 1, email: 'omar@yahoo.com', role: 'admin' },
    ])
  }),

  // Mock for the Contract Analysis endpoint used in integration tests
  http.get('/api/contracts/analysis/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      riskScore: 75,
      summary: {
        ar: 'تم اكتشاف مخاطر عالية.',
        en: 'High risks detected.',
      },
    })
  }),

  // Mock for the Subscription status endpoint
  http.get('/api/account/subscription', () => {
    return HttpResponse.json({
      success: true,
      data: {
        subscription: {
          planId: {
            name: 'الباقة المتقدمة',
          },
        },
        usage: {
          analysesUsed: 5,
          analysesLimit: 10,
          renewalDate: '2026-12-31T23:59:59.000Z',
        },
      },
    })
  }),
]
