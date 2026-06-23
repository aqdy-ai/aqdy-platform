// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { Suspense, lazy, ReactNode, useEffect } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'sonner'
import MainLayout from './components/layout/MainLayout'
import DisclaimerModal from './components/DisclaimerModal'
import { AuthProvider } from './hooks/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { getDirection } from './lib/i18n'
import type { SupportedLocale } from './types'
import { ADMIN_ROLES } from './types/auth'
import type { AdminRole } from './types/auth'

// 🌟 Lazy Loading للمكونات والـ Pages الخاصة بمنصة عقدي
const Home = lazy(() => import('./pages/Home'))
const Pricing = lazy(() => import('./pages/Pricing'))
const TestDashboard = lazy(() => import('./pages/Dashboard'))
const RiskAnalysisDashboard = lazy(
  () => import('./pages/RiskAnalysisDashboard')
)
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminAccounts = lazy(() => import('./pages/admin/AdminAccounts'))
const AdminContracts = lazy(() => import('./pages/admin/AdminContracts'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))
const AdminEvaluations = lazy(() => import('./pages/admin/evaluations'))
const RoleManagement = lazy(() => import('./pages/admin/RoleManagement'))
const FinancialDashboard = lazy(
  () => import('./pages/admin/FinancialDashboard')
)
const SupportDashboard = lazy(() => import('./pages/admin/SupportDashboard'))
const ContentDashboard = lazy(() => import('./pages/admin/ContentDashboard'))
const OperationsDashboard = lazy(
  () => import('./pages/admin/OperationsDashboard')
)
const AnalyticsDashboard = lazy(
  () => import('./pages/admin/AnalyticsDashboard')
)
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'))
import AdminRoute from './components/AdminRoute'
import Register from './pages/Register'
const BillingHistory = lazy(() => import('./pages/BillingHistory'))
const ContractHistory = lazy(() => import('./pages/ContractHistory'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const VerifyPrompt = lazy(() => import('./pages/VerifyPrompt'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))

/**
 * GuestRoute: يمنع المستخدم المسجل من دخول صفحات الـ Login/Register ويرجعه للرئيسية
 */
const GuestRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialLoading, user } = useAuth()

  if (isInitialLoading) {
    return null
  }
  if (isAuthenticated) {
    const role = user?.role ?? 'user'
    const isAdmin = role === 'admin' || ADMIN_ROLES.includes(role as AdminRole)
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />
  }
  return <>{children}</>
}

/**
 * ProtectedRoute: يحمي الصفحات الداخلية وبيرجع المستخدم لصفحة الـ Login لو مش مسجل
 */
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialLoading, user } = useAuth()

  if (isInitialLoading) {
    return null
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  const role = user?.role ?? 'user'
  const isAdmin = role === 'admin' || ADMIN_ROLES.includes(role as AdminRole)
  if (user && !user.isEmailVerified && !isAdmin) {
    return <Navigate to="/verify-email" replace />
  }
  return <>{children}</>
}

/**
 * VerifyEmailRoute: Only accessible if authenticated AND unverified
 */
const VerifyEmailRoute = () => {
  const { isAuthenticated, isInitialLoading, user } = useAuth()
  if (isInitialLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (
    user?.isEmailVerified ||
    (user?.role &&
      (user.role === 'admin' || ADMIN_ROLES.includes(user.role as AdminRole)))
  )
    return <Navigate to="/" replace />
  return <VerifyPrompt />
}

/**
 * 🎯 المكون الداخلي المسؤول عن توزيع الـ Routes مع الـ Layout والـ Suspense المحمي ثنائي اللغة
 */
function AppContent() {
  // 🌟 استخراج الخصائص الموجودة فعلياً والمؤكدة داخل الـ useAuth
  const { isAuthenticated } = useAuth()
  const { i18n } = useTranslation()

  // تحديث اتجاه الصفحة (LTR/RTL) بناءً على اللغة المختارة
  useEffect(() => {
    document.documentElement.dir =
      getDirection(i18n.language as SupportedLocale) || 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  // 🎯 قراءة الـ plan بطريقة آمنة تماماً ومتوافقة مع الـ ESLint (بدون any وبدون خصائص مفقودة)
  // بنحاول نقراها من الـ localStorage لو متسجلة هناك أثناء الـ login، أو بنخليها null كـ Fallback
  const userPlan: string | null =
    typeof window !== 'undefined' ? localStorage.getItem('user_plan') : null

  return (
    <Suspense
      fallback={
        <div className="bg-background flex h-screen items-center justify-center">
          <div className="text-primary animate-pulse text-xl font-bold">
            جاري التحميل...
          </div>
        </div>
      }
    >
      <DisclaimerModal />

      <Routes>
        {/* 👑 Admin Routes - بدون MainLayout (بدون Navbar عادية) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={<Navigate to="/admin" replace />}
        />
        <Route
          path="/admin/accounts"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminAccounts />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/contracts"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminContracts />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminPayments />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/evaluations"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminEvaluations />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <AdminRoute allowedRoles={['super_admin']}>
              <AdminLayout>
                <RoleManagement />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/financial"
          element={
            <AdminRoute allowedRoles={['super_admin', 'financial_admin']}>
              <AdminLayout>
                <FinancialDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <AdminRoute allowedRoles={['super_admin', 'support_admin']}>
              <AdminLayout>
                <SupportDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <AdminRoute allowedRoles={['super_admin', 'content_admin']}>
              <AdminLayout>
                <ContentDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/operations"
          element={
            <AdminRoute allowedRoles={['super_admin', 'operations_admin']}>
              <AdminLayout>
                <OperationsDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminRoute allowedRoles={['super_admin', 'analytics_admin']}>
              <AdminLayout>
                <AnalyticsDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />

        {/* 🏠 Normal Routes - داخل MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/pricing"
            element={
              <Pricing isLoggedIn={isAuthenticated} userPlan={userPlan} />
            }
          />
          <Route
            path="/test-dashboard"
            element={
              <ProtectedRoute>
                <TestDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="py-20 text-center text-2xl font-bold opacity-50">
                  لوحة التحكم قيد الإنشاء
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-analysis"
            element={
              <ProtectedRoute>
                <RiskAnalysisDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-settings"
            element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contract-history"
            element={
              <ProtectedRoute>
                <ContractHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/billing-history"
            element={
              <ProtectedRoute>
                <BillingHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmailRoute />} />
          <Route path="/verify" element={<VerifyEmail />} />
          {/* 🔓 Public Legal Pages — no auth required */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
/**
 * 👑 المكون الأساسي للـ App ومغلف بالـ Providers بالترتيب السليم
 */
export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="bottom-left"
            dir="rtl"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: 'rounded-2xl border-border/50 shadow-xl font-semibold',
                title: 'font-bold',
                description: 'text-muted-foreground',
              },
            }}
          />
          <AppContent />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  )
}
