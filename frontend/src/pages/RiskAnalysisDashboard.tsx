import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import ClauseCard, { ClauseItem } from '../components/features/ClauseCard'
import { IClauseAnalysis, IRiskAnalysis } from '../types/analysis'

// بيانات تجريبية تحاكي تحليل الذكاء الاصطناعي للعقد (fallback)
const MOCK_RISK_DATA = {
  contractName: 'عقد توريد برمجيات وتشغيل صيانة.pdf',
  overallScore: 68, // من 100
  summary:
    'يحتوي العقد على التزامات مالية واضحة، ولكن هناك ثغرات حرجية في بنود التعويضات وحدود المسؤولية القانونية عند انقطاع الخدمة.',
  stats: {
    high: 3,
    medium: 5,
    low: 8,
  },
  items: [
    {
      id: 'r1',
      severity: 'high',
      title: 'شرط جزائي مفتوح وبدون حد أقصى',
      clause:
        'البند 4.2: يلتزم الطرف الثاني بدفع تعويض مالي عن كل يوم تأخير في التسليم دون تحديد سقف أعلى للعقوبة.',
      recommendation:
        'يجب تعديل البند لصياغة حد أقصى للغرامة لا يتجاوز 10% من القيمة الإجمالية للعقد.',
    },
    {
      id: 'r2',
      severity: 'high',
      title: 'غموض في آلية إنهاء التعاقد المبكر',
      clause:
        'البند 9.1: يحق للطرف الأول إنهاء العقد في أي وقت دون إشعار مسبق ودون إبداء أسباب.',
      recommendation:
        'إضافة شرط يوجب الإخطار الكتابي قبل الإنهاء بـ 30 يوماً على الأقل لضمان استقرار التشغيل.',
    },
    {
      id: 'r3',
      severity: 'medium',
      title: 'قانون فض النزاعات خارج الاختصاص المحلي',
      clause:
        'البند 12.5: تخضع هذه الاتفاقية وتُفسر وفقاً لقوانين مركز دبي المالي العالمي.',
      recommendation:
        'يُفضل تعديل الاختصاص ليكون المحاكم المحلية لتقليل تكاليف التقاضي في حال النزاع.',
    },
    {
      id: 'r4',
      severity: 'low',
      title: 'عدم تحديد وثائق التأمين المطلوبة',
      clause:
        'البند 7.3: يلتزم المورد بتوفير وثيقة تأمين ضد الأخطار المهنية طوال فترة العقد.',
      recommendation:
        'تحديد القيمة الأدنى للتأمين لتفادي الخلافات التنفيذية لاحقاً.',
    },
  ],
}

