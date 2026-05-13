import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  article?: boolean
}

const SEO = ({ title, description, image, article }: SEOProps) => {
  const { t, i18n } = useTranslation()
  const siteName = t('common.brand_name', { defaultValue: 'Aqdy | عقدي' })
  const defaultDescription = t('hero.subtitle', {
    defaultValue:
      'AI Legal Assistant for Egyptian Law | مساعد قانوني ذكي للقانون المصري',
  })

  const seo = {
    title: title
      ? `${title} | ${siteName}`
      : `${siteName} - ${t('common.tagline')}`,
    description: description || defaultDescription,
    image: image || '/og-image.png',
    url: window.location.href,
  }

  return (
    <Helmet
      htmlAttributes={{
        lang: i18n.language,
        dir: i18n.language === 'ar' ? 'rtl' : 'ltr',
      }}
    >
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="image" content={seo.image} />

      {seo.url && <meta property="og:url" content={seo.url} />}
      {(article ? true : null) && <meta property="og:type" content="article" />}
      {seo.title && <meta property="og:title" content={seo.title} />}
      {seo.description && (
        <meta property="og:description" content={seo.description} />
      )}
      {seo.image && <meta property="og:image" content={seo.image} />}

      <meta name="twitter:card" content="summary_large_image" />
      {seo.title && <meta name="twitter:title" content={seo.title} />}
      {seo.description && (
        <meta name="twitter:description" content={seo.description} />
      )}
      {seo.image && <meta name="twitter:image" content={seo.image} />}
    </Helmet>
  )
}

export default SEO
