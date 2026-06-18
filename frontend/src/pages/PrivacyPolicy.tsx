// src/pages/PrivacyPolicy.tsx
import { useTranslation } from 'react-i18next'
import SEO from '@/components/layout/SEO'

interface Section {
  id: string
  titleEn: string
  titleAr: string
  contentEn: React.ReactNode
  contentAr: React.ReactNode
}

export default function PrivacyPolicy() {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const sections: Section[] = [
    {
      id: 'introduction',
      titleEn: '1. Introduction',
      titleAr: '١. مقدمة',
      contentEn: (
        <p>
          Welcome to Aqdy (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). Aqdy is an AI-powered legal contract
          analysis platform that helps individuals and businesses review, classify, and redline
          contracts in Arabic and English.
          <br /><br />
          This Privacy Policy explains how we collect, use, store, share, and protect your personal
          information when you use our website, application, and related services (collectively, the
          &quot;Service&quot;). By using Aqdy, you agree to the practices described in this policy.
          <br /><br />
          If you do not agree with any part of this policy, please discontinue use of the Service.
        </p>
      ),
      contentAr: (
        <p>
          مرحباً بك في عقدي (&quot;نحن&quot; أو &quot;لنا&quot;). عقدي هي منصة تحليل عقود قانونية مدعومة بالذكاء
          الاصطناعي تساعد الأفراد والشركات على مراجعة العقود وتصنيفها واقتراح التعديلات عليها باللغتين
          العربية والإنجليزية.
          <br /><br />
          توضح سياسة الخصوصية هذه كيفية جمعنا لمعلوماتك الشخصية واستخدامها وتخزينها ومشاركتها
          وحمايتها عند استخدامك لموقعنا وتطبيقنا والخدمات ذات الصلة (يُشار إليها مجتمعةً بـ
          &quot;الخدمة&quot;). باستخدامك لعقدي، توافق على الممارسات الموضحة في هذه السياسة.
          <br /><br />
          إذا لم توافق على أي جزء من هذه السياسة، يُرجى التوقف عن استخدام الخدمة.
        </p>
      ),
    },
    {
      id: 'information-we-collect',
      titleEn: '2. Information We Collect',
      titleAr: '٢. المعلومات التي نجمعها',
      contentEn: (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-base font-semibold">2.1 Information You Provide Directly</h3>
            <ul className="list-disc space-y-1 ps-5">
              <li><strong>Account Information:</strong> When you register, we collect your name, email address, and password (stored in hashed form).</li>
              <li><strong>Contract Documents:</strong> Files you upload for analysis (PDF or DOCX format).</li>
              <li><strong>Profile Updates:</strong> Any changes you make to your name, email, or password via account settings.</li>
              <li><strong>Payment Information:</strong> Processed by our third-party payment provider (Stripe). We do not store full payment card details.</li>
              <li><strong>Communications:</strong> If you contact our support team, we retain the content of those communications.</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">2.2 Information Collected Automatically</h3>
            <ul className="list-disc space-y-1 ps-5">
              <li><strong>Usage Data:</strong> Pages visited, features used, analysis requests made, timestamps, and session duration.</li>
              <li><strong>Device and Technical Data:</strong> IP address, browser type, operating system, and device identifiers.</li>
              <li><strong>Log Data:</strong> Server logs including API requests, error events, and response times.</li>
              <li><strong>Cookies and Similar Technologies:</strong> We use cookies and session tokens (stored in httpOnly cookies) to authenticate users and maintain sessions.</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">2.3 AI Analysis Data</h3>
            <p>When you submit a contract for analysis, the document text is processed through our AI pipeline. Analysis results — including identified clauses, risk classifications, confidence scores, and suggested redlines — are stored in association with your account.</p>
          </div>
        </div>
      ),
      contentAr: (
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-base font-semibold">٢.١ المعلومات التي تقدمها مباشرةً</h3>
            <ul className="list-disc space-y-1 ps-5">
              <li><strong>معلومات الحساب:</strong> عند التسجيل، نجمع اسمك وعنوان بريدك الإلكتروني وكلمة المرور (مخزّنة بصيغة مشفّرة).</li>
              <li><strong>مستندات العقود:</strong> الملفات التي ترفعها للتحليل (بتنسيق PDF أو DOCX).</li>
              <li><strong>تحديثات الملف الشخصي:</strong> أي تغييرات تجريها على اسمك أو بريدك الإلكتروني أو كلمة المرور.</li>
              <li><strong>معلومات الدفع:</strong> تتم المعالجة عبر مزوّد دفع خارجي (Stripe). لا نخزّن تفاصيل بطاقة الدفع الكاملة.</li>
              <li><strong>التواصل:</strong> إذا تواصلت مع فريق الدعم، نحتفظ بمحتوى تلك المراسلات.</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٢.٢ المعلومات المجمّعة تلقائياً</h3>
            <ul className="list-disc space-y-1 ps-5">
              <li><strong>بيانات الاستخدام:</strong> الصفحات المُزارة، والميزات المُستخدمة، وطلبات التحليل، والطوابع الزمنية، ومدة الجلسة.</li>
              <li><strong>البيانات التقنية والجهاز:</strong> عنوان IP، ونوع المتصفح، ونظام التشغيل، ومعرّفات الجهاز.</li>
              <li><strong>بيانات السجلات:</strong> سجلات الخادم بما في ذلك طلبات API وأحداث الأخطاء وأوقات الاستجابة.</li>
              <li><strong>ملفات تعريف الارتباط:</strong> نستخدم ملفات تعريف الارتباط ورموز الجلسة لمصادقة المستخدمين والحفاظ على جلساتهم.</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٢.٣ بيانات تحليل الذكاء الاصطناعي</h3>
            <p>عند إرسال عقد للتحليل، تُعالَج نصوص المستند عبر خط أنابيب الذكاء الاصطناعي لدينا. تُخزَّن نتائج التحليل — بما في ذلك البنود المُحدَّدة والتصنيفات ودرجات الثقة والتعديلات المقترحة — مرتبطةً بحسابك.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'pii-filtering',
      titleEn: '3. PII Filtering',
      titleAr: '٣. تصفية المعلومات الشخصية',
      contentEn: (
        <p>
          Aqdy implements automatic PII detection and redaction before contract text is passed to AI models. This includes identification and masking of: phone numbers, email addresses, national identification numbers, credit card numbers, and other sensitive personal identifiers.
          <br /><br />
          While we make reasonable efforts to detect and redact PII, we cannot guarantee complete removal of all sensitive information. You are encouraged to review documents before upload.
        </p>
      ),
      contentAr: (
        <p>
          تُطبِّق عقدي آليات تلقائية للكشف عن المعلومات الشخصية القابلة للتعريف (PII) وحذفها قبل تمرير نص العقد إلى نماذج الذكاء الاصطناعي، وتشمل: أرقام الهواتف، وعناوين البريد الإلكتروني، وأرقام الهوية الوطنية، وأرقام بطاقات الائتمان، وغيرها من المعرّفات الشخصية الحساسة.
          <br /><br />
          بينما نبذل جهوداً معقولة للكشف عن هذه المعلومات وحذفها، لا يمكننا ضمان الإزالة الكاملة لجميع المعلومات الحساسة. يُوصى بمراجعة المستندات قبل رفعها.
        </p>
      ),
    },
    {
      id: 'how-we-use',
      titleEn: '4. How We Use Your Information',
      titleAr: '٤. كيف نستخدم معلوماتك',
      contentEn: (
        <div>
          <p className="mb-3">We use the information we collect to:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li><strong>Provide the Service:</strong> Process uploaded contracts, generate AI-powered analysis reports, and display results.</li>
            <li><strong>Account Management:</strong> Create and maintain your account, authenticate logins, and manage subscription plans.</li>
            <li><strong>Billing and Payments:</strong> Process subscription payments and handle billing history.</li>
            <li><strong>Security:</strong> Detect and prevent fraud, abuse, prompt injection attacks, and unauthorized access.</li>
            <li><strong>Compliance and Audit:</strong> Maintain audit logs for compliance, debugging, and dispute resolution.</li>
            <li><strong>Service Improvement:</strong> Analyze aggregate usage patterns to improve accuracy and features.</li>
            <li><strong>Legal Obligations:</strong> Comply with applicable law and enforce our Terms of Service.</li>
          </ul>
          <p className="mt-3 font-semibold">We do not use your contract documents to train AI models without your explicit consent.</p>
        </div>
      ),
      contentAr: (
        <div>
          <p className="mb-3">نستخدم المعلومات التي نجمعها من أجل:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li><strong>تقديم الخدمة:</strong> معالجة العقود المرفوعة وإنشاء تقارير تحليل مدعومة بالذكاء الاصطناعي.</li>
            <li><strong>إدارة الحساب:</strong> إنشاء حسابك والحفاظ عليه ومصادقة تسجيلات الدخول وإدارة خطط الاشتراك.</li>
            <li><strong>الفوترة والمدفوعات:</strong> معالجة مدفوعات الاشتراك وإدارة سجلات الفوترة.</li>
            <li><strong>الأمان:</strong> الكشف عن الاحتيال والإساءة وهجمات حقن المطالبات والوصول غير المصرّح به ومنعها.</li>
            <li><strong>الامتثال والتدقيق:</strong> الاحتفاظ بسجلات التدقيق للامتثال وتصحيح الأخطاء وتسوية النزاعات.</li>
            <li><strong>تحسين الخدمة:</strong> تحليل أنماط الاستخدام الإجمالية لتحسين الدقة والميزات.</li>
            <li><strong>الالتزامات القانونية:</strong> الامتثال للقانون المعمول به وتطبيق شروط الخدمة.</li>
          </ul>
          <p className="mt-3 font-semibold">لا نستخدم مستندات عقودك لتدريب نماذج الذكاء الاصطناعي دون موافقتك الصريحة.</p>
        </div>
      ),
    },
    {
      id: 'data-retention',
      titleEn: '6. Data Retention',
      titleAr: '٦. الاحتفاظ بالبيانات',
      contentEn: (
        <div className="overflow-x-auto">
          <table className="border-border w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-border border px-4 py-2 text-start font-semibold">Data Type</th>
                <th className="border-border border px-4 py-2 text-start font-semibold">Retention Period</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Account information', 'Duration of account plus 30 days after deletion'],
                ['Uploaded contract documents', 'Duration of account (or until you delete them)'],
                ['Analysis results and contract history', 'Duration of account (or until you delete them)'],
                ['Audit logs', '12 months'],
                ['Payment records', '7 years (legal/tax requirement)'],
                ['Server logs', '90 days'],
              ].map(([type, period]) => (
                <tr key={type} className="border-border border-b">
                  <td className="border-border border px-4 py-2">{type}</td>
                  <td className="border-border border px-4 py-2">{period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
      contentAr: (
        <div className="overflow-x-auto">
          <table className="border-border w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-border border px-4 py-2 text-start font-semibold">نوع البيانات</th>
                <th className="border-border border px-4 py-2 text-start font-semibold">فترة الاحتفاظ</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['معلومات الحساب', 'مدة الحساب + 30 يوماً بعد الحذف'],
                ['مستندات العقود المرفوعة', 'مدة الحساب (أو حتى تقوم بحذفها)'],
                ['نتائج التحليل وسجل العقود', 'مدة الحساب (أو حتى تقوم بحذفها)'],
                ['سجلات التدقيق', '12 شهراً'],
                ['سجلات المدفوعات', '7 سنوات (متطلبات قانونية/ضريبية)'],
                ['سجلات الخادم', '90 يوماً'],
              ].map(([type, period]) => (
                <tr key={type} className="border-border border-b">
                  <td className="border-border border px-4 py-2">{type}</td>
                  <td className="border-border border px-4 py-2">{period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: 'data-sharing',
      titleEn: '7. Data Sharing and Disclosure',
      titleAr: '٧. مشاركة البيانات والإفصاح عنها',
      contentEn: (
        <div className="space-y-3">
          <p>We do not sell your personal information. We may share data in the following circumstances:</p>
          <div>
            <h3 className="mb-2 text-base font-semibold">7.1 Service Providers (Sub-processors)</h3>
            <ul className="list-disc space-y-1 ps-5">
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Google (Gemini API)</strong> — AI language model inference</li>
              <li><strong>Pinecone</strong> — vector database for semantic search</li>
              <li><strong>Langfuse</strong> — AI pipeline tracing and monitoring</li>
              <li><strong>MongoDB Atlas</strong> — database hosting</li>
              <li><strong>Cloud infrastructure providers</strong> — hosting and deployment</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">7.2 Legal Requirements</h3>
            <p>We may disclose information if required to do so by law or in response to valid legal process.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">7.3 Business Transfers</h3>
            <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
          </div>
        </div>
      ),
      contentAr: (
        <div className="space-y-3">
          <p>لا نبيع معلوماتك الشخصية. قد نشارك البيانات في الحالات التالية:</p>
          <div>
            <h3 className="mb-2 text-base font-semibold">٧.١ مزودو الخدمات (المعالجون الفرعيون)</h3>
            <ul className="list-disc space-y-1 ps-5">
              <li><strong>Stripe</strong> — معالجة المدفوعات</li>
              <li><strong>Google (Gemini API)</strong> — استنتاج نموذج اللغة بالذكاء الاصطناعي</li>
              <li><strong>Pinecone</strong> — قاعدة بيانات المتجهات للبحث الدلالي</li>
              <li><strong>Langfuse</strong> — تتبع خط أنابيب الذكاء الاصطناعي ومراقبته</li>
              <li><strong>MongoDB Atlas</strong> — استضافة قواعد البيانات</li>
              <li><strong>مزودو البنية التحتية السحابية</strong> — الاستضافة والنشر</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٧.٢ المتطلبات القانونية</h3>
            <p>قد نُفصح عن المعلومات إذا كان ذلك مطلوباً قانوناً أو استجابةً لإجراء قانوني صحيح.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">٧.٣ نقل الأعمال</h3>
            <p>في حالة الاندماج أو الاستحواذ أو بيع الأصول، قد يُنقل حسابك كجزء من تلك المعاملة.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'data-security',
      titleEn: '8. Data Security',
      titleAr: '٨. أمان البيانات',
      contentEn: (
        <div>
          <p className="mb-3">We implement industry-standard security measures including:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>Encryption of data in transit (TLS/HTTPS)</li>
            <li>Hashed password storage</li>
            <li>JWT authentication via httpOnly secure cookies</li>
            <li>Input validation and sanitization on all API endpoints</li>
            <li>Prompt injection prevention for AI pipeline inputs</li>
            <li>Rate limiting to prevent abuse</li>
            <li>Role-based access controls (user vs. admin roles)</li>
            <li>Regular security testing and code review</li>
          </ul>
        </div>
      ),
      contentAr: (
        <div>
          <p className="mb-3">نطبّق تدابير أمنية وفق معايير الصناعة تشمل:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>تشفير البيانات أثناء النقل (TLS/HTTPS)</li>
            <li>تخزين كلمات المرور بصيغة مشفّرة (Hashed)</li>
            <li>مصادقة JWT عبر ملفات تعريف ارتباط آمنة httpOnly</li>
            <li>التحقق من صحة المدخلات وتنظيفها على جميع نقاط نهاية API</li>
            <li>منع هجمات حقن المطالبات لمدخلات خط أنابيب الذكاء الاصطناعي</li>
            <li>تحديد معدل الطلبات لمنع الإساءة</li>
            <li>ضوابط وصول قائمة على الأدوار (مستخدم مقابل مسؤول)</li>
            <li>اختبارات أمنية دورية ومراجعة الكود</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'your-rights',
      titleEn: '10. Your Rights',
      titleAr: '١٠. حقوقك',
      contentEn: (
        <div>
          <p className="mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;).</li>
            <li><strong>Portability:</strong> Request a machine-readable export of your data.</li>
            <li><strong>Restriction:</strong> Request that we restrict processing of your data.</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
            <li><strong>Withdrawal of Consent:</strong> Withdraw consent at any time.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:privacy@aqdy.com" className="text-primary hover:underline">
              privacy@aqdy.com
            </a>
            . We will respond within 30 days.
          </p>
        </div>
      ),
      contentAr: (
        <div>
          <p className="mb-3">قد تتمتع بالحقوق التالية فيما يتعلق ببياناتك الشخصية:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li><strong>الوصول:</strong> طلب نسخة من البيانات الشخصية التي نحتفظ بها عنك.</li>
            <li><strong>التصحيح:</strong> طلب تصحيح البيانات غير الدقيقة أو غير المكتملة.</li>
            <li><strong>الحذف:</strong> طلب حذف بياناتك الشخصية (&quot;الحق في النسيان&quot;).</li>
            <li><strong>قابلية النقل:</strong> طلب تصدير بياناتك بتنسيق قابل للقراءة آلياً.</li>
            <li><strong>التقييد:</strong> طلب تقييد معالجة بياناتك في ظروف معينة.</li>
            <li><strong>الاعتراض:</strong> الاعتراض على المعالجة القائمة على المصالح المشروعة.</li>
            <li><strong>سحب الموافقة:</strong> سحب موافقتك في أي وقت.</li>
          </ul>
          <p className="mt-3">
            لممارسة أي من هذه الحقوق، يُرجى التواصل معنا على{' '}
            <a href="mailto:privacy@aqdy.com" className="text-primary hover:underline">
              privacy@aqdy.com
            </a>
            . سنرد في غضون 30 يوماً.
          </p>
        </div>
      ),
    },
    {
      id: 'contact',
      titleEn: '15. Contact Us',
      titleAr: '١٥. تواصل معنا',
      contentEn: (
        <div>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy, please contact:</p>
          <div className="bg-muted/30 border-border mt-4 rounded-xl border p-4">
            <p className="font-semibold">Aqdy Privacy Team</p>
            <p>
              Email:{' '}
              <a href="mailto:privacy@aqdy.com" className="text-primary hover:underline">
                privacy@aqdy.com
              </a>
            </p>
          </div>
          <p className="text-muted-foreground mt-4 text-sm italic">
            This Privacy Policy was last reviewed and updated on June 4, 2026.
          </p>
        </div>
      ),
      contentAr: (
        <div>
          <p>إذا كانت لديك أي أسئلة أو مخاوف أو طلبات تتعلق بسياسة الخصوصية هذه، يُرجى التواصل مع:</p>
          <div className="bg-muted/30 border-border mt-4 rounded-xl border p-4">
            <p className="font-semibold">فريق الخصوصية في عقدي</p>
            <p>
              البريد الإلكتروني:{' '}
              <a href="mailto:privacy@aqdy.com" className="text-primary hover:underline">
                privacy@aqdy.com
              </a>
            </p>
          </div>
          <p className="text-muted-foreground mt-4 text-sm italic">
            تمت مراجعة سياسة الخصوصية هذه وتحديثها في ٤ يونيو ٢٠٢٦.
          </p>
        </div>
      ),
    },
  ]

  const tocItems = [
    { id: 'introduction', labelEn: '1. Introduction', labelAr: '١. مقدمة' },
    { id: 'information-we-collect', labelEn: '2. Information We Collect', labelAr: '٢. المعلومات التي نجمعها' },
    { id: 'pii-filtering', labelEn: '3. PII Filtering', labelAr: '٣. تصفية المعلومات الشخصية' },
    { id: 'how-we-use', labelEn: '4. How We Use Your Information', labelAr: '٤. كيف نستخدم معلوماتك' },
    { id: 'data-retention', labelEn: '6. Data Retention', labelAr: '٦. الاحتفاظ بالبيانات' },
    { id: 'data-sharing', labelEn: '7. Data Sharing & Disclosure', labelAr: '٧. مشاركة البيانات والإفصاح' },
    { id: 'data-security', labelEn: '8. Data Security', labelAr: '٨. أمان البيانات' },
    { id: 'your-rights', labelEn: '10. Your Rights', labelAr: '١٠. حقوقك' },
    { id: 'contact', labelEn: '15. Contact Us', labelAr: '١٥. تواصل معنا' },
  ]

  return (
    <>
      <SEO
        title={isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
        description={
          isAr
            ? 'سياسة خصوصية منصة عقدي — كيف نجمع معلوماتك ونحميها'
            : 'Aqdy Privacy Policy — how we collect, use, and protect your information'
        }
      />

      <div className="mx-auto max-w-4xl py-16 px-4" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Page Header */}
        <div className="mb-12 text-center">
          <div className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
            {isAr ? 'وثيقة قانونية' : 'Legal Document'}
          </div>
          <h1 className="text-foreground mb-4 text-4xl font-black tracking-tight md:text-5xl" id="privacy-policy-heading">
            {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
                href="#privacy-policy-heading"
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
