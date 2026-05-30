import { lazy } from 'react'
import { useTranslation } from 'react-i18next'
import SEO from '@/components/layout/SEO'

const ContractUpload = lazy(
  () => import('@/components/features/ContractUpload')
)

const Home = () => {
  const { t } = useTranslation()

  return (
    <>
      <SEO title={t('hero.title')} description={t('hero.subtitle')} />

      <div className="animate-in fade-in flex min-h-[70vh] flex-col items-center justify-center space-y-12 py-12 duration-1000">
        <div className="space-y-6 text-center">
          <h1 className="text-5xl font-black tracking-tight md:text-7xl lg:text-8xl">
            {t('hero.title_part1', { defaultValue: 'مستقبلك القانوني،' })}
            <span className="text-primary bg-primary/10 mx-2 inline-block -rotate-1 transform rounded-2xl px-4 py-1 transition-transform duration-300 hover:rotate-0">
              {t('hero.title_part2', { defaultValue: 'بذكاء.' })}
            </span>
          </h1>

          <p className="text-muted-foreground mx-auto max-w-[700px] text-lg leading-relaxed md:text-xl">
            {t('hero.subtitle')}
          </p>
        </div>

        <div className="w-full max-w-4xl px-4">
          <div className="group relative">
            <div className="from-primary/20 to-secondary/20 absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r opacity-25 blur transition duration-1000 group-hover:opacity-50 group-hover:duration-200"></div>
            <div className="relative">
              <ContractUpload />
            </div>
          </div>
        </div>

        {/* Features grid placeholder for wow effect */}
        <div className="mt-12 grid w-full max-w-5xl grid-cols-1 gap-8 px-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card/50 border-border/50 hover:border-primary/30 rounded-2xl border p-6 backdrop-blur-sm transition-colors"
            >
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                <div className="bg-primary h-6 w-6 animate-pulse rounded-full" />
              </div>
              <h3 className="mb-2 font-bold">
                {t(`features.title_${i}`, { defaultValue: `Feature ${i}` })}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t(`features.desc_${i}`, {
                  defaultValue:
                    'Description of the amazing legal feature here.',
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default Home
