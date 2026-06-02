import RiskAnalysisDashboard from '@/pages/RiskAnalysisDashboard'
import SubscriptionBadge from '@/components/SubscriptionBadge'

export default function TestPage() {
  return (
    <div className="bg-background min-h-screen py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-6">
        <RiskAnalysisDashboard />
        <div className="max-w-md md:max-w-full">
          <SubscriptionBadge variant="full" />
        </div>
      </div>
    </div>
  )
}
