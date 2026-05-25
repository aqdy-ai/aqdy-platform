/* src/App.tsx */
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'sonner'
import MainLayout from './components/layout/MainLayout'
import DisclaimerModal from './components/DisclaimerModal'

const Home = lazy(() => import('./pages/Home'))
const TestDashboard = lazy(() => import('./pages/TestDashboard'))
const RiskAnalysisDashboard = lazy(
  () => import('./pages/RiskAnalysisDashboard')
)

function App() {
  return (
    <HelmetProvider>
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
                  <div className="py-20 text-center text-2xl font-bold opacity-50">
                    لوحة التحكم قيد الإنشاء
                  </div>
                }
              />
              <Route path="/test-dashboard" element={<TestDashboard />} />
              <Route
                path="/risk-analysis"
                element={<RiskAnalysisDashboard />}
              />
            </Routes>
          </MainLayout>
        </Suspense>
      </Router>
    </HelmetProvider>
  )
}

export default App
