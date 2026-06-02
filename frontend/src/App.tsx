// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { Suspense, lazy, ReactNode } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'sonner'
import MainLayout from './components/layout/MainLayout'
import DisclaimerModal from './components/DisclaimerModal'
import { AuthProvider } from './hooks/AuthContext'
import { useAuth } from './hooks/useAuth'

// 🌟 Lazy Loading للمكونات والـ Pages الخاصة بمنصة عقدي
const Home = lazy(() => import('./pages/Home'))
const Pricing = lazy(() => import('./pages/Pricing'))
const TestDashboard = lazy(() => import('./pages/TestDashboard'))
const RiskAnalysisDashboard = lazy(
  () => import('./pages/RiskAnalysisDashboard')
)
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))

/**
 * GuestRoute: يمنع المستخدم المسجل من دخول صفحات الـ Login/Register ويرجعه للرئيسية
 */
const GuestRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialLoading } = useAuth()

  if (isInitialLoading) {
    return null
  }
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

/**
 * ProtectedRoute: يحمي الصفحات الداخلية وبيرجع المستخدم لصفحة الـ Login لو مش مسجل
 */
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialLoading } = useAuth()

  if (isInitialLoading) {
    return null
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/**
 * 🎯 المكون الداخلي المسؤول عن توزيع الـ Routes مع الـ Layout والـ Suspense المحمي ثنائي اللغة
 */
function AppContent() {
  // 🌟 استخراج الخصائص الموجودة فعلياً والمؤكدة داخل الـ useAuth
  const { isAuthenticated } = useAuth()

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

      <MainLayout>
        <Routes>
          {/* الـ Public Routes */}
          <Route path="/" element={<Home />} />

          {/* 🌟 دمج صفحة الأسعار وتمرير الـ Props المتوافقة مع الـ Types بنجاح */}
          <Route
            path="/pricing"
            element={
              <Pricing isLoggedIn={isAuthenticated} userPlan={userPlan} />
            }
          />

          <Route path="/test-dashboard" element={<TestDashboard />} />

          {/* الـ Protected Routes (المحمية) */}
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

          {/* الـ Guest Routes (ممنوعة على المسجلين) */}
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

          {/* Fallback في حال كتابة مسار خاطئ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
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
