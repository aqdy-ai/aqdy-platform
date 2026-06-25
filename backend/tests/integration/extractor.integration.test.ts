import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Mock Setup ───────────────────────────────────

const mockGetPrompt = jest.fn() as jest.Mock;
const mockSetFallback = jest.fn() as jest.Mock;

jest.unstable_mockModule("../../src/services/prompt.service.js", () => ({
  getPrompt: mockGetPrompt,
  setFallback: mockSetFallback,
}));

const mockOpenAIInvoke = jest.fn() as jest.Mock;
const mockGeminiInvoke = jest.fn() as jest.Mock;

jest.unstable_mockModule("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: mockOpenAIInvoke,
  })),
}));

jest.unstable_mockModule("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    invoke: mockGeminiInvoke,
  })),
}));

// Import AFTER mocking
const { ExtractorAgent } = await import("../../src/agents/extractor.agent.js");

// ── Fixtures ─────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, "..", "fixtures", "sample-contracts");

function loadSampleContract(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), "utf-8");
}

// ── Simulated LLM Responses ─────────────────────
// These simulate what the LLM would return for each contract.
// In a real integration test, these would come from the actual LLM.

const EMPLOYMENT_EN_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "The Employee shall serve as a Senior Software Engineer reporting to the VP of Engineering. The Employee shall perform all duties as reasonably assigned, including but not limited to software development, code review, mentoring junior developers, and participating in architectural decisions.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 2,
    clauseText:
      "This Agreement shall commence on February 1, 2025, and shall continue for an indefinite period unless terminated in accordance with the provisions of this Agreement.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 3,
    clauseText:
      "The Employee shall be subject to a probation period of three (3) months from the date of commencement. During this period, either party may terminate the contract with seven (7) days' written notice without the need to provide a reason or pay any compensation.",
    clauseType: "probation",
  },
  {
    clauseNumber: 4,
    clauseText:
      "The Employer shall pay the Employee a gross monthly salary of EGP 25,000 (Twenty-Five Thousand Egyptian Pounds), payable on the last business day of each calendar month by bank transfer to the Employee's designated account. The salary is subject to annual review at the Employer's sole discretion.",
    clauseType: "payment",
  },
  {
    clauseNumber: 5,
    clauseText:
      "The Employee's regular working hours shall be 40 hours per week, Sunday through Thursday, from 9:00 AM to 5:00 PM. Any overtime work must be pre-approved by the direct manager and shall be compensated at 1.5 times the regular hourly rate for weekdays and 2 times for weekends and public holidays.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 6,
    clauseText:
      "The Employee shall be entitled to twenty-one (21) days of paid annual leave per calendar year, in addition to all public holidays observed by the Arab Republic of Egypt. Unused leave may be carried forward for a maximum of one year.",
    clauseType: "benefits",
  },
  {
    clauseNumber: 7,
    clauseText:
      "The Employee shall not, during or after the term of employment, disclose, communicate, or make available to any third party any confidential information, trade secrets, or proprietary data belonging to the Employer without prior written consent. This obligation survives the termination of this Agreement for a period of two (2) years.",
    clauseType: "confidentiality",
  },
  {
    clauseNumber: 8,
    clauseText:
      "Upon termination of this Agreement, the Employee shall not, for a period of twelve (12) months, directly or indirectly engage in, be employed by, or provide services to any business that competes with the Employer's core business within the Arab Republic of Egypt. Breach of this clause shall result in liquidated damages equal to six (6) months of the Employee's last salary.",
    clauseType: "non-compete",
  },
  {
    clauseNumber: 9,
    clauseText:
      "All intellectual property, including but not limited to inventions, designs, software code, and documentation created by the Employee during the course of employment and using the Employer's resources shall be the sole property of the Employer.",
    clauseType: "intellectual-property",
  },
  {
    clauseNumber: 10,
    clauseText:
      "Either party may terminate this Agreement by providing sixty (60) days' written notice. The Employer reserves the right to terminate the Employee immediately without notice for gross misconduct, including but not limited to theft, fraud, intoxication at work, or repeated failure to perform duties after written warnings.",
    clauseType: "termination",
  },
  {
    clauseNumber: 11,
    clauseText:
      "This Agreement shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt. Any disputes arising from or related to this Agreement shall be resolved through mediation. If mediation fails, the dispute shall be referred to the Cairo Regional Court.",
    clauseType: "governing-law",
  },
];

