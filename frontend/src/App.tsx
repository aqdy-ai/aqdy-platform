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

const Home = lazy(() => import('./pages/Home'))
const TestDashboard = lazy(() => import('./pages/TestDashboard'))
const RiskAnalysisDashboard = lazy(
  () => import('./pages/RiskAnalysisDashboard')
)
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))

/**
 * GuestRoute: Redirects authenticated users away from Login/Register
 */
const GuestRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialLoading } = useAuth()

  if (isInitialLoading) {
    return null
  }
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

/**
 * ProtectedRoute: Redirects unauthenticated users to Login
 */
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialLoading } = useAuth()

  if (isInitialLoading) {
    return null
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppContent() {
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
          <Route path="/" element={<Home />} />
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
          <Route path="/test-dashboard" element={<TestDashboard />} />
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
        </Routes>
      </MainLayout>
    </Suspense>
  )
}

function App() {
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

export default App
