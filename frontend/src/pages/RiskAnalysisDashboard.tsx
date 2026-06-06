import { useState, useEffect, useRef } from 'react'
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
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
} from 'lucide-react'
import ClauseCard, { ClauseItem } from '../components/features/ClauseCard'
import { IClauseAnalysis, IRiskAnalysis } from '../types/analysis'

// Bilingual Mock Risk Data Generator
const getMockData = (isRtl: boolean) => ({
  contractName: isRtl ? 'عقد توريد برمجيات وتشغيل صيانة.pdf' : 'Software Supply & Maintenance Contract.pdf',
  overallScore: 68,
  overallRisk: 'high',
  summary: isRtl
    ? 'يحتوي العقد على التزامات مالية واضحة، ولكن هناك ثغرات حرجية في بنود التعويضات وحدود المسؤولية القانونية عند انقطاع الخدمة.'
    : 'The contract contains clear financial obligations, but has critical loopholes in indemnification and liability caps.',
  stats: {
    high: 3,
    medium: 5,
    low: 8,
  },
  items: [
    {
      id: 'r1',
      severity: 'high' as const,
      title: isRtl ? 'شرط جزائي مفتوح وبدون حد أقصى' : 'Unlimited Penalty Clause',
      clause: isRtl
        ? 'البند 4.2: يلتزم الطرف الثاني بدفع تعويض مالي عن كل يوم تأخير في التسليم دون تحديد سقف أعلى للعقوبة.'
        : 'Clause 4.2: The second party is liable to pay daily delay penalties without any upper cap.',
      explanation: isRtl
        ? 'هذا البند يفرض التزامات مالية غير محدودة قد تؤدي لتعثر الطرف الثاني ماليًا.'
        : 'Unlimited liability daily penalty poses severe financial risk with no maximum ceiling.',
      redlineSuggestion: isRtl
        ? 'يجب تعديل البند لصياغة حد أقصى للغرامة لا يتجاوز 10% من القيمة الإجمالية للعقد.'
        : 'The maximum total delay penalty shall not exceed 10% of the total contract value.',
      confidence: 0.95,
      sourceFromKB: 'kb_penalty_cap_01',
    },
    {
      id: 'r2',
      severity: 'high' as const,
      title: isRtl ? 'غموض في آلية إنهاء التعاقد المبكر' : 'Vague Early Termination Clause',
      clause: isRtl
        ? 'البند 9.1: يحق للطرف الأول إنهاء العقد في أي وقت دون إشعار مسبق ودون إبداء أسباب.'
        : 'Clause 9.1: First party may terminate the contract at any time without notice or reason.',
      explanation: isRtl
        ? 'الإنهاء الفوري بدون سبب يضر بالاستقرار التشغيلي والتخطيط المالي للطرف الثاني.'
        : 'Immediate termination without cause harms operational stability and resource allocation.',
      redlineSuggestion: isRtl
        ? 'إضافة شرط يوجب الإخطار الكتابي قبل الإنهاء بـ 30 يوماً على الأقل لضمان استقرار التشغيل.'
        : 'Either party may terminate this agreement with 30 days prior written notice.',
      confidence: 0.88,
      sourceFromKB: 'kb_termination_notice',
    },
    {
      id: 'r3',
      severity: 'medium' as const,
      title: isRtl ? 'قانون فض النزاعات خارج الاختصاص المحلي' : 'Non-Local Governing Law',
      clause: isRtl
        ? 'البند 12.5: تخضع هذه الاتفاقية وتُفسر وفقاً قوانين مركز دبي المالي العالمي.'
        : 'Clause 12.5: This agreement is governed by the laws of Dubai International Financial Centre.',
      explanation: isRtl
        ? 'الاختصاص القضائي الخارجي يزيد من تكاليف التقاضي وصعوبة تسوية النزاعات.'
        : 'Foreign governing law increases litigation costs and procedural complexity.',
      redlineSuggestion: isRtl
        ? 'يُفضل تعديل الاختصاص ليكون المحاكم المحلية لتقليل تكاليف التقاضي في حال النزاع.'
        : 'This agreement shall be governed by and construed in accordance with the local laws.',
      confidence: 0.76,
      sourceFromKB: 'kb_governing_law_03',
    },
    {
      id: 'r4',
      severity: 'low' as const,
      title: isRtl ? 'عدم تحديد وثائق التأمين المطلوبة' : 'Unspecified Insurance Details',
      clause: isRtl
        ? 'البند 7.3: يلتزم المورد بتوفير وثيقة تأمين ضد الأخطار المهنية طوال فترة العقد.'
        : 'Clause 7.3: Supplier must maintain professional liability insurance.',
      explanation: isRtl
        ? 'عدم تحديد قيمة وثيقة التأمين قد يؤدي لخلافات حول ملاءة التغطية التأمينية.'
        : 'Failing to specify minimum insurance coverage limits can lead to disputes.',
      redlineSuggestion: isRtl
        ? 'تحديد القيمة الأدنى للتأمين لتفادي الخلافات التنفيذية لاحقاً.'
        : 'Supplier shall maintain insurance coverage of at least $100,000 per occurrence.',
      confidence: 0.62,
      sourceFromKB: 'kb_insurance_min',
    },
  ],
})