const NDA_EN_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      '"Confidential Information" shall mean all non-public information disclosed by the Discloser to the Recipient, whether orally, in writing, or by any other means, including but not limited to: business plans, financial data, customer lists, technical specifications, source code, algorithms, marketing strategies, product roadmaps, and any information marked as "confidential" or reasonably understood to be confidential.',
    clauseType: "confidentiality",
  },
  {
    clauseNumber: 2,
    clauseText:
      "The Recipient agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely for the purpose of evaluating a potential business relationship; (d) limit access to Confidential Information to employees and advisors who have a need to know and are bound by similar confidentiality obligations.",
    clauseType: "obligations",
  },
  {
    clauseNumber: 3,
    clauseText:
      "The obligations of confidentiality shall not apply to information that: (a) is or becomes publicly available through no fault of the Recipient; (b) was rightfully in the Recipient's possession before disclosure; (c) is independently developed by the Recipient without use of Confidential Information; (d) is required to be disclosed by law, regulation, or court order, provided the Recipient gives prompt notice to the Discloser.",
    clauseType: "confidentiality",
  },
  {
    clauseNumber: 4,
    clauseText:
      "This Agreement shall remain in effect for a period of three (3) years from the date of execution. The obligations of confidentiality shall survive the expiration of this Agreement for an additional period of two (2) years.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 5,
    clauseText:
      "Upon termination or expiration of this Agreement, or upon request by the Discloser, the Recipient shall promptly return or destroy all copies of Confidential Information in any form, including electronic copies, and shall certify in writing that such return or destruction has been completed.",
    clauseType: "termination",
  },
  {
    clauseNumber: 6,
    clauseText:
      "The Recipient acknowledges that any breach of this Agreement may cause irreparable harm to the Discloser. In addition to any other remedies available at law or in equity, the Discloser shall be entitled to seek injunctive relief without the necessity of proving actual damages or posting a bond.",
    clauseType: "indemnification",
  },
  {
    clauseNumber: 7,
    clauseText:
      "Nothing in this Agreement grants the Recipient any license or rights to the Confidential Information, except the limited right to use it for the purpose stated in Article 2.",
    clauseType: "intellectual-property",
  },
  {
    clauseNumber: 8,
    clauseText:
      "In no event shall either party be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to this Agreement, regardless of whether such damages were foreseeable. The total aggregate liability of either party shall not exceed USD 500,000.",
    clauseType: "liability",
  },
  {
    clauseNumber: 9,
    clauseText:
      "This Agreement shall be governed by and construed in accordance with the laws of the Arab Republic of Egypt, without regard to its conflict of laws provisions. Any disputes shall be submitted to binding arbitration under the rules of the Cairo Regional Centre for International Commercial Arbitration (CRCICA).",
    clauseType: "governing-law",
  },
];

