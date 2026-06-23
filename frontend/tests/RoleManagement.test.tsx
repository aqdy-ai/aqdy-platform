import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RoleManagement from '../src/pages/admin/RoleManagement'
import { adminApi } from '../src/services/adminApi'

vi.mock('../src/services/adminApi', () => ({
  adminApi: {
    getRoleUsers: vi.fn(),
    getRoleAuditLog: vi.fn(),
    searchUsers: vi.fn(),
    assignRole: vi.fn(),
    revokeRole: vi.fn(),
  },
}))

vi.mock('../../hooks/usePermissions', () => ({
  ROLE_LABELS: {
    super_admin: 'Super Admin',
    support_admin: 'Support Admin',
  },
  usePermissions: () => ({
    hasPermission: () => true,
    roleLabel: 'Super Admin',
  }),
}))

describe('RoleManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default successful API responses
    vi.mocked(adminApi.getRoleUsers).mockResolvedValue({
      data: {
        success: true,
        data: {
          adminUsers: [
            { _id: '1', name: 'Super Admin User', email: 'super@test.com', role: 'super_admin', status: 'active', createdAt: '2026-06-23' },
            { _id: '2', name: 'Support Admin User', email: 'support@test.com', role: 'support_admin', status: 'active', createdAt: '2026-06-23' },
          ],
          superAdminCount: 2,
          maxSuperAdmins: 2,
        },
      },
    } as any)

    vi.mocked(adminApi.getRoleAuditLog).mockResolvedValue({
      data: {
        success: true,
        data: [
          { _id: 'log-1', action: 'ROLE_ASSIGNED', outcome: 'success', timestamp: new Date().toISOString(), userEmail: 'super@test.com', metadata: { targetEmail: 'support@test.com', newRole: 'support_admin', previousRole: 'user' } },
        ],
      },
    } as any)
  })

  it('renders admin users and shows maximum super admin warning', async () => {
    render(<RoleManagement />)

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Super Admin User')).toBeInTheDocument()
      expect(screen.getByText('Support Admin User')).toBeInTheDocument()
    })

    // Expect warning banner since superAdminCount >= maxSuperAdmins (2 >= 2)
    expect(screen.getByText(/Maximum Super Admin limit reached/i)).toBeInTheDocument()
  })

  it('allows switching to audit log tab', async () => {
    render(<RoleManagement />)

    // Switch tab
    const auditTabBtn = screen.getByRole('button', { name: /audit log/i })
    fireEvent.click(auditTabBtn)

    await waitFor(() => {
      expect(screen.getByText('ROLE_ASSIGNED')).toBeInTheDocument()
      expect(screen.getByText('support@test.com')).toBeInTheDocument()
    })
  })

  it('assigns role to a user successfully', async () => {
    vi.mocked(adminApi.searchUsers).mockResolvedValue({
      data: {
        success: true,
        data: [{ _id: '3', email: 'newadmin@test.com' }],
      },
    } as any)

    vi.mocked(adminApi.assignRole).mockResolvedValue({
      data: { success: true },
    } as any)

    render(<RoleManagement />)

    // Enter email
    const emailInput = screen.getByPlaceholderText(/user email.../i)
    fireEvent.change(emailInput, { target: { value: 'newadmin@test.com' } })

    // Select role
    const roleSelect = screen.getByRole('combobox')
    fireEvent.change(roleSelect, { target: { value: 'support_admin' } })

    // Click assign
    const assignBtn = screen.getByRole('button', { name: /^assign$/i })
    fireEvent.click(assignBtn)

    await waitFor(() => {
      expect(adminApi.searchUsers).toHaveBeenCalledWith('newadmin@test.com')
      expect(adminApi.assignRole).toHaveBeenCalledWith('3', 'support_admin')
    })
  })
})