export default function RiskAnalysisDashboard() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const [searchParams] = useSearchParams()
  const contractId = searchParams.get('id')

  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [expandedClauseId, setExpandedClauseId] = useState<string | null>(null)
  const [highlightedRisk, setHighlightedRisk] = useState<'high' | 'medium' | 'low' | null>(null)

  const tableRef = useRef<HTMLDivElement>(null)

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

    let isActive = true

    Promise.resolve().then(() => {
      if (isActive) {
        setIsLoading(true)
        setError(null)
      }
    })

    let pollCount = 0
    const maxPolls = 60

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

    return () => {
      isActive = false
      clearInterval(pollInterval)
    }
  }, [contractId])

  const MOCK_RISK_DATA = getMockData(isRtl)

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
              explanation: isRtl ? item.explanation?.ar || '' : item.explanation?.en || '',
              redlineSuggestion: item.redlineSuggestion,
              confidence: item.confidence,
              sourceFromKB: item.sourceFromKB,
            }
          }
        ),
      }
    : MOCK_RISK_DATA

  // Calculate estimated negotiation priority label based on counts
  const negotiationPriority =
    dataToRender.stats.high > 0
      ? 'high'
      : dataToRender.stats.medium > 0
        ? 'medium'
        : 'low'

  const getNegotiationPriorityText = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return isRtl ? 'أولوية تفاوضية: عالية' : 'Negotiation Priority: High'
      case 'medium':
        return isRtl ? 'أولوية تفاوضية: متوسطة' : 'Negotiation Priority: Medium'
      case 'low':
      default:
        return isRtl ? 'أولوية تفاوضية: منخفضة' : 'Negotiation Priority: Low'
    }
  }

  const getOverallRiskText = (risk: string) => {
    if (risk === 'high' || risk === 'critical') {
      return isRtl ? 'مخاطر عالية' : 'High Risk'
    } else if (risk === 'medium') {
      return isRtl ? 'مخاطر متوسطة' : 'Medium Risk'
    } else {
      return isRtl ? 'مخاطر منخفضة' : 'Low Risk'
    }
  }

  const getOverallRiskBadgeClass = (risk: string) => {
    if (risk === 'high' || risk === 'critical') {
      return 'bg-red-500/10 text-red-500 border border-red-500/20'
    } else if (risk === 'medium') {
      return 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
    } else {
      return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
    }
  }

  const getSeverityBadgeClass = (sev: 'high' | 'medium' | 'low') => {
    switch (sev) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border border-red-500/20'
      case 'medium':
        return 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
      case 'low':
      default:
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
    }
  }

  const getSeverityLabel = (sev: 'high' | 'medium' | 'low') => {
    switch (sev) {
      case 'high':
        return isRtl ? 'عالية' : 'High'
      case 'medium':
        return isRtl ? 'متوسطة' : 'Medium'
      case 'low':
      default:
        return isRtl ? 'منخفضة' : 'Low'
    }
  }

  const getOneLineSummary = (explanation: string) => {
    if (!explanation) return ''
    const sentenceEnd = explanation.indexOf('.')
    const sentenceEndAr = explanation.indexOf('؟')
    const endIdx = sentenceEnd !== -1 ? sentenceEnd : sentenceEndAr
    if (endIdx !== -1) {
      return explanation.substring(0, endIdx + 1).trim()
    }
    return explanation.length > 70 ? explanation.substring(0, 70) + '...' : explanation
  }

  const filteredItems = dataToRender.items.filter((item) => {
    if (activeFilter === 'all') return true
    return item.severity === activeFilter
  })

  const handleJumpToRisk = (sev: 'high' | 'medium' | 'low') => {
    setActiveFilter(sev)
    setHighlightedRisk(sev)
    setTimeout(() => {
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
    setTimeout(() => {
      setHighlightedRisk(null)
    }, 2000)
  }

  const toggleRow = (id: string) => {
    setExpandedClauseId((prev) => (prev === id ? null : id))
  }

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
        <p className="text-muted-foreground mb-8 max-w-md text-sm leading-relaxed font-semibold">
          {error}
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-3 font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer"
        >
          {t('common.close')}
        </button>
      </div>
    )
  }

  const overallRiskLevel = dataToRender.stats.high > 0 ? 'high' : 'medium'

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
          className="bg-card hover:bg-muted border-border/60 text-muted-foreground hover:text-foreground flex items-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-bold transition-all active:scale-95 cursor-pointer"
        >
          {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          {isRtl ? 'العودة للملفات' : 'Back to Files'}
        </button>
      </div>

      <hr className="border-border/40" />

      {/* Executive Summary Card */}
      <div className="bg-card border-border/60 relative overflow-hidden rounded-3xl border p-6 md:p-8 shadow-md">
        <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-tr via-transparent to-transparent" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider">
                <TrendingUp size={14} />
                {isRtl ? 'ملخص ذكاء اصطناعي تنفيذي' : 'AI Executive Summary'}
              </span>
              <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${getOverallRiskBadgeClass(overallRiskLevel)}`}>
                {getOverallRiskText(overallRiskLevel)}
              </span>
            </div>
            <span className={`text-xs font-black px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`}>
              {getNegotiationPriorityText(negotiationPriority)}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="text-foreground text-lg font-bold">
              {isRtl ? 'النتائج والملخص العام للتحليل' : 'Key Analysis Findings'}
            </h3>
            <p className="text-muted-foreground text-base leading-relaxed font-medium">
              {dataToRender.summary}
            </p>
          </div>

          {/* Breakdown bar */}
          <div className="space-y-2">
            <span className="text-muted-foreground text-xs font-bold block">
              {isRtl ? 'توزيع المخاطر والروابط السريعة:' : 'Risk Distribution & Quick Jumps:'}
            </span>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                style={{ width: `${(dataToRender.stats.high / (dataToRender.stats.high + dataToRender.stats.medium + dataToRender.stats.low || 1)) * 100}%` }}
                className="bg-red-500 transition-all duration-500"
              />
              <div
                style={{ width: `${(dataToRender.stats.medium / (dataToRender.stats.high + dataToRender.stats.medium + dataToRender.stats.low || 1)) * 100}%` }}
                className="bg-amber-500 transition-all duration-500"
              />
              <div
                style={{ width: `${(dataToRender.stats.low / (dataToRender.stats.high + dataToRender.stats.medium + dataToRender.stats.low || 1)) * 100}%` }}
                className="bg-blue-500 transition-all duration-500"
              />
            </div>

            {/* Jump links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-extrabold">
              <button
                onClick={() => handleJumpToRisk('high')}
                className="text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                {dataToRender.stats.high} {isRtl ? 'عالية' : 'High'}
              </button>
              <button
                onClick={() => handleJumpToRisk('medium')}
                className="text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                {dataToRender.stats.medium} {isRtl ? 'متوسطة' : 'Medium'}
              </button>
              <button
                onClick={() => handleJumpToRisk('low')}
                className="text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                {dataToRender.stats.low} {isRtl ? 'منخفضة' : 'Low'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div ref={tableRef} className="border-border/40 flex flex-wrap items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-foreground text-background shadow-md'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {isRtl ? 'كل الثغرات' : 'All Flaws'} ({dataToRender.items.length})
        </button>
        <button
          onClick={() => setActiveFilter('high')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
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
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
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
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
            activeFilter === 'low'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-blue-500 hover:bg-blue-500/5'
          }`}
        >
          <ShieldCheck size={16} />
          {isRtl ? 'منخفضة' : 'Low'} ({dataToRender.stats.low})
        </button>
      </div>

      {/* Clause Table */}
      <div className="bg-card border border-border/60 overflow-hidden rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-bold">
                <th className="px-6 py-4 text-start font-black">{isRtl ? 'البند' : 'Clause Title'}</th>
                <th className="px-6 py-4 text-start font-black w-32">{isRtl ? 'درجة الخطورة' : 'Risk Level'}</th>
                <th className="px-6 py-4 text-start font-black hidden md:table-cell">{isRtl ? 'ملخص موجز' : 'Summary'}</th>
                <th className="px-6 py-4 text-end font-black w-28">{isRtl ? 'التفاصيل' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground py-12 text-center text-sm font-semibold">
                    {isRtl ? 'لا توجد بنود تحت هذا التصنيف حالياً.' : 'No items found under this classification.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedClauseId === item.id
                  const isHighlighted = highlightedRisk === item.severity
                  return (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td colSpan={4} className="p-0">
                        {/* Interactive Main Row Row */}
                        <div
                          onClick={() => toggleRow(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleRow(item.id)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          aria-controls={`clause-details-${item.id}`}
                          className={`w-full flex items-center justify-between px-6 py-4 cursor-pointer outline-none focus:bg-muted/20 ${
                            isHighlighted ? 'bg-primary/5 border-l-4 border-primary animate-pulse transition-all duration-300' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-start">
                            <span className="font-bold text-foreground text-base truncate pr-2 max-w-xs md:max-w-sm">
                              {item.title}
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase text-center w-24 ${getSeverityBadgeClass(item.severity)}`}>
                              {getSeverityLabel(item.severity)}
                            </span>
                          </div>

                          <span className="text-muted-foreground text-xs font-semibold flex-1 truncate pr-8 hidden md:block text-start max-w-md">
                            {getOneLineSummary(item.explanation)}
                          </span>

                          <span className="text-primary hover:text-primary/80 shrink-0 font-bold text-xs flex items-center gap-1 pl-4">
                            <span>
                              {isExpanded ? (isRtl ? 'إخفاء' : 'Collapse') : (isRtl ? 'عرض' : 'Expand')}
                            </span>
                            {isExpanded ? (
                              <ChevronDown size={16} />
                            ) : isRtl ? (
                              <ChevronLeft size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </span>
                        </div>

                        {/* Expanded Panel */}
                        {isExpanded && (
                          <div id={`clause-details-${item.id}`} className="border-t border-border/40 bg-muted/20">
                            <ClauseCard item={item as ClauseItem} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