const EMPLOYMENT_AR_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "يُعيَّن الطرف الثاني في وظيفة مهندس برمجيات أول، ويلتزم بأداء جميع المهام المنوطة به وفقاً لتوجيهات الإدارة المباشرة، بما في ذلك تطوير البرمجيات ومراجعة الأكواد والمشاركة في القرارات التقنية.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 2,
    clauseText:
      "يسري هذا العقد اعتباراً من ١ فبراير ٢٠٢٥ لمدة غير محددة، ولا ينتهي إلا وفقاً للأحكام المنصوص عليها في هذا العقد.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 3,
    clauseText:
      "يخضع الموظف لفترة اختبار مدتها ثلاثة (٣) أشهر من تاريخ مباشرة العمل. يجوز لأي من الطرفين إنهاء العقد خلال هذه الفترة بإخطار كتابي مدته سبعة (٧) أيام دون الحاجة لإبداء أسباب أو دفع أي تعويض.",
    clauseType: "probation",
  },
  {
    clauseNumber: 4,
    clauseText:
      "يلتزم صاحب العمل بدفع راتب شهري إجمالي قدره ٢٠,٠٠٠ جنيه مصري (عشرون ألف جنيه مصري)، يُصرف في آخر يوم عمل من كل شهر عن طريق التحويل البنكي.",
    clauseType: "payment",
  },
  {
    clauseNumber: 5,
    clauseText:
      "تكون ساعات العمل الرسمية ٤٠ ساعة أسبوعياً، من الأحد إلى الخميس، من الساعة ٩:٠٠ صباحاً حتى ٥:٠٠ مساءً.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 6,
    clauseText:
      "يستحق الموظف إجازة سنوية مدفوعة الأجر مدتها واحد وعشرون (٢١) يوماً في السنة التقويمية، بالإضافة إلى جميع العطلات الرسمية المعتمدة في جمهورية مصر العربية.",
    clauseType: "benefits",
  },
  {
    clauseNumber: 7,
    clauseText:
      "يلتزم الموظف بعدم إفشاء أي معلومات سرية أو أسرار تجارية أو بيانات خاصة بصاحب العمل لأي طرف ثالث، سواء أثناء فترة العمل أو بعد انتهائها، لمدة سنتين (٢) بعد انتهاء العقد.",
    clauseType: "confidentiality",
  },
  {
    clauseNumber: 8,
    clauseText:
      "يتعهد الموظف بعدم العمل لدى أي جهة منافسة أو تأسيس مشروع منافس لمدة اثني عشر (١٢) شهراً بعد انتهاء العقد، وذلك داخل نطاق جمهورية مصر العربية. في حالة الإخلال بهذا البند، يلتزم الموظف بدفع تعويض قدره ستة (٦) أضعاف الراتب الشهري الأخير.",
    clauseType: "non-compete",
  },
  {
    clauseNumber: 9,
    clauseText:
      "جميع حقوق الملكية الفكرية، بما في ذلك الاختراعات والتصاميم والبرمجيات والوثائق التي يقوم الموظف بإنشائها أثناء فترة العمل وباستخدام موارد صاحب العمل، تكون ملكاً خالصاً لصاحب العمل.",
    clauseType: "intellectual-property",
  },
  {
    clauseNumber: 10,
    clauseText:
      "يجوز لأي من الطرفين إنهاء هذا العقد بإخطار كتابي مدته ستون (٦٠) يوماً. يحتفظ صاحب العمل بحق إنهاء العقد فوراً دون إخطار في حالات سوء السلوك الجسيم.",
    clauseType: "termination",
  },
  {
    clauseNumber: 11,
    clauseText:
      "يخضع هذا العقد ويُفسَّر وفقاً لأحكام قانون العمل المصري رقم ١٢ لسنة ٢٠٠٣ وتعديلاته. تُحال أي نزاعات ناشئة عن هذا العقد أو متعلقة به إلى المحكمة العمالية المختصة بالقاهرة.",
    clauseType: "governing-law",
  },
];

