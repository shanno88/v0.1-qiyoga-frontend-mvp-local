// src/translations.ts
export type Lang = 'zh' | 'en';

type Keys =
  | 'hero_title'
  | 'hero_subtitle'
  | 'hero_cta_primary'
  | 'hero_cta_secondary'
  | 'feature1_title'
  | 'feature1_body'
  | 'feature2_title'
  | 'feature2_body'
  | 'feature3_title'
  | 'feature3_body'
  | 'feature4_title'
  | 'feature4_body'
  | 'steps_title'
  | 'step1'
  | 'step2'
  | 'step3';

type Dict = Record<Keys, string>;

export const zh: Dict = {
  hero_title: '美国租房怕被坑？让 AI 先帮你看合同',
  hero_subtitle:
    '专为中国留学生和家长设计，一键上传租约，3 分钟生成中英文风险报告，提前看清押金、解约、驱逐等关键条款。',
  hero_cta_primary: '立即上传我的租约',
  hero_cta_secondary: '先看看示例报告',

  feature1_title: '看不懂英文？关键条款给你翻成「人话」',
  feature1_body:
    'AI 提取押金、违约金、涨租、驱逐等重点条款，用简明中文解释，并附上英文原文，方便你和房东沟通。',
  feature2_title: '提前发现「坑条款」，避免事后吵架',
  feature2_body:
    '自动标记不合理或高风险条款，并给出谈判建议，让你在签字前心里有数。',
  feature3_title: '家长远程也能放心把关',
  feature3_body:
    '家长可以直接上传租约或查看孩子分享的报告，即使不在美国也能帮孩子一起判断要不要签。',
  feature4_title: '一次付费，多次安心',
  feature4_body:
    '支持按次报告，也支持在一个学年内多次检查新的租约或续约合同。',

  steps_title: '3 步完成租约体检',
  step1: '1. 上传租约 PDF 或图片',
  step2: '2. 等待约 3 分钟生成中英文报告',
  step3: '3. 按照建议和房东/中介沟通，再决定是否签约',
};

export const en: Dict = {
  hero_title: 'Worried about U.S. rental scams? Let AI review your lease first',
  hero_subtitle:
    'Built for Chinese students and parents. Upload your lease and get a bilingual risk report in 3 minutes, covering deposit, termination, eviction and more.',
  hero_cta_primary: 'Upload my lease',
  hero_cta_secondary: 'View sample report',

  feature1_title:
    'Don’t read legal English? We translate key clauses into plain language',
  feature1_body:
    'The AI extracts deposit, penalty, rent increase and eviction clauses, explains them in simple Chinese, and shows the original English so you can negotiate confidently.',
  feature2_title: 'Spot “gotcha” clauses before you sign',
  feature2_body:
    'Risky terms like “anytime entry”, “non‑refundable deposit” or high break fees are highlighted with practical negotiation tips.',
  feature3_title: 'Peace of mind for parents abroad',
  feature3_body:
    'Parents can upload the lease or view shared reports to help decide whether to sign, even from outside the U.S.',
  feature4_title: 'Pay once',
  feature4_body:
    'Choose a single review or a plan that covers multiple leases and renewals throughout the academic year.',

  steps_title: '3 steps to check your lease',
  step1: '1. Upload your lease as PDF or images',
  step2: '2. Wait ~3 minutes for your bilingual report',
  step3: '3. Use the recommendations to negotiate or decide whether to sign',
};
