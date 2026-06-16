import React from 'react'
import { useTranslation } from 'react-i18next'
import { PasswordValidationResult } from '../../types/auth'
import { cn } from '@/lib/utils'
import { CheckIcon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
interface Props {
  result: PasswordValidationResult
  showIfEmpty?: boolean
  password?: string
}

export const PasswordStrengthIndicator: React.FC<Props> = ({
  result,
  showIfEmpty = false,
  password = '',
}) => {
  const { t } = useTranslation()

  if (!showIfEmpty && !password) return null

  const rules = [
    {
      key: 'minLength',
      label: t('auth.passwordRules.minLength', { count: 8 }),
      met: result.hasMinLength,
    },
    {
      key: 'uppercase',
      label: t('auth.passwordRules.uppercase'),
      met: result.hasUppercase,
    },
    {
      key: 'lowercase',
      label: t('auth.passwordRules.lowercase'),
      met: result.hasLowercase,
    },
    {
      key: 'number',
      label: t('auth.passwordRules.number'),
      met: result.hasNumber,
    },
    {
      key: 'special',
      label: t('auth.passwordRules.special'),
      met: result.hasSpecial,
    },
  ]

  return (
    <div
      className="animate-in fade-in slide-in-from-top-1 mt-2 space-y-1.5 text-xs duration-200"
      dir="auto"
    >
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {rules.map((rule) => (
          <li
            key={rule.key}
            data-testid={`password-rule-${rule.key}`}
            className={cn(
              'flex items-center gap-1.5 transition-colors duration-200',
              rule.met
                ? 'text-green-600 dark:text-green-500'
                : 'text-muted-foreground'
            )}
          >
            {rule.met ? (
              <HugeiconsIcon
                icon={CheckIcon}
                strokeWidth={2}
                size={14}
                className="shrink-0"
              />
            ) : (
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={14}
                className="shrink-0 text-red-500 dark:text-red-400"
              />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