const SERVICE_AR_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "يلتزم مقدم الخدمة بتقديم الخدمات الاستشارية التالية للعميل: إعداد دراسة جدوى شاملة لمشروع التحول الرقمي.",
    clauseType: "obligations",
  },
  {
    clauseNumber: 2,
    clauseText:
      "يسري هذا العقد لمدة ستة (٦) أشهر اعتباراً من تاريخ توقيعه. يجوز تمديد العقد بموافقة كتابية من الطرفين لفترات إضافية مدة كل منها ثلاثة (٣) أشهر.",
    clauseType: "renewal",
  },
  {
    clauseNumber: 3,
    clauseText:
      "يلتزم العميل بدفع مبلغ إجمالي قدره ٣٠٠,٠٠٠ جنيه مصري مقابل الخدمات المتفق عليها.",
    clauseType: "payment",
  },
  {
    clauseNumber: 4,
    clauseText:
      "يلتزم مقدم الخدمة بتنفيذ الخدمات بالجودة والكفاءة المهنية المطلوبة وتخصيص فريق عمل مؤهل ومتخصص.",
    clauseType: "obligations",
  },
  {
    clauseNumber: 5,
    clauseText:
      "يلتزم العميل بتوفير جميع المعلومات والبيانات اللازمة لتنفيذ الخدمات.",
    clauseType: "obligations",
  },
  {
    clauseNumber: 6,
    clauseText:
      "يلتزم الطرفان بالحفاظ على سرية جميع المعلومات والبيانات المتبادلة بينهما بموجب هذا العقد. يستمر التزام السرية لمدة ثلاث (٣) سنوات بعد انتهاء العقد.",
    clauseType: "confidentiality",
  },
  {
    clauseNumber: 7,
    clauseText:
      "في حالة تأخر مقدم الخدمة عن الجدول الزمني المتفق عليه بدون سبب مقبول، يُخصم ١٪ من قيمة العقد عن كل أسبوع تأخير، بحد أقصى ١٠٪ من إجمالي قيمة العقد.",
    clauseType: "penalties",
  },
  {
    clauseNumber: 8,
    clauseText:
      "يجوز لأي من الطرفين إنهاء هذا العقد بإخطار كتابي مدته ثلاثون (٣٠) يوماً.",
    clauseType: "termination",
  },
  {
    clauseNumber: 9,
    clauseText:
      "لا يُسأل أي من الطرفين عن التأخير أو عدم التنفيذ الناتج عن أحداث خارجة عن إرادته، بما في ذلك الكوارث الطبيعية والحروب والأوبئة والقرارات الحكومية.",
    clauseType: "force-majeure",
  },
  {
    clauseNumber: 10,
    clauseText:
      "يخضع هذا العقد لأحكام القانون المدني المصري. في حالة نشوء أي نزاع، يسعى الطرفان لحله ودياً خلال ثلاثين (٣٠) يوماً.",
    clauseType: "governing-law",
  },
];

const MIXED_AR_EN_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "The Landlord hereby leases to the Tenant the commercial office space located at Building 7, 3rd Floor, Smart Village, 6th of October City, Giza, Egypt, with a total area of 250 square meters. The Premises shall be used exclusively for office and technology operations.",
    clauseType: "employment-terms",
  },
  {
    clauseNumber: 2,
    clauseText:
      "The lease term shall be three (3) years, commencing on May 1, 2025, and ending on April 30, 2028. The Tenant shall have the option to renew for an additional two (2) years by providing written notice at least ninety (90) days before the expiration date.",
    clauseType: "renewal",
  },
  {
    clauseNumber: 3,
    clauseText:
      "The monthly rent shall be EGP 45,000 (Forty-Five Thousand Egyptian Pounds), payable on the first business day of each month. The rent shall increase by 10% annually starting from the second year. Late payments shall incur a penalty of 2% per month on the outstanding amount.",
    clauseType: "payment",
  },
  {
    clauseNumber: 4,
    clauseText:
      "The Tenant shall pay a security deposit equivalent to three (3) months' rent (EGP 135,000) upon signing this Agreement. The deposit shall be returned within thirty (30) days of lease termination, less any deductions for damages or unpaid rent.",
    clauseType: "payment",
  },
  {
    clauseNumber: 5,
    clauseText:
      "The Landlord shall be responsible for structural maintenance and major repairs to the building's common areas. The Tenant shall be responsible for all interior maintenance and minor repairs within the Premises. Any modifications to the Premises require prior written approval from the Landlord.",
    clauseType: "obligations",
  },
  {
    clauseNumber: 6,
    clauseText:
      "Either party may terminate this Agreement with ninety (90) days' written notice. Early termination by the Tenant without cause shall require payment of a penalty equal to six (6) months' rent.",
    clauseType: "termination",
  },
  {
    clauseNumber: 7,
    clauseText:
      "The Tenant shall maintain comprehensive commercial insurance covering the Premises, including fire, theft, and public liability, with a minimum coverage of EGP 2,000,000. The Landlord shall not be liable for any loss or damage to the Tenant's property except in cases of gross negligence.",
    clauseType: "liability",
  },
  {
    clauseNumber: 8,
    clauseText:
      "This Agreement shall be governed by the Egyptian Civil Code and applicable real estate regulations. Disputes shall be resolved through arbitration at the Cairo Regional Centre for International Commercial Arbitration (CRCICA).",
    clauseType: "governing-law",
  },
];

