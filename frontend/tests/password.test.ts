import { describe, it, expect } from 'vitest'
import { PASSWORD_RULES } from '../src/hooks/useAuth'

describe('Password Validation Logic', () => {
  const check = (pwd: string) => ({
    minLength: pwd.length >= PASSWORD_RULES.minLength,
    uppercase: PASSWORD_RULES.uppercase.test(pwd),
    lowercase: PASSWORD_RULES.lowercase.test(pwd),
    number: PASSWORD_RULES.number.test(pwd),
    special: PASSWORD_RULES.special.test(pwd),
  })

  it('should fail if too short', () => {
    const res = check('A1a!567') // length 7
    expect(res.minLength).toBe(false)
  })

  it('should pass if exactly minimum length', () => {
    const res = check('A1a!5678')
    expect(res.minLength).toBe(true)
  })

  it('should detect missing uppercase', () => {
    const res = check('a1!45678')
    expect(res.uppercase).toBe(false)
    expect(res.lowercase).toBe(true)
  })

  it('should detect missing lowercase', () => {
    const res = check('A1!45678')
    expect(res.lowercase).toBe(false)
    expect(res.uppercase).toBe(true)
  })

  it('should detect missing number', () => {
    const res = check('Aa!bcdef')
    expect(res.number).toBe(false)
  })

  it('should detect missing special character', () => {
    const res = check('Aa1bcdef')
    expect(res.special).toBe(false)
  })

  it('should pass all rules with strong password', () => {
    const res = check('StrongP@ss1')
    expect(Object.values(res).every(Boolean)).toBe(true)
  })
})
