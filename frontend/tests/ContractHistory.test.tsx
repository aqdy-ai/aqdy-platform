import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ContractHistory from '../src/pages/ContractHistory'

// ─── i18n Mock Translations ──────────────────────────────────────────────────
const translations: Record<string, Record<string, string>> = {
  en: {
    'common.loading': 'Loading...',
    'history.title': 'Contract History',
    'history.subtitle': 'View and manage all your past contracts and their analysis reports.',
    'history.search_placeholder': 'Search by filename...',
    'history.date_from': 'From Date',
    'history.date_to': 'To Date',
    'history.risk_all': 'All Risk Levels',
    'history.risk_high': 'High Risk',
    'history.risk_medium': 'Medium Risk',
    'history.risk_low': 'Low Risk',
    'history.table_filename': 'Filename',
    'history.table_upload_date': 'Upload Date',
    'history.table_status': 'Status',
    'history.table_risk': 'Risk Level',
    'history.table_actions': 'Actions',
    'history.status_analyzed': 'Analyzed',
    'history.status_pending': 'Pending',
    'history.status_failed': 'Failed',
    'history.action_preview': 'Quick Preview',
    'history.action_reanalyze': 'Re-analyze',
    'history.action_view_report': 'View Report',
    'history.action_delete': 'Delete',
    'history.delete_confirm_title': 'Delete Contract?',
    'history.delete_confirm_desc': 'Are you sure you want to delete this contract?',
    'history.delete_success': 'Contract deleted successfully',
    'history.reanalyze_success': 'Re-analysis started successfully',
    'history.export_btn': 'Export',
    'history.export_csv': 'Export CSV',
    'history.export_json': 'Export JSON',
    'history.empty_title': 'No Contracts Yet',
    'history.empty_desc': 'Get started by uploading and analyzing your first legal contract.',
    'history.empty_cta': 'Upload Contract',
    'history.items_per_page': 'items per page',
    'history.pagination_show': 'Showing',
    'history.pagination_of': 'of',
    'history.preview_summary': 'Risk Summary',
    'history.preview_clauses_count': 'Clauses analyzed: {{count}}',
    'history.preview_risky_clauses': 'High risk clauses: {{count}}',
    'history.preview_no_issues': 'No critical or high risk issues found.',
    'history.version': 'Version',
    'risk.high': 'High Risk',
    'risk.medium': 'Medium Risk',
    'risk.low': 'Low Risk',
  },
  ar: {
    'common.loading': 'تحميل',
    'history.title': 'سجل العقود',
    'history.subtitle': 'عرض وإدارة جميع عقودك السابقة والتحليلات الخاصة بها',
    'history.search_placeholder': 'بحث باسم الملف...',
    'history.date_from': 'من تاريخ',
    'history.date_to': 'إلى تاريخ',
    'history.risk_all': 'كل المستويات',
    'history.risk_high': 'مخاطر عالية',
    'history.risk_medium': 'مخاطر متوسطة',
    'history.risk_low': 'مخاطر منخفضة',
    'history.table_filename': 'اسم الملف',
    'history.table_upload_date': 'تاريخ الرفع',
    'history.table_status': 'الحالة',
    'history.table_risk': 'مستوى المخاطر',
    'history.table_actions': 'الإجراءات',
    'history.status_analyzed': 'تم التحليل',
    'history.status_pending': 'قيد المعالجة',
    'history.status_failed': 'فشل التحليل',
    'history.action_preview': 'معاينة سريعة',
    'history.action_reanalyze': 'إعادة تحليل',
    'history.action_view_report': 'عرض التقرير',
    'history.action_delete': 'حذف',
    'history.delete_confirm_title': 'حذف العقد؟',
    'history.delete_confirm_desc': 'هل أنت متأكد من رغبتك في حذف هذا العقد؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذفه مؤقتاً.',
    'history.delete_success': 'تم حذف العقد بنجاح',
    'history.reanalyze_success': 'تم بدء إعادة التحليل بنجاح',
    'history.export_btn': 'تصدير البيانات',
    'history.export_csv': 'تصدير CSV',
    'history.export_json': 'تصدير JSON',
    'history.empty_title': 'لا توجد عقود بعد',
    'history.empty_desc': 'ابدأ برفع أول عقد لك للحصول على تحليل فوري للمخاطر.',
    'history.empty_cta': 'رفع عقد جديد',
    'history.items_per_page': 'عنصر لكل صفحة',
    'history.pagination_show': 'عرض',
    'history.pagination_of': 'من',
    'history.preview_summary': 'ملخص المخاطر',
    'history.preview_clauses_count': 'البنود المحللة: {{count}}',
    'history.preview_risky_clauses': 'بنود عالية الخطورة: {{count}}',
    'history.preview_no_issues': 'لم يتم العثور على مشاكل حرجة أو عالية الخطورة.',
    'history.version': 'الإصدار',
    'risk.high': 'مخاطر عالية',
    'risk.medium': 'مخاطر متوسطة',
    'risk.low': 'مخاطر منخفضة',
  }
}