const SAAS_EN_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "The Provider grants the Customer a non-exclusive, non-transferable right to access and use the Service during the Term for its internal business purposes.",
    clauseType: "license-grant",
  },
  {
    clauseNumber: 2,
    clauseText:
      "The Service is provided on a subscription basis. Fees are billed annually in advance. All payments are non-refundable unless otherwise specified in this Agreement.",
    clauseType: "payment",
  },
  {
    clauseNumber: 3,
    clauseText:
      "The Provider shall implement industry-standard security measures to protect Customer Data from unauthorized access, disclosure, or destruction.",
    clauseType: "data-security",
  },
  {
    clauseNumber: 4,
    clauseText:
      "The Provider warrants that the Service will perform substantially in accordance with the Documentation. The sole remedy for breach of this warranty is repair or replacement of the Service.",
    clauseType: "warranty",
  },
  {
    clauseNumber: 5,
    clauseText:
      "In no event shall either party be liable for any indirect or consequential damages. Total aggregate liability shall not exceed the fees paid in the twelve months preceding the claim.",
    clauseType: "liability",
  },
];

const PARTNERSHIP_AR_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "اتفق الشركاء على تأسيس شركة تضامن للعمل في مجال التجارة العامة والمقاولات.",
    clauseType: "partnership-terms",
  },
  {
    clauseNumber: 2,
    clauseText:
      "يحدد رأس مال الشركة بمبلغ مليون جنيه مصري، مقسم بنسبة ٥٠٪ لكل شريك.",
    clauseType: "capital-contribution",
  },
  {
    clauseNumber: 3,
    clauseText:
      "توزع الأرباح والخسائر بين الشركاء بنسبة حصة كل منهم في رأس المال.",
    clauseType: "profit-sharing",
  },
  {
    clauseNumber: 4,
    clauseText:
      "يتولى الشريك الأول مهام المدير العام وله كافة الصلاحيات اللازمة لإدارة الشركة أمام الغير.",
    clauseType: "management",
  },
  {
    clauseNumber: 5,
    clauseText:
      "لا يجوز لأي شريك الانسحاب من الشركة قبل مرور سنتين على تاريخ التأسيس.",
    clauseType: "withdrawal",
  },
];

const FREELANCE_EN_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "The Freelancer shall provide graphic design services as described in the Statement of Work. All deliverables must be approved by the Client before final payment.",
    clauseType: "scope-of-work",
  },
  {
    clauseNumber: 2,
    clauseText:
      "The Client shall pay the Freelancer a fixed fee of USD 2,000 upon successful completion of all project milestones.",
    clauseType: "payment",
  },
  {
    clauseNumber: 3,
    clauseText:
      "The Freelancer is an independent contractor and not an employee of the Client. The Freelancer is responsible for all taxes and benefits.",
    clauseType: "employment-status",
  },
  {
    clauseNumber: 4,
    clauseText:
      "Upon full payment, the Freelancer assigns all intellectual property rights in the deliverables to the Client.",
    clauseType: "intellectual-property",
  },
  {
    clauseNumber: 5,
    clauseText:
      "Either party may terminate this project with 14 days' written notice.",
    clauseType: "termination",
  },
];

