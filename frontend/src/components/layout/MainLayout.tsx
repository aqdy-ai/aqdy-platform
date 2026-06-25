/* src/components/layout/MainLayout.tsx */

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Navbar from './Navbar'
import Footer from './Footer'

const MainLayout: React.FC = () => {
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language, isRtl])

  return (
    <div
      className={`bg-background text-foreground selection:bg-primary selection:text-primary-foreground min-h-screen transition-colors duration-500 ${
        isRtl ? 'font-arabic' : 'font-sans'
      }`}
    >
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
          <div className="bg-primary/5 absolute start-[-5rem] top-40 h-96 w-96 rounded-full blur-[100px]" />
          <div className="bg-secondary/5 absolute end-[-5rem] top-80 h-[500px] w-[500px] rounded-full blur-[120px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default MainLayout
