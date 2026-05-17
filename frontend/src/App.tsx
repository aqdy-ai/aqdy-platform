import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import MainLayout from './components/layout/MainLayout'
import DisclaimerModal from './components/DisclaimerModal'

// استخدام lazy loading لتحسين الأداء
const Home = lazy(() => import('./pages/Home'))
const TestDashboard = lazy(() => import('./pages/TestDashboard'))

function App() {
  return (
    <HelmetProvider>
      <Router>
        {/* الـ Suspense ضروري عشان i18n و الـ Lazy Loading */}
        <Suspense
          fallback={
            <div className="bg-background flex h-screen items-center justify-center">
              <div className="text-primary animate-pulse text-xl font-bold">
                جاري التحميل...
              </div>
            </div>
          }
        >
          {/* المودال بيظهر في أي صفحة لو المستخدم لسه موافقش */}
          <DisclaimerModal />

          <MainLayout>
            <Routes>
              <Route path="/home" element={<Home />} />
              {/* أي صفحات تانية زي الـ Dashboard هتتضاف هنا */}
              <Route
                path="/dashboard"
                element={
                  <div className="py-20 text-center text-2xl font-bold opacity-50">
                    لوحة التحكم قيد الإنشاء
                  </div>
                }
              />
              <Route path="/" element={<TestDashboard />} />
            </Routes>
          </MainLayout>
        </Suspense>
      </Router>
    </HelmetProvider>
  )
}

export default App