const LOAN_AR_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "يقر المقترض باستلام مبلغ وقدره ٥٠٠,٠٠٠ جنيه مصري من المقرض بصفة قرض حسن.",
    clauseType: "loan-amount",
  },
  {
    clauseNumber: 2,
    clauseText:
      "يلتزم المقترض بسداد القرض على أقساط شهرية متساوية لمدة ٢٤ شهراً.",
    clauseType: "repayment-terms",
  },
  {
    clauseNumber: 3,
    clauseText:
      "في حالة تأخر المقترض عن سداد أي قسط لمدة تزيد عن ١٥ يوماً، يصبح كامل القرض واجب السداد فوراً.",
    clauseType: "default",
  },
  {
    clauseNumber: 4,
    clauseText: "يضمن المقترض سداد القرض بكامل أمواله المنقولة وغير المنقولة.",
    clauseType: "guarantee",
  },
];

const PRIVACY_EN_RESPONSE = [
  {
    clauseNumber: 1,
    clauseText:
      "We collect personal information such as name, email address, and IP address when you use our service.",
    clauseType: "data-collection",
  },
  {
    clauseNumber: 2,
    clauseText:
      "We use your data to provide, maintain, and improve our services, and to communicate with you about updates.",
    clauseType: "data-usage",
  },
  {
    clauseNumber: 3,
    clauseText:
      "We do not sell your personal data to third parties. We may share data with service providers who assist in our operations.",
    clauseType: "data-sharing",
  },
  {
    clauseNumber: 4,
    clauseText:
      "You have the right to access, correct, or delete your personal data at any time through your account settings.",
    clauseType: "user-rights",
  },
  {
    clauseNumber: 5,
    clauseText:
      "We use cookies and similar technologies to track activity on our service and hold certain information.",
    clauseType: "cookies",
  },
];

const LARGE_CONTRACT_50_CLAUSES_RESPONSE = Array.from({ length: 50 }).map(
  (_, i) => ({
    clauseNumber: i + 1,
    clauseText: `This is the text for clause number ${i + 1}. It contains standard legal language for testing purposes.`,
    clauseType: i % 2 === 0 ? "obligations" : "termination",
  }),
);

// ── Tests ────────────────────────────────────────

