import React from 'react'
import { FileText, ShieldCheck, Zap } from 'lucide-react'

const Home = () => {
  return (
    <div className="animate-in fade-in flex flex-col items-center space-y-8 text-center duration-700">
      {/* Badge الصغير */}
      <div className="bg-accent/10 text-accent border-accent/20 rounded-full border px-4 py-1.5 text-sm font-medium">
        ذكاء اصطناعي قانوني متطور ⚖️
      </div>

      {/* العنوان الرئيسي */}
      <h1 className="max-w-3xl leading-tight">
        حلل عقودك القانونية بلمحة بصر مع{' '}
        <span className="text-primary italic">Aqdy</span>
      </h1>

      <p className="text-muted-foreground max-w-2xl text-lg">
        منصتنا بتساعدك تفهم الثغرات القانونية، تراجع البنود، وتتأكد إن حقك محفوظ
        <br />
        باستخدام أحدث تقنيات الـ AI. نظام إسكندنافي بسيط، دقيق، وسريع.
      </p>

      {/* الأزرار */}
      <div className="flex gap-4 pt-4">
        <button className="bg-primary shadow-primary/20 rounded-xl px-8 py-3 font-semibold text-white shadow-lg transition-all hover:opacity-90">
          ابدأ التحليل الآن
        </button>
        <button className="border-border text-foreground hover:bg-muted rounded-xl border bg-transparent px-8 py-3 font-semibold transition-all">
          مشاهدة ديمو
        </button>
      </div>

      {/* Icons Section */}
      <div className="grid w-full grid-cols-1 gap-8 pt-16 md:grid-cols-3">
        <FeatureCard
          icon={<ShieldCheck className="text-primary" size={32} />}
          title="أمان تام"
          desc="عقودك مشفرة ومحمية بالكامل."
        />
        <FeatureCard
          icon={<Zap className="text-primary" size={32} />}
          title="تحليل سريع"
          desc="نتائج دقيقة في أقل من 30 ثانية."
        />
        <FeatureCard
          icon={<FileText className="text-primary" size={32} />}
          title="تقارير واضحة"
          desc="شرح مبسط لكل بند قانوني معقد."
        />
      </div>
    </div>
  )
}

const FeatureCard = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) => (
  <div className="bg-card border-border hover:border-primary/50 space-y-3 rounded-2xl border p-6 text-start transition-colors">
    <div className="bg-primary/5 w-fit rounded-lg p-3">{icon}</div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
  </div>
)

export default Home
