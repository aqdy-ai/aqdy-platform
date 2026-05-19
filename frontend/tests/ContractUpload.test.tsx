import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContractUpload from '../src/components/features/ContractUpload'
import userEvent from '@testing-library/user-event'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('ContractUpload', () => {
  it('should render the contract upload component', () => {
    render(<ContractUpload />)

    expect(
      screen.getByRole('heading', { name: 'common.upload' })
    ).toBeInTheDocument()
  })

  it('should enable analyze button after file upload', async () => {
    render(<ContractUpload />)

    const file = new File(['contract'], 'contract.pdf', {
      type: 'application/pdf',
    })

    const input = screen.getByLabelText('common.upload', { selector: 'input' })

    await userEvent.upload(input, file)

    const button = screen.getByRole('button', { name: 'analyze_now' })

    expect(button).toBeEnabled()
  })

  it('should remove file when clicking remove button', async () => {
    render(<ContractUpload />)

    const file = new File(['contract'], 'contract.pdf', {
      type: 'application/pdf',
    })

    const input = screen.getByLabelText('common.upload')

    await userEvent.upload(input, file)

    const removeBtn = screen.getByRole('button', { name: '' })

    await userEvent.click(removeBtn)

    expect(screen.queryByText('contract.pdf')).not.toBeInTheDocument()
  })
})