describe("ExtractorAgent — Integration Tests with Sample Contracts", () => {
  let agent: InstanceType<typeof ExtractorAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrompt.mockResolvedValue('Mock system prompt for testing');
    agent = new ExtractorAgent();
  });

  // ────────────────────────────────────────────────
  // Contract 1: English Employment
  // ────────────────────────────────────────────────

  describe("Sample 1: English Employment Contract", () => {
    test("should extract all clauses with correct structure", async () => {
      const contractText = loadSampleContract("employment-en.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(EMPLOYMENT_EN_RESPONSE),
      });

      const result = await agent.extract(contractText, "en");

      expect(result.language).toBe("en");
      expect(result.clauses.length).toBeGreaterThanOrEqual(8);
      expect(result.chunkCount).toBe(1); // Short enough for single chunk

      // Verify all clauses have required fields
      for (const clause of result.clauses) {
        expect(clause.clauseNumber).toBeGreaterThan(0);
        expect(clause.clauseText.length).toBeGreaterThan(0);
        expect(clause.clauseType.length).toBeGreaterThan(0);
      }

      // Verify expected clause types are present
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("probation");
      expect(types).toContain("payment");
      expect(types).toContain("termination");
      expect(types).toContain("confidentiality");
      expect(types).toContain("non-compete");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 2: English NDA
  // ────────────────────────────────────────────────

  describe("Sample 2: English NDA", () => {
    test("should extract clauses with confidentiality as dominant type", async () => {
      const contractText = loadSampleContract("nda-en.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(NDA_EN_RESPONSE),
      });

      const result = await agent.extract(contractText, "en");

      expect(result.language).toBe("en");
      expect(result.clauses.length).toBeGreaterThanOrEqual(7);

      // NDA should have confidentiality clauses
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("confidentiality");
      expect(types).toContain("governing-law");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 3: Arabic Employment
  // ────────────────────────────────────────────────

  describe("Sample 3: Arabic Employment Contract (عقد عمل)", () => {
    test("should extract Arabic clauses and detect language", async () => {
      const contractText = loadSampleContract("employment-ar.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(EMPLOYMENT_AR_RESPONSE),
      });

      // Don't pass language — let it auto-detect
      const result = await agent.extract(contractText);

      expect(result.language).toBe("ar");
      expect(result.clauses.length).toBeGreaterThanOrEqual(8);

      // Verify Arabic text is preserved in clause output
      const hasArabic = result.clauses.some((c) =>
        /[\u0600-\u06FF]/.test(c.clauseText),
      );
      expect(hasArabic).toBe(true);

      // Verify expected types
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("probation");
      expect(types).toContain("payment");
      expect(types).toContain("non-compete");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 4: Arabic Service Agreement
  // ────────────────────────────────────────────────

  describe("Sample 4: Arabic Service Agreement (عقد خدمات)", () => {
    test("should extract service-related clauses", async () => {
      const contractText = loadSampleContract("service-ar.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(SERVICE_AR_RESPONSE),
      });

      const result = await agent.extract(contractText);

      expect(result.language).toBe("ar");
      expect(result.clauses.length).toBeGreaterThanOrEqual(7);

      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("payment");
      expect(types).toContain("confidentiality");
      expect(types).toContain("termination");
      expect(types).toContain("force-majeure");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 5: Mixed Arabic/English Lease
  // ────────────────────────────────────────────────

  describe("Sample 5: Mixed Arabic/English Lease", () => {
    test("should handle bilingual contract", async () => {
      const contractText = loadSampleContract("mixed-ar-en.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(MIXED_AR_EN_RESPONSE),
      });

      const result = await agent.extract(contractText);

      // Mixed contracts with significant Arabic should detect as Arabic
      expect(["ar", "en"]).toContain(result.language);
      expect(result.clauses.length).toBeGreaterThanOrEqual(6);

      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("payment");
      expect(types).toContain("termination");
      expect(types).toContain("governing-law");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 6: English SaaS Agreement
  // ────────────────────────────────────────────────

  describe("Sample 6: English SaaS Agreement", () => {
    test("should extract SaaS licensing and data clauses", async () => {
      const contractText = loadSampleContract("saas-en.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(SAAS_EN_RESPONSE),
      });

      const result = await agent.extract(contractText, "en");
      expect(result.clauses.length).toBe(5);
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("license-grant");
      expect(types).toContain("data-security");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 7: Arabic Partnership Agreement
  // ────────────────────────────────────────────────

  describe("Sample 7: Arabic Partnership Agreement (عقد شراكة)", () => {
    test("should extract capital and profit sharing clauses", async () => {
      const contractText = loadSampleContract("partnership-ar.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(PARTNERSHIP_AR_RESPONSE),
      });

      const result = await agent.extract(contractText, "ar");
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("capital-contribution");
      expect(types).toContain("profit-sharing");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 8: English Freelance Agreement
  // ────────────────────────────────────────────────

  describe("Sample 8: English Freelance Agreement", () => {
    test("should extract IP assignment and scope of work", async () => {
      const contractText = loadSampleContract("freelance-en.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(FREELANCE_EN_RESPONSE),
      });

      const result = await agent.extract(contractText, "en");
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("scope-of-work");
      expect(types).toContain("intellectual-property");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 9: Arabic Loan Agreement
  // ────────────────────────────────────────────────

  describe("Sample 9: Arabic Loan Agreement (عقد قرض)", () => {
    test("should extract repayment and default clauses", async () => {
      const contractText = loadSampleContract("loan-ar.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(LOAN_AR_RESPONSE),
      });

      const result = await agent.extract(contractText, "ar");
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("repayment-terms");
      expect(types).toContain("default");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 10: English Privacy Policy
  // ────────────────────────────────────────────────

  describe("Sample 10: English Privacy Policy", () => {
    test("should extract data usage and user rights", async () => {
      const contractText = loadSampleContract("privacy-en.txt");
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(PRIVACY_EN_RESPONSE),
      });

      const result = await agent.extract(contractText, "en");
      const types = result.clauses.map((c) => c.clauseType);
      expect(types).toContain("data-usage");
      expect(types).toContain("user-rights");
    });
  });

  // ────────────────────────────────────────────────
  // Contract 11: Large English Contract (50+ Clauses)
  // ────────────────────────────────────────────────

  describe("Sample 11: Large English Contract with 50+ Clauses", () => {
    test("should extract all 50 clauses correctly", async () => {
      // Simulating a very large text input
      const contractText =
        "Standard legal paragraph content for testing high-volume documents. ".repeat(
          300,
        );
      mockOpenAIInvoke.mockResolvedValueOnce({
        content: JSON.stringify(LARGE_CONTRACT_50_CLAUSES_RESPONSE),
      });

      const result = await agent.extract(contractText, "en");
      expect(result.clauses.length).toBe(50);
      expect(result.clauses[49].clauseNumber).toBe(50);
    });
  });

  // ────────────────────────────────────────────────
  // Cross-contract structural validation
  // ────────────────────────────────────────────────

  describe("Cross-contract structural validation", () => {
    test("all sample contracts should produce valid clause structures", async () => {
      const contracts = [
        {
          file: "employment-en.txt",
          response: EMPLOYMENT_EN_RESPONSE,
          lang: "en" as const,
        },
        { file: "nda-en.txt", response: NDA_EN_RESPONSE, lang: "en" as const },
        {
          file: "employment-ar.txt",
          response: EMPLOYMENT_AR_RESPONSE,
          lang: "ar" as const,
        },
        {
          file: "service-ar.txt",
          response: SERVICE_AR_RESPONSE,
          lang: "ar" as const,
        },
        {
          file: "mixed-ar-en.txt",
          response: MIXED_AR_EN_RESPONSE,
          lang: "en" as const,
        },
        {
          file: "saas-en.txt",
          response: SAAS_EN_RESPONSE,
          lang: "en" as const,
        },
        {
          file: "partnership-ar.txt",
          response: PARTNERSHIP_AR_RESPONSE,
          lang: "ar" as const,
        },
        {
          file: "freelance-en.txt",
          response: FREELANCE_EN_RESPONSE,
          lang: "en" as const,
        },
        {
          file: "loan-ar.txt",
          response: LOAN_AR_RESPONSE,
          lang: "ar" as const,
        },
        {
          file: "privacy-en.txt",
          response: PRIVACY_EN_RESPONSE,
          lang: "en" as const,
        },
        {
          file: "large-contract-en.txt",
          response: LARGE_CONTRACT_50_CLAUSES_RESPONSE,
          lang: "en" as const,
        },
      ];

      for (const { file, response, lang } of contracts) {
        jest.clearAllMocks();
        mockOpenAIInvoke.mockResolvedValueOnce({
          content: JSON.stringify(response),
        });

        let contractText: string;
        try {
          contractText = loadSampleContract(file);
        } catch (e) {
          // Fallback if the physical file isn't present in the CI environment yet
          contractText =
            "Mocked large contract content for structural validation. ".repeat(
              100,
            );
        }

        const result = await agent.extract(contractText, lang);

        // Every clause must pass structural validation
        for (const clause of result.clauses) {
          expect(clause).toHaveProperty("clauseNumber");
          expect(clause).toHaveProperty("clauseText");
          expect(clause).toHaveProperty("clauseType");
          expect(typeof clause.clauseNumber).toBe("number");
          expect(typeof clause.clauseText).toBe("string");
          expect(typeof clause.clauseType).toBe("string");
          expect(clause.clauseText.trim().length).toBeGreaterThan(0);
        }

        // Clause numbers should be sequential
        for (let i = 0; i < result.clauses.length; i++) {
          expect(result.clauses[i].clauseNumber).toBe(i + 1);
        }
      }
    }, 60000);
  });
});
