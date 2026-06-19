import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { PasswordStrengthIndicator } from '../components/features/PasswordStrengthIndicator';

export default function ResetPassword() {
  const { t } = useTranslation();
  const { resetPassword, isLoading, getPasswordStrength } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordsMismatch'));
      return;
    }
    await resetPassword(token, password);
  };

  if (!token) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Helmet>
          <title>{t('auth.resetPasswordInvalidTitle')} | Aqdy</title>
        </Helmet>
        <div className="bg-card border-border/50 w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl backdrop-blur-sm bg-opacity-30">
          <h2 className="text-foreground text-3xl font-extrabold text-center">
            {t('auth.resetPasswordInvalid')}
          </h2>
          <p className="text-muted-foreground text-center mt-4">
            {t('auth.resetPasswordInvalidMessage')}
          </p>
          <Link to="/login" className="text-primary hover:underline mt-4 block text-center">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>{t('auth.resetPasswordTitle')} | Aqdy</title>
      </Helmet>
      <div className="bg-card border-border/50 w-full max-w-md space-y-8 rounded-3xl border p-8 shadow-2xl backdrop-blur-sm bg-opacity-30">
        <div className="text-center">
          <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
            {t('auth.resetPasswordTitle')}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('auth.resetPasswordSubtitle')}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-foreground mb-1 block text-start text-sm font-medium">
                {t('auth.newPasswordLabel')}
              </label>
              <input
                type="password"
                required
                className="border-input bg-background text-foreground focus:border-primary focus:ring-primary relative block w-full rounded-xl border px-4 py-3 transition-all outline-none focus:ring-1 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthIndicator result={passwordStrength} password={password} />
            </div>
            <div>
              <label className="text-foreground mb-1 block text-start text-sm font-medium">
                {t('auth.confirmPasswordLabel')}
              </label>
              <input
                type="password"
                required
                className="border-input bg-background text-foreground focus:border-primary focus:ring-primary relative block w-full rounded-xl border px-4 py-3 transition-all outline-none focus:ring-1 sm:text-sm"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {t('auth.passwordResetExpirationWarning')}
          </div>
          <button
            type="submit"
            disabled={isLoading || !passwordStrength.allValid}
            className="group bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary/50 relative flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold shadow-lg transition-all hover:cursor-pointer focus:ring-2 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('auth.resetPasswordAction')}
          </button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-xs leading-relaxed">
          {t('auth.remembered')}{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            {t('auth.loginNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