export default function RiskAnalysisDashboard() {
  const { t } = useTranslation()
  const { i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [searchParams] = useSearchParams()
  const contractId = searchParams.get('id')

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'high' | 'medium' | 'low'
  >('all')

  // Real data state from the backend
  const [analysis, setAnalysis] = useState<IRiskAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState<number>(0)

  const loadingSteps = Object.values(
    t('dashboard.loading_steps', { returnObjects: true })
  ) as string[]

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % loadingSteps.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [isLoading, loadingSteps.length])

  useEffect(() => {
    if (!contractId) {
      return
    }

    // Run asynchronously to prevent cascading renders and satisfy the linter
    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
    })

    let pollCount = 0
    const maxPolls = 60 // 2.5 minutes maximum polling duration

    const checkAnalysis = async () => {
      try {
        const response = await fetch(`/api/analysis/${contractId}`)
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || 'Failed to fetch analysis details')
        }

        const resData = await response.json()

        if (resData.success && resData.data) {
          if (resData.data.status === 'processing') {
            pollCount++
            if (pollCount >= maxPolls) {
              throw new Error('Analysis timed out. Please try again.')
            }
            return
          }

          setAnalysis(resData.data)
          setIsLoading(false)
          clearInterval(pollInterval)
        }
      } catch (err: unknown) {
        const errorObj = err as Error
        setError(errorObj.message || 'An error occurred during analysis')
        setIsLoading(false)
        clearInterval(pollInterval)
      }
    }

    checkAnalysis()
    const pollInterval = setInterval(checkAnalysis, 2500)

    return () => clearInterval(pollInterval)
  }, [contractId])

  // Map real data from backend, falling back to mock data when accessed offline/directly
  const dataToRender = analysis
    ? {
        contractName: analysis.filename || t('dashboard.default_filename'),
        overallScore: Math.max(
          10,
          100 -
            analysis.clauseAnalysis?.filter(
              (c: IClauseAnalysis) =>
                c.riskLevel === 'critical' || c.riskLevel === 'high'
            ).length *
              20 -
            analysis.clauseAnalysis?.filter(
              (c: IClauseAnalysis) => c.riskLevel === 'medium'
            ).length *
              10 -
            analysis.clauseAnalysis?.filter(
              (c: IClauseAnalysis) => c.riskLevel === 'low'
            ).length *
              5
        ),
        overallRisk: analysis.executiveSummary?.overallRisk || 'medium',
        summary: isRtl
          ? analysis.executiveSummary?.summary?.ar || 'لا يوجد ملخص متاح.'
          : analysis.executiveSummary?.summary?.en || 'No summary available.',
        stats: {
          high:
            analysis.clauseAnalysis?.filter(
              (c: IClauseAnalysis) =>
                c.riskLevel === 'critical' || c.riskLevel === 'high'
            ).length || 0,
          medium:
            analysis.clauseAnalysis?.filter(
              (c: IClauseAnalysis) => c.riskLevel === 'medium'
            ).length || 0,
          low:
            analysis.clauseAnalysis?.filter(
              (c: IClauseAnalysis) => c.riskLevel === 'low'
            ).length || 0,
        },
        items: (analysis.clauseAnalysis || []).map(
          (item: IClauseAnalysis, idx: number) => {
            const riskVal =
              item.riskLevel === 'critical' || item.riskLevel === 'high'
                ? 'high'
                : item.riskLevel === 'medium'
                  ? 'medium'
                  : 'low'
            return {
              id: item._id || `clause-${idx}`,
              severity: riskVal,
              title: t(`auth.errors.${item.clauseType}_title`, {
                defaultValue:
                  item.clauseType || t('auth.errors.default_clause_title'),
              }),
              clause: item.clauseText,
              recommendation: `${item.redlineSuggestion || t('auth.errors.recommend_negotiate')}\n\n${t('auth.errors.explanation_prefix')}${isRtl ? item.explanation?.ar : item.explanation?.en}`,
            }
          }
        ),
      }
    : MOCK_RISK_DATA

  const filteredItems = dataToRender.items.filter((item) => {
    if (activeFilter === 'all') return true
    return item.severity === activeFilter
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="bg-primary/20 absolute top-1/3 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full blur-[100px]" />

        <div className="relative mb-10">
          <div
            className="border-primary h-32 w-32 animate-spin rounded-full border-4 border-dashed"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="border-secondary absolute inset-2 animate-spin rounded-full border-4 border-dotted"
            style={{ animationDuration: '4s', animationDirection: 'reverse' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldAlert className="text-primary animate-bounce" size={40} />
          </div>
        </div>

        <h2 className="mb-4 text-2xl font-black tracking-tight md:text-3xl">
          {t('dashboard.status_processing')}
        </h2>

        <div className="bg-card/50 border-border/50 w-full max-w-md rounded-2xl border p-5 shadow-inner backdrop-blur-md">
          <p className="text-primary animate-pulse text-base font-bold transition-all duration-500">
            {loadingSteps[stepIndex]}
          </p>
        </div>

        <p className="text-muted-foreground mt-4 max-w-[320px] text-sm leading-relaxed font-semibold">
          {isRtl
            ? 'يستغرق هذا عادةً من 10 إلى 20 ثانية حيث يقوم وكلاء الذكاء الاصطناعي بدراسة دقيقة لكل بند قانوني.'
            : 'This usually takes 10 to 20 seconds while our specialized AI agents meticulously study every clause.'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 rounded-3xl bg-red-500/10 p-5 text-red-500">
          <ShieldAlert size={48} />
        </div>
        <h2 className="mb-3 text-2xl font-black text-red-600 dark:text-red-400">
          {isRtl ? 'حدث خطأ أثناء التحليل' : 'Analysis Failed'}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md text-sm leading-relaxed font-medium font-semibold">
          {error}
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-3 font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        >
          {t('common.close')}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in space-y-8 py-10 duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary rounded-2xl p-3">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
              {isRtl ? 'تحليل مخاطر العقد' : 'Contract Risk Analysis'}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <FileText size={16} />
              {dataToRender.contractName}
            </p>
          </div>
        </div>

        <button
          onClick={() => window.history.back()}
          className="bg-card hover:bg-muted border-border/60 text-muted-foreground hover:text-foreground flex items-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
        >
          {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          {isRtl ? 'العودة للملفات' : 'Back to Files'}
        </button>
      </div>

      <hr className="border-border/40" />

      {/* Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Score Card */}
        <div className="bg-card border-border/60 relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border p-6 text-center shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent" />
          <h3 className="text-muted-foreground mb-4 flex items-center gap-1 text-sm font-bold">
            {isRtl ? 'مؤشر سلامة العقد الإجمالي' : 'Overall Contract Health'}
            <HelpCircle size={14} className="opacity-40" />
          </h3>

          <div className="relative flex items-center justify-center">
            <svg className="h-36 w-36 -rotate-90 transform">
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-muted/30"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-green-500 transition-all duration-1000 ease-in-out"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={402}
                strokeDashoffset={402 - (402 * dataToRender.overallScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black tracking-tight text-green-500">
                {dataToRender.overallScore}%
              </span>
              <span className="text-muted-foreground mt-0.5 text-[10px] font-bold tracking-wider uppercase">
                {isRtl ? 'آمن ومستقر' : 'Safe & Stable'}
              </span>
            </div>
          </div>
        </div>

        {/* AI Summary Card */}
        <div className="bg-card border-border/60 relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-sm md:col-span-2">
          <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-tr via-transparent to-transparent" />
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold">
                <TrendingUp size={12} />
                {isRtl ? 'ملخص ذكاء اصطناعي تنفيذي' : 'AI Executive Summary'}
              </span>
            </div>
            <p className="text-foreground mt-2 text-start text-base leading-relaxed font-medium">
              {dataToRender.summary}
            </p>
          </div>
          <div className="border-border/40 text-muted-foreground mt-4 flex items-center gap-2 border-t pt-4 text-xs font-semibold">
            <CheckCircle2 size={14} className="text-green-500" />
            {isRtl
              ? 'تم فحص جميع البنود القانونية وتصنيفها ذكياً.'
              : 'All clauses scanned and categorized intelligently.'}
          </div>
        </div>
      </div>

      {/* Risk Filter Tabs */}
      <div className="border-border/40 flex flex-wrap items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-foreground text-background shadow-md'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {isRtl ? 'كل الثغرات' : 'All Flaws'} ({dataToRender.items.length})
        </button>
        <button
          onClick={() => setActiveFilter('high')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeFilter === 'high'
              ? 'bg-red-500 text-white shadow-md'
              : 'text-red-500 hover:bg-red-500/5'
          }`}
        >
          <ShieldAlert size={16} />
          {isRtl ? 'مخاطر عالية' : 'High Risks'} ({dataToRender.stats.high})
        </button>
        <button
          onClick={() => setActiveFilter('medium')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeFilter === 'medium'
              ? 'bg-amber-500 text-white shadow-md'
              : 'text-amber-500 hover:bg-amber-500/5'
          }`}
        >
          <AlertTriangle size={16} />
          {isRtl ? 'متوسطة' : 'Medium'} ({dataToRender.stats.medium})
        </button>
        <button
          onClick={() => setActiveFilter('low')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            activeFilter === 'low'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-blue-500 hover:bg-blue-500/5'
          }`}
        >
          <ShieldCheck size={16} />
          {isRtl ? 'منخفضة' : 'Low'} ({dataToRender.stats.low})
        </button>
      </div>

      {/* Flaws / Clauses List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm font-medium">
            {isRtl
              ? 'لا توجد بنود تحت هذا التصنيف حالياً.'
              : 'No items found under this classification.'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <ClauseCard key={item.id} item={item as ClauseItem} />
          ))
        )}
      </div>
    </div>
  )
}