let currentTestLanguage = 'en'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      let translation = translations[currentTestLanguage]?.[key] ?? key
      if (options) {
        Object.keys(options).forEach((optKey) => {
          translation = translation.replace(`{{${optKey}}}`, options[optKey])
        })
      }
      return translation
    },
    i18n: {
      get language() {
        return currentTestLanguage
      },
    },
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', name: 'Test User' },
    isAuthenticated: true,
  }),
}))

// Mock UpgradeModal to verify its trigger
vi.mock('../src/components/UpgradeModal', () => ({
  UpgradeModal: ({ open }: { open: boolean }) => 
    open ? <div data-testid="upgrade-modal-stub">Upgrade Modal Active</div> : null
}))

// Mock sonner toasts
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}))

// ─── Test Helper ────────────────────────────────────────────────────────────
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  })

const renderWithProviders = (ui: React.ReactNode) => {
  const queryClient = createQueryClient()
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  )
}

// Mock responses builder
const createMockResponse = (ok: boolean, data: any) => ({
  ok,
  status: ok ? 200 : 400,
  json: () => Promise.resolve(data)
})

describe('ContractHistory Page', () => {
  const mockContractsData = {
    contracts: [
      {
        contractId: 'contract-1',
        filename: 'Employment_Agreement_2026.pdf',
        uploadDate: '2026-06-01T12:00:00.000Z',
        language: 'en',
        fileSize: 102400, // 100 KB
        status: 'analyzed',
        riskLevel: 'high',
        analysisId: 'analysis-1',
        riskSummary: {
          en: 'Indemnification issues found.',
          ar: 'تم العثور على مشاكل في التعويضات.'
        },
        totalClauses: 12,
        riskyClausesCount: 3,
        version: 1,
      },
      {
        contractId: 'contract-2',
        filename: 'NDA_Draft_v2.pdf',
        uploadDate: '2026-06-05T14:30:00.000Z',
        language: 'en',
        fileSize: 204800, // 200 KB
        status: 'pending',
        riskLevel: 'medium',
        analysisId: null,
        riskSummary: null,
        totalClauses: 0,
        riskyClausesCount: 0,
        version: 0,
      }
    ],
    total: 2,
    page: 1,
    totalPages: 1,
    limit: 10
  }

  const mockFreeSubscription = {
    success: true,
    data: {
      subscription: {
        planId: { slug: 'free' }
      }
    }
  }

  const mockProSubscription = {
    success: true,
    data: {
      subscription: {
        planId: { slug: 'pro' }
      }
    }
  }

  beforeEach(() => {
    currentTestLanguage = 'en'
    vi.clearAllMocks()
    
    // Default fetch spy
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlString = String(url)
      if (urlString.includes('/api/account/subscription')) {
        return Promise.resolve(createMockResponse(true, mockFreeSubscription) as Response)
      }
      if (urlString.includes('/api/account/contracts')) {
        return Promise.resolve(createMockResponse(true, { success: true, data: mockContractsData }) as Response)
      }
      return Promise.resolve(createMockResponse(false, { message: 'Not Found' }) as Response)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('renders the contract history table with correct data', async () => {
    renderWithProviders(<ContractHistory />)

    // Verify title and headers render
    expect(screen.getByText('Contract History')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Employment_Agreement_2026.pdf')).toBeInTheDocument()
      expect(screen.getByText('NDA_Draft_v2.pdf')).toBeInTheDocument()
    })

    // Verify file size formats
    expect(screen.getByText('100 KB')).toBeInTheDocument()
    expect(screen.getByText('200 KB')).toBeInTheDocument()

    // Verify Status & Risk badge rendering
    expect(screen.getAllByText('Analyzed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getAllByText('High Risk').length).toBeGreaterThan(0)
  })

  it('displays the hover preview tooltip with correct details', async () => {
    // Import and render ContractHistoryRow directly for isolated hover testing
    const { ContractHistoryRow } = await import('../src/components/ContractHistoryRow')
    
    const contract = {
      contractId: 'contract-1',
      filename: 'Employment_Agreement_2026.pdf',
      uploadDate: '2026-06-01T12:00:00.000Z',
      language: 'en',
      fileSize: 102400,
      status: 'analyzed' as const,
      riskLevel: 'high' as const,
      analysisId: 'analysis-1',
      riskSummary: { en: 'Indemnification issues found.', ar: 'تم العثور على مشاكل في التعويضات.' },
      totalClauses: 12,
      riskyClausesCount: 3,
      version: 1,
    }

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <table><tbody>
            <ContractHistoryRow
              contract={contract}
              onDeleteSuccess={vi.fn()}
              onReanalyzeSuccess={vi.fn()}
            />
          </tbody></table>
        </QueryClientProvider>
      </MemoryRouter>
    )

    const hoverTarget = screen.getByTestId('filename-hover-contract-1')
    expect(hoverTarget).toBeInTheDocument()

    // Directly dispatch a native mouseover event so React's delegation picks it up
    const event = new MouseEvent('mouseover', { bubbles: true, cancelable: true })
    hoverTarget.dispatchEvent(event)

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    expect(screen.getByText('Risk Summary')).toBeInTheDocument()
    expect(screen.getByText('Version 1')).toBeInTheDocument()
    expect(screen.getByText('Indemnification issues found.')).toBeInTheDocument()
    expect(screen.getByText('Clauses analyzed: 12')).toBeInTheDocument()
    expect(screen.getByText('High risk clauses: 3')).toBeInTheDocument()

    // Hover out
    const leaveEvent = new MouseEvent('mouseout', { bubbles: true, cancelable: true })
    hoverTarget.dispatchEvent(leaveEvent)
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  it('filters data by filename search inputs', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    
    renderWithProviders(<ContractHistory />)

    const searchInput = screen.getByLabelText('Search filename')
    fireEvent.change(searchInput, { target: { value: 'Agreement' } })

    // Verify debounce works after 400ms
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('filename=Agreement'))
    })
  })

  it('filters data by risk level selector', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    
    renderWithProviders(<ContractHistory />)

    const riskSelect = screen.getByLabelText('Filter by Risk Level')
    fireEvent.change(riskSelect, { target: { value: 'high' } })

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('riskLevel=high'))
    })
  })

  it('triggers delete flow and opens modal', async () => {
    renderWithProviders(<ContractHistory />)

    await waitFor(() => {
      expect(screen.getByTestId('delete-button-contract-1')).toBeInTheDocument()
    })

    // Click delete to open dialog
    fireEvent.click(screen.getByTestId('delete-button-contract-1'))

    // Verify dialog elements exist
    expect(screen.getByText('Delete Contract?')).toBeInTheDocument()
    expect(screen.getAllByText('Employment_Agreement_2026.pdf')[0]).toBeInTheDocument()

    // Confirm delete trigger
    const confirmButton = screen.getByTestId('confirm-delete-button')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/account/contracts/contract-1', expect.objectContaining({
        method: 'DELETE'
      }))
    })
  })

  it('triggers re-analyze successfully', async () => {
    renderWithProviders(<ContractHistory />)

    await waitFor(() => {
      expect(screen.getByTestId('reanalyze-button-contract-1')).toBeInTheDocument()
    })

    // Trigger Re-analyze
    fireEvent.click(screen.getByTestId('reanalyze-button-contract-1'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analysis/analyze', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ contractId: 'contract-1', userId: 'user-123' })
      }))
    })
  })

  it('gates export capabilities based on subscription tier - Free Tier', async () => {
    // Subscription is Free by default in spy
    renderWithProviders(<ContractHistory />)

    const exportBtn = screen.getByTestId('export-button')
    fireEvent.click(exportBtn)

    // Expect Upgrade Modal to activate
    await waitFor(() => {
      expect(screen.getByTestId('upgrade-modal-stub')).toBeInTheDocument()
    })
  })

  it('gates export capabilities based on subscription tier - Pro Tier', async () => {
    // Setup fetch to return Pro Plan
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlString = String(url)
      if (urlString.includes('/api/account/subscription')) {
        return Promise.resolve(createMockResponse(true, mockProSubscription) as Response)
      }
      if (urlString.includes('/api/account/contracts')) {
        return Promise.resolve(createMockResponse(true, { success: true, data: mockContractsData }) as Response)
      }
      return Promise.resolve(createMockResponse(false, { message: 'Not Found' }) as Response)
    })

    renderWithProviders(<ContractHistory />)

    // Wait for the query to resolve
    await waitFor(() => {
      expect(screen.getByText('Employment_Agreement_2026.pdf')).toBeInTheDocument()
    })

    const exportBtn = screen.getByTestId('export-button')
    fireEvent.click(exportBtn)

    // Expect Upgrade Modal NOT to activate, instead export options open
    expect(screen.queryByTestId('upgrade-modal-stub')).toBeNull()
    
    await waitFor(() => {
      expect(screen.getByTestId('export-dropdown')).toBeInTheDocument()
      expect(screen.getByText('Export CSV')).toBeInTheDocument()
      expect(screen.getByText('Export JSON')).toBeInTheDocument()
    })
  })

  it('renders correctly in Arabic bilingual layout', async () => {
    currentTestLanguage = 'ar'
    renderWithProviders(<ContractHistory />)

    expect(screen.getByText('سجل العقود')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Employment_Agreement_2026.pdf')).toBeInTheDocument()
      expect(screen.getAllByText('تم التحليل').length).toBeGreaterThan(0)
    })
  })
})
