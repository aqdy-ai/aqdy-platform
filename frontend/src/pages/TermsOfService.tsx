// src/pages/TermsOfService.tsx
import { useTranslation } from 'react-i18next'
import SEO from '@/components/layout/SEO'

interface Section {
  id: string
  titleEn: string
  titleAr: string
  contentEn: React.ReactNode
  contentAr: React.ReactNode
}

export default function TermsOfService() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const sections: Section[] = [
    {
      id: 'agreement',
      titleEn: '1. Agreement to Terms',
      titleAr: '١. الموافقة على الشروط',
      contentEn: (
        <p>
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you
          (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and Aqdy (&quot;Aqdy&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) governing your
          access to and use of the Aqdy platform, including our website, web application, API, and
          all related services (collectively, the &quot;Service&quot;).
          <br /><br />
          By creating an account, accessing, or using the Service, you confirm that you have read,
          understood, and agree to be bound by these Terms and our Privacy Policy. If you do not
          agree, do not use the Service.
          <br /><br />
          If you are using the Service on behalf of an organization, you represent that you have the
          authority to bind that organization to these Terms.
        </p>
      ),
      contentAr: (
        <p>
          تُشكِّل شروط الخدمة هذه (&quot;الشروط&quot;) اتفاقية ملزمة قانونياً بينك (&quot;المستخدم&quot; أو &quot;أنت&quot;) وبين
          عقدي (&quot;عقدي&quot; أو &quot;نحن&quot;) تحكم وصولك إلى منصة عقدي واستخدامها، بما في ذلك موقعنا الإلكتروني
          وتطبيق الويب وواجهة برمجة التطبيقات (API) وجميع الخدمات ذات الصلة.
          <br /><br />
          بإنشائك حساباً أو الوصول إلى الخدمة أو استخدامها، فإنك تؤكد أنك قرأت هذه الشروط وفهمتها
          ووافقت على الالتزام بها وبسياسة الخصوصية. إذا لم توافق، يُرجى عدم استخدام الخدمة.
          <br /><br />
          إذا كنت تستخدم الخدمة نيابةً عن منظمة، فإنك تُقرّ بأن لديك الصلاحية لإلزام تلك المنظمة
          بهذه الشروط.
        </p>
      ),
    },
    {
      id: 'service-description',
      titleEn: '2. Description of Service',
      titleAr: '٢. وصف الخدمة',
      contentEn: (
        <div>
          <p className="mb-3">Aqdy provides an AI-powered legal contract analysis platform that enables users to:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>Upload contracts in PDF or DOCX format for automated analysis</li>
            <li>Extract, classify, and review contract clauses using a three-agent AI pipeline</li>
            <li>Receive risk assessments, confidence scores, and suggested redlines</li>
            <li>Access a bilingual (Arabic and English) legal knowledge base with 150+ clause types</li>
            <li>Store and retrieve a history of analyzed contracts</li>
            <li>Manage account settings, subscription plans, and billing</li>
          </ul>
          <div className="bg-amber-500/10 border-amber-500/30 mt-4 rounded-xl border p-4">
            <p className="text-amber-600 dark:text-amber-400 font-semibold">
              ⚠️ {' '}
              {isAr
                ? 'تنبيه مهم: عقدي هي أداة ذكاء اصطناعي مساعدة لمراجعة العقود ولا تُعدّ استشارة قانونية. يجب دائماً استشارة محامٍ مؤهّل قبل اتخاذ أي قرارات بناءً على التحليل.'
                : 'IMPORTANT DISCLAIMER: Aqdy is an AI-powered tool designed to assist with contract review. It does not constitute legal advice. You should always consult a qualified legal professional before making decisions based on any analysis provided by the Service.'}
            </p>
          </div>
        </div>
      ),
      contentAr: (
        <div>
          <p className="mb-3">توفّر عقدي منصة تحليل عقود قانونية مدعومة بالذكاء الاصطناعي تُمكّن المستخدمين من:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>رفع العقود بتنسيق PDF أو DOCX للتحليل الآلي</li>
            <li>استخراج بنود العقد وتصنيفها ومراجعتها باستخدام خط أنابيب الذكاء الاصطناعي المؤلف من ثلاثة وكلاء</li>
            <li>الحصول على تقييمات للمخاطر ودرجات الثقة والتعديلات المقترحة</li>
            <li>الوصول إلى قاعدة معرفة قانونية ثنائية اللغة (عربي وإنجليزي) تضم أكثر من 150 نوع بند</li>
            <li>تخزين واسترداد سجل العقود المحلّلة</li>
            <li>إدارة إعدادات الحساب وخطط الاشتراك والفوترة</li>
          </ul>
          <div className="bg-amber-500/10 border-amber-500/30 mt-4 rounded-xl border p-4">
            <p className="text-amber-600 dark:text-amber-400 font-semibold">
              ⚠️ تنبيه مهم: عقدي هي أداة ذكاء اصطناعي مساعدة لمراجعة العقود ولا تُعدّ استشارة قانونية. يجب دائماً استشارة محامٍ مؤهّل قبل اتخاذ أي قرارات بناءً على التحليل.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'account-registration',
      titleEn: '3. Account Registration',
      titleAr: '٣. تسجيل الحساب',
      contentEn: (
        <div className="space-y-3">
          <div>
            <h3 className="mb-2 text-base font-semibold">3.1 Eligibility</h3>
            <p>You must be at least 18 years of age to create an account. By registering, you represent and warrant that you meet this requirement.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">3.2 Account Security</h3>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information, keep your password secure, notify us immediately of any unauthorized access, and accept responsibility for all activities under your account.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">3.3 One Account Per User</h3>
            <p>Each user may maintain only one account. Creating duplicate or fraudulent accounts is prohibited.</p>
          </div>
        </div>
      ),
      contentAr: (
        <div className="space-y-3">
          <div>
            <h3 className="mb-2 text-base font-semibold">٣.١ الأهلية</h3>
            <p>يجب أن يكون عمرك 18 عاماً على الأقل لإنشاء حساب. بالتسجيل، تُقرّ وتضمن استيفاءك لهذا الشرط.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٣.٢ أمان الحساب</h3>
            <p>أنت مسؤول عن الحفاظ على سرية بيانات اعتماد حسابك. توافق على تقديم معلومات دقيقة والحفاظ على سرية كلمة مرورك وإخطارنا فوراً بأي وصول غير مصرّح به وتحمّل المسؤولية عن جميع الأنشطة التي تجري عبر حسابك.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٣.٣ حساب واحد لكل مستخدم</h3>
            <p>يُسمح لكل مستخدم بامتلاك حساب واحد فقط. يُحظر إنشاء حسابات مكررة أو احتيالية.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'subscription-plans',
      titleEn: '4. Subscription Plans and Credits',
      titleAr: '٤. خطط الاشتراك والرصيد',
      contentEn: (
        <div className="space-y-4">
          <div>
            <h3 className="mb-3 text-base font-semibold">4.1 Available Plans</h3>
            <div className="overflow-x-auto">
              <table className="border-border w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-border border px-4 py-2 text-start font-semibold">Plan</th>
                    <th className="border-border border px-4 py-2 text-start font-semibold">Monthly Credits</th>
                    <th className="border-border border px-4 py-2 text-start font-semibold">Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-border border px-4 py-2 font-semibold">Free</td>
                    <td className="border-border border px-4 py-2">500 credits/month</td>
                    <td className="border-border border px-4 py-2">Basic contract analysis, no history export</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-4 py-2 font-semibold">Pro</td>
                    <td className="border-border border px-4 py-2">5,000 credits/month</td>
                    <td className="border-border border px-4 py-2">Full contract history, priority support</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-4 py-2 font-semibold">Enterprise</td>
                    <td className="border-border border px-4 py-2">50,000 credits/month</td>
                    <td className="border-border border px-4 py-2">Custom history, SLA, dedicated support</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">4.2 Credits System</h3>
            <p>Credits reset monthly. Each analysis costs: <strong>50 base credits + (input tokens / 100) + (output tokens / 50)</strong>. Unused credits do not carry over.</p>
          </div>
        </div>
      ),
      contentAr: (
        <div className="space-y-4">
          <div>
            <h3 className="mb-3 text-base font-semibold">٤.١ الخطط المتاحة</h3>
            <div className="overflow-x-auto">
              <table className="border-border w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-border border px-4 py-2 text-start font-semibold">الخطة</th>
                    <th className="border-border border px-4 py-2 text-start font-semibold">الرصيد الشهري</th>
                    <th className="border-border border px-4 py-2 text-start font-semibold">المميزات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-border border px-4 py-2 font-semibold">المجانية</td>
                    <td className="border-border border px-4 py-2">500 رصيد/شهر</td>
                    <td className="border-border border px-4 py-2">تحليل أساسي للعقود، بدون تصدير السجل</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-4 py-2 font-semibold">الاحترافية</td>
                    <td className="border-border border px-4 py-2">5,000 رصيد/شهر</td>
                    <td className="border-border border px-4 py-2">سجل عقود كامل، دعم أولوية</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-4 py-2 font-semibold">المؤسسات</td>
                    <td className="border-border border px-4 py-2">50,000 رصيد/شهر</td>
                    <td className="border-border border px-4 py-2">سجل مخصص، اتفاقية مستوى الخدمة، دعم مخصص</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٤.٢ نظام الرصيد</h3>
            <p>يُعاد ضبط الرصيد شهرياً. تكلفة كل تحليل: <strong>50 رصيد أساسي + (الرموز المُدخلة ÷ 100) + (الرموز المُخرجة ÷ 50)</strong>. لا يُنقل الرصيد غير المستخدم للشهر التالي.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'acceptable-use',
      titleEn: '6. Acceptable Use',
      titleAr: '٦. الاستخدام المقبول',
      contentEn: (
        <div className="space-y-3">
          <div>
            <h3 className="mb-2 text-base font-semibold">6.1 Permitted Use</h3>
            <p>You may use the Service for lawful purposes in accordance with these Terms. You may upload contracts and legal documents that you have the legal right to process and analyze.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">6.2 Prohibited Conduct</h3>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc space-y-1 ps-5">
              <li>Upload documents you do not have the legal right to process</li>
              <li>Attempt to reverse-engineer or bypass AI models or credit enforcement systems</li>
              <li>Submit inputs designed to exploit AI vulnerabilities (prompt injection)</li>
              <li>Use automated scripts or bots to abuse the API or circumvent rate limits</li>
              <li>Share your account credentials or resell access to the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or data</li>
            </ul>
            <p className="mt-2 text-sm font-medium">Violation may result in immediate account suspension without refund.</p>
          </div>
        </div>
      ),
      contentAr: (
        <div className="space-y-3">
          <div>
            <h3 className="mb-2 text-base font-semibold">٦.١ الاستخدام المسموح</h3>
            <p>يجوز لك استخدام الخدمة لأغراض مشروعة وفقاً لهذه الشروط. يجوز لك رفع العقود والمستندات القانونية التي لديك الحق القانوني في معالجتها وتحليلها.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٦.٢ السلوك المحظور</h3>
            <p className="mb-2">توافق على عدم القيام بما يلي:</p>
            <ul className="list-disc space-y-1 ps-5">
              <li>رفع مستندات لا تملك الحق القانوني في معالجتها</li>
              <li>محاولة الهندسة العكسية لنماذج الذكاء الاصطناعي أو التحايل على أنظمة فرض حدود الرصيد</li>
              <li>إرسال مدخلات مصمّمة لاستغلال ثغرات الذكاء الاصطناعي (حقن المطالبات)</li>
              <li>استخدام نصوص آلية أو روبوتات لإساءة استخدام API أو التحايل على حدود المعدل</li>
              <li>مشاركة بيانات اعتماد حسابك أو إعادة بيع الوصول إلى الخدمة</li>
              <li>التدخل في سلامة الخدمة أو أدائها أو تعطيلها</li>
              <li>محاولة الوصول غير المصرّح به إلى حسابات أو بيانات المستخدمين الآخرين</li>
            </ul>
            <p className="mt-2 text-sm font-medium">قد يؤدي الانتهاك إلى تعليق الحساب فوراً دون استرداد.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai-disclaimer',
      titleEn: '9. AI Disclaimer and Limitations',
      titleAr: '٩. إخلاء مسؤولية الذكاء الاصطناعي وقيوده',
      contentEn: (
        <div>
          <p className="mb-3">The analysis, risk classifications, redline suggestions, and legal information provided by the Service are generated by AI models and are provided <strong>for informational purposes only</strong>.</p>
          <ul className="list-disc space-y-2 ps-5">
            <li><strong>Not Legal Advice:</strong> Nothing in the Service constitutes legal advice. Aqdy is not a law firm and does not provide legal representation.</li>
            <li><strong>No Guarantee of Accuracy:</strong> AI-generated analysis may contain errors, misclassifications, or omissions.</li>
            <li><strong>Professional Review Required:</strong> Always have a qualified legal professional review any contract before signing or relying on the analysis.</li>
            <li><strong>Confidence Scores:</strong> Where confidence scores are provided, low-confidence results indicate higher uncertainty and require additional review.</li>
            <li><strong>Language Limitations:</strong> While we support Arabic and English, analysis quality may vary across languages, document formats, and legal jurisdictions.</li>
          </ul>
        </div>
      ),
      contentAr: (
        <div>
          <p className="mb-3">التحليل وتصنيفات المخاطر والتعديلات المقترحة والمعلومات القانونية التي تقدمها الخدمة مُولَّدة بواسطة نماذج ذكاء اصطناعي وتُقدَّم <strong>لأغراض إعلامية فقط</strong>.</p>
          <ul className="list-disc space-y-2 ps-5">
            <li><strong>ليست استشارة قانونية:</strong> لا يُعدّ أي شيء في الخدمة استشارة قانونية. عقدي ليست مكتب محاماة ولا تقدم تمثيلاً قانونياً.</li>
            <li><strong>لا ضمان للدقة:</strong> قد يحتوي التحليل المُولَّد بالذكاء الاصطناعي على أخطاء أو تصنيفات غير صحيحة أو إغفالات.</li>
            <li><strong>المراجعة المهنية مطلوبة:</strong> احرص دائماً على مراجعة أي عقد من قِبل متخصص قانوني مؤهّل قبل توقيعه أو الاعتماد عليه.</li>
            <li><strong>درجات الثقة:</strong> عند توفير درجات الثقة، تشير درجات الثقة المنخفضة إلى عدم يقين أعلى وتستلزم مراجعة إضافية.</li>
            <li><strong>القيود اللغوية:</strong> رغم دعمنا للعربية والإنجليزية، قد تتفاوت جودة التحليل بحسب اللغة وتنسيقات المستندات والولايات القضائية القانونية.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'limitation-liability',
      titleEn: '11. Limitation of Liability',
      titleAr: '١١. تحديد المسؤولية',
      contentEn: (
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, AQDY AND ITS OFFICERS, DIRECTORS,
          EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR: any indirect, incidental, special,
          consequential, or punitive damages; loss of profits, revenue, data, or business
          opportunities; damages arising from reliance on AI-generated analysis; or any amount
          exceeding the fees paid by you to Aqdy in the 12 months preceding the claim.
        </p>
      ),
      contentAr: (
        <p>
          إلى أقصى حد يسمح به القانون المعمول به، لن تكون عقدي ومسؤولوها ومديروها وموظفوها ووكلاؤها مسؤولين عن: أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية؛ أو خسارة الأرباح أو الإيرادات أو البيانات أو الفرص التجارية؛ أو الأضرار الناجمة عن الاعتماد على التحليل المُولَّد بالذكاء الاصطناعي؛ أو أي مبلغ يتجاوز الرسوم التي دفعتها لعقدي خلال الاثني عشر شهراً السابقة للمطالبة.
        </p>
      ),
    },
    {
      id: 'contact',
      titleEn: '19. Contact Us',
      titleAr: '١٩. تواصل معنا',
      contentEn: (
        <div>
          <p>For questions about these Terms, please contact:</p>
          <div className="bg-muted/30 border-border mt-4 space-y-1 rounded-xl border p-4">
            <p className="font-semibold">Aqdy Legal Team</p>
            <p>
              General:{' '}
              <a href="mailto:legal@aqdy.com" className="text-primary hover:underline">
                legal@aqdy.com
              </a>
            </p>
            <p>
              Billing:{' '}
              <a href="mailto:billing@aqdy.com" className="text-primary hover:underline">
                billing@aqdy.com
              </a>
            </p>
            <p>
              Support:{' '}
              <a href="mailto:support@aqdy.com" className="text-primary hover:underline">
                support@aqdy.com
              </a>
            </p>
          </div>
          <p className="text-muted-foreground mt-4 text-sm italic">
            These Terms of Service were last reviewed and updated on June 4, 2026.
          </p>
        </div>
      ),
      contentAr: (
        <div>
          <p>لأي أسئلة حول هذه الشروط، يُرجى التواصل مع:</p>
          <div className="bg-muted/30 border-border mt-4 space-y-1 rounded-xl border p-4">
            <p className="font-semibold">الفريق القانوني في عقدي</p>
            <p>
              عام:{' '}
              <a href="mailto:legal@aqdy.com" className="text-primary hover:underline">
                legal@aqdy.com
              </a>
            </p>
            <p>
              الفوترة:{' '}
              <a href="mailto:billing@aqdy.com" className="text-primary hover:underline">
                billing@aqdy.com
              </a>
            </p>
            <p>
              الدعم:{' '}
              <a href="mailto:support@aqdy.com" className="text-primary hover:underline">
                support@aqdy.com
              </a>
            </p>
          </div>
          <p className="text-muted-foreground mt-4 text-sm italic">
            تمت مراجعة شروط الخدمة هذه وتحديثها في ٤ يونيو ٢٠٢٦.
          </p>
        </div>
      ),
    },
  ]

  const tocItems = [
    { id: 'agreement', labelEn: '1. Agreement to Terms', labelAr: '١. الموافقة على الشروط' },
    { id: 'service-description', labelEn: '2. Description of Service', labelAr: '٢. وصف الخدمة' },
    { id: 'account-registration', labelEn: '3. Account Registration', labelAr: '٣. تسجيل الحساب' },
    { id: 'subscription-plans', labelEn: '4. Subscription Plans & Credits', labelAr: '٤. خطط الاشتراك والرصيد' },
    { id: 'acceptable-use', labelEn: '6. Acceptable Use', labelAr: '٦. الاستخدام المقبول' },
    { id: 'ai-disclaimer', labelEn: '9. AI Disclaimer', labelAr: '٩. إخلاء مسؤولية الذكاء الاصطناعي' },
    { id: 'limitation-liability', labelEn: '11. Limitation of Liability', labelAr: '١١. تحديد المسؤولية' },
    { id: 'contact', labelEn: '19. Contact Us', labelAr: '١٩. تواصل معنا' },
  ]

  return (
    <>
      <SEO
        title={isAr ? 'شروط الخدمة' : 'Terms of Service'}
        description={
          isAr
            ? 'شروط الخدمة لمنصة عقدي — اتفاقية الاستخدام الملزمة قانونياً'
            : 'Aqdy Terms of Service — the legally binding usage agreement for the platform'
        }
      />

      <div className="mx-auto max-w-4xl py-16 px-4" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Page Header */}
        <div className="mb-12 text-center">
          <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
            {isAr ? 'وثيقة قانونية' : 'Legal Document'}
          </div>
          <h1 className="text-foreground mb-4 text-4xl font-black tracking-tight md:text-5xl" id="terms-heading">
            {isAr ? 'شروط الخدمة' : 'Terms of Service'}
          </h1>
          <p className="text-muted-foreground text-base">
            {isAr
              ? 'عقدي — تحليل العقود القانونية بالذكاء الاصطناعي'
              : 'Aqdy — AI-Powered Legal Contract Analysis'}
          </p>
          <div className="border-border/50 bg-muted/30 mt-6 inline-flex items-center gap-6 rounded-2xl border px-6 py-3 text-sm">
            <span>
              <span className="text-muted-foreground">{isAr ? 'تاريخ السريان: ' : 'Effective Date: '}</span>
              <span className="font-semibold">{isAr ? '٤ يونيو ٢٠٢٦' : 'June 4, 2026'}</span>
            </span>
            <span className="bg-border/50 h-4 w-px" />
            <span>
              <span className="text-muted-foreground">{isAr ? 'آخر تحديث: ' : 'Last Updated: '}</span>
              <span className="font-semibold">{isAr ? '٤ يونيو ٢٠٢٦' : 'June 4, 2026'}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-8 lg:items-start">
          {/* Sticky Table of Contents */}
          <aside className="border-border/50 bg-card/50 hidden shrink-0 rounded-2xl border p-5 backdrop-blur-sm lg:sticky lg:top-24 lg:block lg:w-56">
            <p className="text-foreground mb-3 text-sm font-bold">
              {isAr ? 'جدول المحتويات' : 'Table of Contents'}
            </p>
            <nav>
              <ul className="space-y-1.5">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-muted-foreground hover:text-primary block text-xs leading-relaxed transition-colors"
                    >
                      {isAr ? item.labelAr : item.labelEn}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="min-w-0 flex-1 space-y-10">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="border-border/40 scroll-mt-28 border-b pb-8 last:border-0"
              >
                <h2 className="text-foreground mb-4 text-xl font-bold">
                  {isAr ? section.titleAr : section.titleEn}
                </h2>
                <div className="text-muted-foreground leading-relaxed">
                  {isAr ? section.contentAr : section.contentEn}
                </div>
              </section>
            ))}

            {/* Back to top */}
            <div className="pt-4 text-center">
              <a
                href="#terms-heading"
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors hover:underline"
              >
                {isAr ? '↑ العودة للأعلى' : '↑ Back to top'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
