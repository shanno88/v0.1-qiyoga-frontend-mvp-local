
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Mail,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Printer,
  AlertTriangle,
  DollarSign,
  Calendar,
  Home as HomeIcon,
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Info
} from 'lucide-react';
import { apiPost, API_ENDPOINTS } from '../src/config/api';
import { PRICE_ID } from '../src/config/paddle';
import { zh, Lang } from '../src/translations';
import '../src/print.css';
import { callApiWithTiming, logTiming, TimingResult } from '../src/utils/timing';

// ====== HELPER FUNCTIONS FOR CONTENT ANALYSIS ======

const BOILERPLATE_PATTERNS = [
  /this clause has been analyzed/i,
  /this provision has been reviewed/i,
  /clause analyzed for potential/i,
  /please review this clause carefully/i,
  /签署前请仔细阅读/i,
  /请仔细阅读/i,
  /standard clause/i,
];

const isBoilerplateText = (text: string): boolean => {
  if (!text || text.length < 20) return true;
  return BOILERPLATE_PATTERNS.some(pattern => pattern.test(text));
};

const getRiskLevel = (clause: any): 'safe' | 'caution' | 'danger' | 'unknown' => {
  const level = (clause.risk_level || '').toLowerCase();
  if (level === 'safe' || level === 'low') return 'safe';
  if (level === 'caution' || level === 'medium' || level === 'moderate') return 'caution';
  if (level === 'danger' || level === 'high' || level === 'high risk') return 'danger';
  return 'unknown';
};

const isTrulyHighRisk = (clause: any): boolean => {
  const text = (clause.clause_text || clause.original_clause || '').toLowerCase();
  const analysis = (clause.analysis_zh || clause.analysis_en || '').toLowerCase();
  
  const HIGH_RISK_KEYWORDS = [
    'terminate', 'termination', 'evict', 'eviction',
    'penalty', 'forfeit', 'liable', 'liability',
    'deposit', 'security deposit', 'non-refundable',
    'automatic renewal', 'auto-renew', 'lease break',
    'legal fees', 'attorney fees', 'court costs',
    'default', 'breach', 'damages',
    'assign', 'sublet', 'guest',
    'late fee', 'interest', 'penalty fee',
    '提前解约', '违约金', '押金不退', '自动续约',
    '滞纳金', '罚款', '赔偿', '驱逐',
  ];
  
  const hasRiskKeyword = HIGH_RISK_KEYWORDS.some(kw => 
    text.includes(kw) || analysis.includes(kw)
  );
  
  const riskLevel = getRiskLevel(clause);
  return (riskLevel === 'danger') || (riskLevel === 'caution' && hasRiskKeyword);
};

const cleanAnalysisText = (text: string): string | null => {
  if (!text || isBoilerplateText(text)) return null;
  return text.trim();
};

const getRiskIcon = (level: 'safe' | 'caution' | 'danger' | 'unknown') => {
  switch (level) {
    case 'safe': return <ShieldCheck className="h-4 w-4" />;
    case 'caution': return <AlertTriangle className="h-4 w-4" />;
    case 'danger': return <ShieldAlert className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
  }
};

const getRiskColors = (level: 'safe' | 'caution' | 'danger' | 'unknown') => {
  switch (level) {
    case 'safe': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' };
    case 'caution': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' };
    case 'danger': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' };
    default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' };
  }
};

const getRiskLabel = (level: 'safe' | 'caution' | 'danger' | 'unknown') => {
  switch (level) {
    case 'safe': return { en: 'Safe', zh: '安全' };
    case 'caution': return { en: 'Caution', zh: '注意' };
    case 'danger': return { en: 'High Risk', zh: '高风险' };
    default: return { en: 'Info', zh: '信息' };
  }
};

const getOverallRiskStyles = (risk: string) => {
  switch (risk) {
    case 'low':
      return {
        container: 'bg-emerald-50 border border-emerald-200',
        badge: 'bg-emerald-500 text-white',
        label: '✓ Low Risk / 低风险',
      };
    case 'medium':
      return {
        container: 'bg-amber-50 border border-amber-200',
        badge: 'bg-amber-500 text-white',
        label: '⚠ Medium Risk / 中等风险',
      };
    default:
      return {
        container: 'bg-rose-50 border border-rose-200',
        badge: 'bg-rose-500 text-white',
        label: '⛔ High Risk / 高风险',
      };
  }
};

const OverallRiskBadge: React.FC<{ overallRisk: string }> = ({ overallRisk }) => {
  const styles = getOverallRiskStyles(overallRisk);
  return (
    <div className={`mb-6 p-4 rounded-xl ${styles.container}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700">Overall Risk / 总体风险</span>
        <span className={`px-4 py-2 rounded-full font-bold text-sm ${styles.badge}`}>
          {styles.label}
        </span>
      </div>
    </div>
  );
};

const SummaryGridItem: React.FC<{
  label: string;
  value: string | number | null | undefined;
  subtext?: string;
}> = ({ label, value, subtext }) => (
  <div className="bg-slate-50 p-4 rounded-xl text-center">
    <p className="text-xs text-slate-500 font-semibold uppercase mb-1">{label}</p>
    <p className="text-xl font-bold text-slate-900">{value || 'N/A'}</p>
    {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
  </div>
);

const PartyInfoRow: React.FC<{ summary: any }> = ({ summary }) => (
  <div className="grid grid-cols-2 gap-4 mb-6">
    <div className="p-3 bg-slate-50 rounded-lg">
      <p className="text-xs text-slate-500 font-semibold uppercase">Landlord / 房东</p>
      <p className="font-semibold text-slate-800">{summary.landlord_name || 'N/A'}</p>
    </div>
    <div className="p-3 bg-slate-50 rounded-lg">
      <p className="text-xs text-slate-500 font-semibold uppercase">Tenant / 租客</p>
      <p className="font-semibold text-slate-800">{summary.tenant_name || 'N/A'}</p>
    </div>
  </div>
);

const LeaseTermRow: React.FC<{ summary: any }> = ({ summary }) => {
  if (!summary.lease_start_date && !summary.lease_end_date) return null;
  return (
    <div className="bg-indigo-50 p-4 rounded-xl mb-6 border border-indigo-100">
      <p className="text-sm font-semibold text-indigo-800 mb-1">📅 Lease Term / 租期</p>
      <p className="text-base text-slate-700">
        {summary.lease_start_date} to {summary.lease_end_date}
        {summary.lease_duration_months && ` (${summary.lease_duration_months} months)`}
      </p>
    </div>
  );
};

const RiskSummaryBlock: React.FC<{
  type: 'late_fee' | 'early_termination';
  content: string;
}> = ({ type, content }) => {
  if (!content) return null;
  const config = {
    late_fee: {
      bg: 'bg-amber-50',
      border: 'border-l-4 border-amber-400',
      icon: '💰',
      title: '滞纳金条款',
      titleClass: 'text-amber-700',
    },
    early_termination: {
      bg: 'bg-rose-50',
      border: 'border-l-4 border-rose-400',
      icon: '🚪',
      title: '提前解约风险',
      titleClass: 'text-rose-700',
    },
  };
  const { bg, border, icon, title, titleClass } = config[type];
  return (
    <div className={`${bg} p-4 rounded-xl mb-3 ${border}`}>
      <p className={`text-xs font-bold ${titleClass} uppercase mb-1`}>{icon} {title}</p>
      <p className="text-sm text-slate-700">{content}</p>
    </div>
  );
};

const LeaseSummaryCard: React.FC<{ summary: any; lang: Lang }> = ({ summary, lang }) => {
  const renderFinancialValue = (amount: number | string | null | undefined, prefix = '$') =>
    amount ? `${prefix}${amount}` : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>📋</span>
          合同概要 / Lease Summary
        </h3>
        <p className="text-indigo-100 text-sm mt-1">
          {lang === 'zh'
            ? '帮你在几秒内看懂这份租约的价格、期限和核心风险点。'
            : 'Helps you understand the price, term, and core risk points of this lease in a few seconds.'}
        </p>
      </div>
      <div className="p-6">
        <OverallRiskBadge overallRisk={summary.overall_risk} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryGridItem
            label="Monthly Rent"
            value={renderFinancialValue(summary.monthly_rent_amount)}
            subtext={`${summary.currency || 'USD'}/mo`}
          />
          <SummaryGridItem
            label="Security Deposit"
            value={renderFinancialValue(summary.security_deposit_amount)}
          />
          <SummaryGridItem
            label="Duration"
            value={summary.lease_duration_months ? `${summary.lease_duration_months} mo` : null}
          />
          <SummaryGridItem
            label="Start Date"
            value={summary.lease_start_date}
          />
        </div>

        <LeaseTermRow summary={summary} />
        <PartyInfoRow summary={summary} />

        <RiskSummaryBlock
          type="late_fee"
          content={summary.late_fee_summary_zh}
        />
        <RiskSummaryBlock
          type="early_termination"
          content={summary.early_termination_risk_zh}
        />
      </div>
    </div>
  );
};

const hasEmptyAnalysis = (clause: any): boolean => {
  const analysis = clause.analysis_zh || clause.analysis_en || '';
  const suggestion = clause.suggestion_zh || clause.suggestion_en || '';
  return (!analysis || analysis.trim().length < 10) && (!suggestion || suggestion.trim().length < 10);
};

const HighRiskClauseItem: React.FC<{
  clause: any;
  index: number;
}> = ({ clause, index }) => {
  const riskLevel = (clause.risk_level || "").toLowerCase();
  const isDanger = riskLevel === "danger" || riskLevel === "high";
  
  const containerStyles = isDanger
    ? 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-300'
    : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300';
  
  const badgeStyles = isDanger
    ? 'bg-rose-500 text-white'
    : 'bg-amber-500 text-white';
  
  const suggestionStyles = isDanger
    ? 'bg-rose-100 border-rose-400'
    : 'bg-amber-100 border-amber-400';

  const cleanAnalysis = stripBoilerplate(clause.analysis_zh);
  const rawSuggestion = stripBoilerplate(clause.suggestion_zh);
  const cleanSuggestion = enhancePaymentMethodSuggestion(rawSuggestion, clause.clause_text || '');

  return (
    <div
      key={clause.clause_number || index}
      className={`p-5 rounded-xl border-2 ${containerStyles}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeStyles}`}>
            {isDanger ? '⛔ High Risk' : '⚠ Caution'}
          </span>
          <span className="text-sm text-slate-500">Clause {clause.clause_number || index + 1}</span>
          <span className="text-xs text-slate-400 italic">
            {getTenantImpactLabel(clause).en} / {getTenantImpactLabel(clause).zh}
          </span>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-800 mb-3 line-clamp-2">
        {clause.clause_text}
      </p>
      {cleanAnalysis && (
        <div className="bg-white/60 p-3 rounded-lg mb-2 border-l-3 border-slate-300">
          <span className="text-xs font-bold text-slate-600">分析：</span>
          <span className="text-sm text-slate-700 ml-1">{cleanAnalysis}</span>
        </div>
      )}
      {cleanSuggestion && (
        <div className={`p-3 rounded-lg border-l-4 ${suggestionStyles}`}>
          <span className="text-xs font-bold text-slate-600">💡 建议：</span>
          <span className="text-sm text-slate-700 ml-1">{cleanSuggestion}</span>
        </div>
      )}
    </div>
  );
};

const HighRiskClausesSection: React.FC<{
  clauses: any[];
  lang: Lang;
}> = ({ clauses, lang }) => {
  if (!clauses || clauses.length === 0) return null;
  
  const topRiskClauses = getTopRiskClauses(clauses);
  
  if (topRiskClauses.length === 0) return null;
  
  return (
    <section className="mt-6">
      <div className="mb-6 no-print">
        <h3 className="text-2xl font-black text-rose-600 flex items-center gap-3">
          <span>🚨</span>
          对租客影响最大的风险条款 / Top Risks for Tenants
          <span className="bg-rose-500 text-white px-4 py-1 rounded-full text-base font-bold">
            {topRiskClauses.length}条
          </span>
        </h3>
        <p className="text-sm text-slate-500 mt-2">
          {lang === 'zh'
            ? '基于条款内容自动筛选出的重点风险，优先突出可能导致高额费用、押金难退或难以解约的条款。'
            : 'Automatically surfaced key risks, prioritizing clauses that may cause high fees, deposit loss, or make it hard to end the lease.'}
        </p>
      </div>
      <div className="space-y-4">
        {topRiskClauses.map((clause: any, index: number) => (
          <HighRiskClauseItem
            key={clause.clause_number || index}
            clause={clause}
            index={index}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4 no-print">
        以下是基于风险等级和金额相关条款筛选的重点内容，建议优先关注。
      </p>
    </section>
  );
};

const hasContentMismatch = (clause: any): boolean => {
  const text = (clause.clause_text || clause.original_clause || '').toLowerCase();
  const analysis = (clause.analysis_zh || clause.analysis_en || '').toLowerCase();
  
  if (!text || !analysis || text.length < 20 || analysis.length < 20) return false;
  
  const TOPIC_KEYWORDS = [
    { topics: ['rent', 'monthly payment', '房租', '月租'], label: 'rent' },
    { topics: ['deposit', 'security', '押金', '保证金'], label: 'deposit' },
    { topics: ['terminate', 'early termination', '解约', '提前退租'], label: 'termination' },
    { topics: ['late fee', '滞纳金', '逾期'], label: 'late_fee' },
    { topics: ['renewal', 'auto-renew', '续约', '自动续'], label: 'renewal' },
    { topics: ['pet', '宠物', '狗', '猫'], label: 'pet' },
    { topics: ['guest', 'visitor', '访客', '客人'], label: 'guest' },
    { topics: ['sublet', 'assign', '转租', '分租'], label: 'sublet' },
    { topics: ['landlord', 'lessor', '房东', '出租方'], label: 'landlord' },
    { topics: ['tenant', 'lessee', '租客', '承租方'], label: 'tenant' },
    { topics: ['utility', 'utilities', '水电', '燃气'], label: 'utility' },
    { topics: ['maintenance', 'repair', '维修', '维护'], label: 'maintenance' },
    { topics: ['parking', '车位', '停车'], label: 'parking' },
  ];
  
  let textTopic: string | null = null;
  let analysisTopic: string | null = null;
  
  for (const { topics, label } of TOPIC_KEYWORDS) {
    if (topics.some(kw => text.includes(kw)) && !textTopic) {
      textTopic = label;
    }
    if (topics.some(kw => analysis.includes(kw)) && !analysisTopic) {
      analysisTopic = label;
    }
  }
  
  if (textTopic && analysisTopic && textTopic !== analysisTopic) {
    return true;
  }
  
  return false;
};

const getHighRiskReason = (clause: any): { icon: string; label: string; labelZh: string } | null => {
  const text = (clause.clause_text || clause.original_clause || '').toLowerCase();
  const analysis = (clause.analysis_zh || clause.analysis_en || '').toLowerCase();
  const combined = text + ' ' + analysis;
  
  if (/terminat|evict|驱逐|解约|提前退/.test(combined)) {
    return { icon: '🚪', label: 'Early Termination', labelZh: '提前解约风险' };
  }
  if (/deposit|non-refundable|押金不退|扣除押金/.test(combined)) {
    return { icon: '💰', label: 'Deposit Risk', labelZh: '押金风险' };
  }
  if (/late fee|penalty|滞纳金|罚款/.test(combined)) {
    return { icon: '⏰', label: 'Late Fees', labelZh: '滞纳金' };
  }
  if (/auto.*renew|automatic renewal|自动续约|自动续租/.test(combined)) {
    return { icon: '🔄', label: 'Auto-Renewal', labelZh: '自动续约陷阱' };
  }
  if (/attorney|legal fee|律师费|诉讼费/.test(combined)) {
    return { icon: '⚖️', label: 'Legal Costs', labelZh: '法律费用' };
  }
  if (/forfeit|liable|liability|赔偿|违约金/.test(combined)) {
    return { icon: '⚠️', label: 'Penalty Clause', labelZh: '违约条款' };
  }
  
  return null;
};

const getTenantImpactLabel = (clause: any): { en: string; zh: string } => {
  const text = (clause.clause_text || clause.original_clause || '').toLowerCase();
  const analysis = (clause.analysis_zh || clause.analysis_en || '').toLowerCase();
  const combined = text + ' ' + analysis;
  
  if (/terminat|evict|驱逐|解约|提前退|break.*lease/.test(combined)) {
    return { en: 'Hard to terminate the lease', zh: '不容易提前解约' };
  }
  if (/deposit|non-refundable|押金不退|扣除押金|forfeit.*deposit|没收押金/.test(combined)) {
    return { en: 'Risk of losing deposit', zh: '押金被扣风险较高' };
  }
  if (/auto.*renew|automatic renewal|自动续约|自动续租|evergreen/.test(combined)) {
    return { en: 'Automatic renewal risk', zh: '存在自动续约风险' };
  }
  if (/late fee|daily.*fee|per.*day|滞纳金|每日.*罚/.test(combined)) {
    return { en: 'Potential large financial loss', zh: '可能造成较大经济损失' };
  }
  if (/penalty|liquidat|违约金|赔偿金/.test(combined)) {
    return { en: 'Potential large financial loss', zh: '可能造成较大经济损失' };
  }
  if (/attorney|legal fee|律师费|诉讼费|court.*cost/.test(combined)) {
    return { en: 'Legal cost risk', zh: '可能产生法律费用' };
  }
  
  return { en: 'Review carefully before signing', zh: '签署前请仔细审查' };
};

const isBoilerplateAnalysis = (text: string): boolean => {
  if (!text || text.length < 30) return true;
  const patterns = [
    /this clause has been analyzed/i,
    /this provision has been reviewed/i,
    /clause analyzed for potential/i,
    /standard clause that/i,
    /this is a standard/i,
    /reviewed and analyzed/i,
    /has been reviewed/i,
    /please review this clause/i,
    /签署前请仔细阅读/i,
    /请仔细阅读/i,
    /本条款为标准/i,
    /这是标准条款/i,
  ];
  return patterns.some(p => p.test(text));
};

const BOILERPLATE_PHRASES = [
  /This clause has been analyzed for potential[^.]*\.\s*/gi,
  /This provision has been reviewed[^.]*\.\s*/gi,
  /Clause analyzed for potential[^.]*\.\s*/gi,
  /This is a standard clause[^.]*\.\s*/gi,
  /Standard clause that[^.]*\.\s*/gi,
  /Please review this clause carefully[^.]*\.\s*/gi,
  /Review this clause carefully[^.]*\.\s*/gi,
  /该条款已分析[^。]*。\s*/g,
  /本条款已分析[^。]*。\s*/g,
  /本条款为标准[^。]*。\s*/g,
  /这是标准条款[^。]*。\s*/g,
  /签署前请仔细阅读[^。]*。\s*/g,
  /请仔细阅读[^。]*。\s*/g,
];

const stripBoilerplate = (text: string | null | undefined): string | null => {
  if (!text || text.trim().length < 10) return null;
  let cleaned = text;
  for (const pattern of BOILERPLATE_PHRASES) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.trim();
  return cleaned.length >= 10 ? cleaned : null;
};

const CHECK_PAYMENT_PATTERNS = /check|money order|cashier'?s check|personal check|支票|汇票|cash only|no.*electronic/i;

const enhancePaymentMethodSuggestion = (suggestionZh: string | null | undefined, clauseText: string): string | null => {
  const combined = (clauseText + ' ' + (suggestionZh || '')).toLowerCase();
  
  if (!CHECK_PAYMENT_PATTERNS.test(combined)) {
    return suggestionZh;
  }
  
  const enhancedAddition = '作为留学生可能没有美国个人支票账户，建议提前和房东确认是否接受 Zelle、银行转账等电子支付方式。如果只能用汇票，需了解银行手续费和办理流程。';
  
  if (!suggestionZh || suggestionZh.trim().length < 10) {
    return enhancedAddition;
  }
  
  if (suggestionZh.includes('支票') || suggestionZh.includes('汇票') || suggestionZh.includes('check')) {
    return suggestionZh;
  }
  
  return suggestionZh + ' ' + enhancedAddition;
};

const isLowConfidence = (clause: any): boolean => {
  if (hasEmptyAnalysis(clause)) return true;
  const analysis = clause.analysis_zh || clause.analysis_en || '';
  if (isBoilerplateAnalysis(analysis)) return true;
  if (hasContentMismatch(clause)) return true;
  return false;
};

const calculateRiskPriority = (clause: any): number => {
  let score = 0;
  
  const riskLevel = getRiskLevel(clause);
  if (riskLevel === 'danger') score += 100;
  else if (riskLevel === 'caution') score += 50;
  
  if (!isTrulyHighRisk(clause)) score -= 30;
  
  if (isLowConfidence(clause)) score -= 40;
  
  const text = (clause.clause_text || clause.original_clause || '').toLowerCase();
  const analysis = (clause.analysis_zh || clause.analysis_en || '').toLowerCase();
  const combined = text + ' ' + analysis;
  
  if (/terminat|evict|驱逐|解约|提前退|break.*lease|lease.*break/.test(combined)) {
    score += 30;
  }
  if (/deposit|non-refundable|押金不退|扣除押金|forfeit.*deposit|没收押金/.test(combined)) {
    score += 25;
  }
  if (/auto.*renew|automatic renewal|自动续约|自动续租|evergreen|perpetual/.test(combined)) {
    score += 25;
  }
  if (/late fee|daily.*fee|per.*day|滞纳金|每日.*罚|每天/.test(combined)) {
    score += 20;
  }
  if (/penalty|liquidat|违约金|赔偿金|赔偿.*万|赔偿.*元/.test(combined)) {
    score += 20;
  }
  if (/attorney|legal fee|律师费|诉讼费|court.*cost/.test(combined)) {
    score += 15;
  }
  
  return score;
};

const sortHighRiskClauses = (clauses: any[]): any[] => {
  if (!clauses || !Array.isArray(clauses)) return [];
  return [...clauses].sort((a, b) => calculateRiskPriority(b) - calculateRiskPriority(a));
};

const getTopRiskClauses = (clauses: any[]): any[] => {
  if (!clauses || !Array.isArray(clauses)) return [];
  
  const highConfidenceClauses = clauses.filter(clause => !isLowConfidence(clause));
  
  return highConfidenceClauses.sort((a, b) => calculateRiskPriority(b) - calculateRiskPriority(a));
};

const filterHighRiskClauses = (clauses: any[]): any[] => {
  if (!clauses || !Array.isArray(clauses)) return [];
  
  return clauses.filter(clause => {
    const riskLevel = getRiskLevel(clause);
    if (riskLevel !== 'danger' && riskLevel !== 'caution') return false;
    if (hasContentMismatch(clause)) return false;
    return isTrulyHighRisk(clause);
  }).sort((a, b) => {
    const aLevel = getRiskLevel(a);
    const bLevel = getRiskLevel(b);
    if (aLevel === 'danger' && bLevel !== 'danger') return -1;
    if (aLevel !== 'danger' && bLevel === 'danger') return 1;
    return 0;
  });
};

type TranslationKey = keyof typeof zh;

type HomeProps = {
  t: (key: TranslationKey) => string;
  lang: Lang;
};

declare global {
  interface Window {
    Paddle: {
      Initialize: (options: { token: string }) => void;
      Checkout: {
        open: (options: { items: { price_id: string; quantity: number }[] }) => void;
      };
    };
  }
}

const Home: React.FC<HomeProps> = ({ t, lang }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [isFullLoading, setIsFullLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentEmail, setPaymentEmail] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingError, setPricingError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const pdfCount = useMemo(() => 
    files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')).length,
    [files]
  );

  useEffect(() => {
    let storedUserId = localStorage.getItem("user_id");
    
    // In development mode, allow test user for bypass
    const isDev = import.meta.env.DEV;
    const useTestUser = isDev && import.meta.env.VITE_TEST_USER_BYPASS === "true";
    
    if (useTestUser) {
      storedUserId = "test_user";
      localStorage.setItem("user_id", storedUserId);
    } else if (!storedUserId) {
      storedUserId = crypto.randomUUID();
      localStorage.setItem("user_id", storedUserId);
    }
    
    setUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (analysisResult?.success && analysisResult.data) {
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        if (analysisResult.data.risk_score) {
          document.title = `租约分析完成 - ${analysisResult.data.risk_score}分 | QiYoga`;
        }
      }, 500);
    }
  }, [analysisResult]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setWaitlistSuccess(true);
      setTimeout(() => {
        setIsWaitlistOpen(false);
        setWaitlistSuccess(false);
      }, 3000);
    }, 800);
  };

  const handleAnalyze = async () => {
    if (!files || files.length === 0) {
      setAnalysisError("Please select at least one file");
      return;
    }

    if (!userId) {
      setAnalysisError("User ID not available. Please refresh the page.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file);
      });
      formData.append("language", lang);
      console.log('[DEBUG] Sending OCR request with language:', lang, 'files:', files.length);

      const { data: result, timing } = await callApiWithTiming<any>(
        'LeaseOcr',
        API_ENDPOINTS.ocr(userId),
        { method: "POST", body: formData }
      );
      logTiming('LeaseOcr', timing);

      if (result.detail === "ACCESS_DENIED") {
        setAnalysisError(result.message || "您当前没有有效的分析权限，请登录或完成支付后再试。");
        return;
      }

      if (!result.success && result.detail) {
        setAnalysisError(result.message || "Access denied. Please try again.");
        return;
      }

      setAnalysisResult(result);

      if (result.success && result.data?.analysis_id) {
        setAnalysisId(result.data.analysis_id);
        setHasFullAccess(true);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze lease';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        setAnalysisError("服务器暂时不可用，请稍后再试。如果多次失败，请联系支持。");
      } else {
        setAnalysisError(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewFullReport = async () => {
    if (!userId) {
      setPaymentError("User ID not available. Please refresh the page.");
      return;
    }

    setPaymentError(null);

    if (!paymentEmail) {
      alert("Please enter your email address to continue with payment");
      scrollToSection('analyze');
      return;
    }

    try {
      const response = await apiPost(API_ENDPOINTS.checkout, {
        email: paymentEmail,
        user_id: userId
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        setPaymentError(result.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        setPaymentError("服务器暂时不可用，请稍后再试。如果多次失败，请联系支持。");
      } else {
        setPaymentError(errorMessage);
      }
    }
  };

  const handleOpenCheckout = (planId?: string) => {
    window.Paddle.Checkout.open({
      items: [{ price_id: planId || PRICE_ID, quantity: 1 }]
    });
  };

  const handleStartFullAnalysis = async () => {
    if (!files || files.length === 0) {
      setAnalysisError("请先选择要上传的租约文件");
      return;
    }

    if (!userId) {
      setAnalysisError("User ID not available. Please refresh the page.");
      return;
    }

    setIsFullLoading(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const accessResponse = await fetch(API_ENDPOINTS.billingCheckAccess(userId));
      const accessData = await accessResponse.json();

      const hasAccess = accessData.has_access === true;

      if (!hasAccess) {
        setIsFullLoading(false);
        handleOpenCheckout();
        return;
      }

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file);
      });
      formData.append("language", lang);

      const { data: result, timing } = await callApiWithTiming<any>(
        'FullReportOcr',
        API_ENDPOINTS.ocr(userId),
        { method: "POST", body: formData }
      );
      logTiming('FullReportOcr', timing);

      if (result.detail === "ACCESS_DENIED") {
        handleOpenCheckout();
        return;
      }

      if (!result.success && result.detail) {
        setAnalysisError(result.message || "Access denied. Please try again.");
        return;
      }

      setAnalysisResult(result);
      setHasFullAccess(true);

      if (result.success && result.data?.analysis_id) {
        setAnalysisId(result.data.analysis_id);
      }
    } catch (error) {
      console.error("Full analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze lease';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        setAnalysisError("服务器暂时不可用，请稍后再试。如果多次失败，请联系支持。");
      } else {
        setAnalysisError(errorMessage);
      }
    } finally {
      setIsFullLoading(false);
    }
  };

  return (
    <div className="overflow-hidden bg-[#F8FAFC]">
      {/* Waitlist Modal */}
      {isWaitlistOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsWaitlistOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsWaitlistOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            {waitlistSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">You're on the list!</h3>
                <p className="text-slate-500">We'll notify you as soon as Basic Scan is available.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Join the Waitlist</h3>
                  <p className="text-slate-500 mt-2">Get early access to our free Basic Scan tier.</p>
                </div>
                
                <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        required 
                        type="text" 
                        placeholder="Your Name" 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        required 
                        type="email" 
                        placeholder="you@example.com" 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={paymentEmail}
                        onChange={(e) => setPaymentEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#4F46E5] text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Get Early Access
                  </button>
                  <p className="text-center text-xs text-slate-400">We respect your privacy. No spam, ever.</p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-block py-1 px-4 rounded-full bg-indigo-50 text-[#4F46E5] text-xs font-bold mb-8 border border-indigo-100">
            {lang === 'zh' ? '专为留学生和访问学者设计' : 'Trusted by First-Time Renters across the U.S.'}
          </span>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {t('hero_title')}
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-4 leading-relaxed">
            {t('hero_subtitle')}
          </p>
          
          <button 
            onClick={() => scrollToSection('analyze')}
            className="px-8 py-4 bg-[#4F46E5] text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            {t('hero_cta_primary')}
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-indigo-50 to-white no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Proof 1 */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {lang === 'zh'
                  ? '已为上千份租约生成风险分析报告'
                  : 'Already used on thousands of leases'}
              </p>
            </div>

            {/* Proof 2 */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {lang === 'zh'
                  ? '大部分用户在第一次扫描中就发现了原本没注意到的风险条款'
                  : 'Most users discover risks they hadn\'t noticed in their lease on the first scan'}
              </p>
            </div>

            {/* Proof 3 */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6" />
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {lang === 'zh'
                  ? '很多用户用报告里的中文建议，成功谈掉了高额滞纳金、清洁费或不公平的解约条款'
                  : 'Many users have used the report\'s suggestions to negotiate away unfair late fees, cleaning charges, or harsh early-termination penalties'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{lang === 'zh' ? '这个工具适合谁？' : 'Key Features'}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature1_title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('feature1_body')}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">💼</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature2_title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('feature2_body')}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">👨‍👩‍👧</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature3_title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('feature3_body')}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature4_title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('feature4_body')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="steps" className="py-24 bg-[#F8FAFC] no-print">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{t('steps_title')}</h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
              <p className="text-slate-700 text-lg pt-1.5">{t('step1')}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
              <p className="text-slate-700 text-lg pt-1.5">{t('step2')}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
              <p className="text-slate-700 text-lg pt-1.5">{t('step3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Start Your Review */}
      <section id="analyze" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{lang === 'zh' ? '开始分析你的租约' : 'Start Full Lease Review'}</h2>
            <p className="text-slate-600 text-lg font-medium mb-2">
              {lang === 'zh' 
                ? '上传整份租约，AI 会自动挑出最重要的 10–20 条条款，逐条解读风险等级、白话解释，并给出可直接复制给房东的谈判建议。' 
                : 'Upload your lease and the AI will analyze it end‑to‑end, surfacing roughly 10–20 of the most important clauses with risk level, plain‑language explanation, and negotiation suggestions.'}
            </p>
            {lang === 'en' && (
              <p className="text-slate-500 text-base">
                上传整份租约，AI 会自动挑出最重要的 10–20 条条款，逐条解读风险等级、白话解释，并给出可直接复制给房东的谈判建议。
              </p>
            )}
          </div>
          
          <div className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100">
            <div className="space-y-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-8 md:p-16 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group text-center"
              >
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:text-indigo-400 group-hover:bg-indigo-100 transition-colors">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <p className="text-slate-700 font-semibold text-xl mb-3">
                  {files.length > 0 
                    ? (lang === 'zh' ? `已选择：${files.length} 个文件` : `Selected: ${files.length} file(s)`)
                    : (lang === 'zh' ? "上传租约 PDF 或多张照片" : "Upload lease PDF or photos")}
                </p>
                <p className="text-slate-600 text-base font-medium mb-1">
                  {lang === 'zh' 
                    ? "可一次选择多张租约照片；PDF 建议一次仅上传 1 份合同"
                    : "You can upload multiple lease photos at once; for PDFs, upload one contract per analysis."}
                </p>
                <p className="text-xs text-slate-400">
                  {lang === 'zh'
                    ? "在文件选择窗口按住 Ctrl/Command 可多选照片"
                    : "Use Ctrl/Command in the file picker to select multiple photos."}
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,image/*"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))} 
                />
              </div>

              {files.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex flex-wrap gap-3">
                    {files.map((file, idx) => {
                      const isImage = file.type.startsWith('image/');
                      const imageUrl = isImage ? URL.createObjectURL(file) : null;
                      return (
                        <div 
                          key={`${file.name}-${idx}`}
                          className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-sm"
                        >
                          {isImage && imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded"
                              onLoad={() => URL.revokeObjectURL(imageUrl)}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-rose-100 rounded flex items-center justify-center">
                              <FileText className="h-6 w-6 text-rose-500" />
                            </div>
                          )}
                          <span className="text-sm text-slate-700 max-w-[120px] truncate">
                            {file.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pdfCount > 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    {lang === 'zh'
                      ? "检测到多份 PDF，可能导致分析变慢或失败，建议每次只上传 1 份 PDF。"
                      : "Multiple PDFs detected. This may slow down or break analysis. We recommend uploading only one PDF per run."}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleStartFullAnalysis}
                  disabled={isFullLoading || files.length === 0}
                  className={`py-5 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-xl ${
                    isFullLoading || files.length === 0
                      ? "bg-slate-300 cursor-not-allowed shadow-slate-50 text-slate-500"
                      : "bg-[#4F46E5] hover:bg-indigo-700 shadow-indigo-100 text-white"
                  }`}
                >
                  {isFullLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      分析中，请稍候...
                    </>
                  ) : (
                    <>
                      开始完整分析
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-400">
                  深度分析需要 30–60 秒，请耐心等待。建议在 Wi‑Fi 环境下使用，生成过程中请不要关闭页面。
                </p>
              </div>

              {isFullLoading && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl animate-pulse">
                  <div className="flex items-center text-indigo-700">
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    <span className="font-medium">正在生成完整报告，请耐心等待，这通常需要 30–60 秒…</span>
                  </div>
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="text-xs text-slate-400">
                  支持多页 PDF 或多张租约照片，一次上传视为一份合同，我们会自动合并所有页面，一次性分析整份租约。
                </p>
                <p className="text-xs text-indigo-500 font-medium">
                  本次上传将作为一份合同完整分析，不按页数额外收费。
                </p>
              </div>

              <div className="text-center">
                <button 
                  onClick={() => scrollToSection('example-report')}
                  className="text-base text-slate-600 font-medium hover:text-indigo-600 transition-colors"
                >
                  {lang === 'zh'
                    ? '📤 上传后，你会收到一份类似下面这样的条款逐条解读报告 →'
                    : '📤 After upload, you\'ll get a clause-by-clause report like the examples below →'}
                </button>
              </div>

              {analysisError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-center text-rose-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="font-medium">{analysisError}</span>
                  </div>
                </div>
              )}

              {analysisResult && analysisResult.success && (
                <div ref={analysisRef} id="analysis-results" className="mt-6 p-6 bg-indigo-50 border border-indigo-200 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500 print-container">
                  
                  {/* Print-only header */}
                  <div className="print-only print-header">
                    <h1>QiYoga Lease Analysis Report</h1>
                    <p className="subtitle">For Chinese International Students</p>
                    <p className="date">Generated: {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="disclaimer">本报告为 AI 助手生成，仅供参考，不构成法律意见。</p>
                  </div>

                  <div className="flex items-center mb-4 no-print">
                    <CheckCircle2 className="h-6 w-6 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-bold text-slate-900">Analysis Complete</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Print-only summary section */}
                    <div className="print-only print-summary">
                      <h2 className="print-section-title">Summary / 总结</h2>
                      {analysisResult?.data?.risk_score && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Risk Score: </strong>
                          <span>{analysisResult.data.risk_score}/100</span>
                          {' - '}
                          <span className={`print-risk-badge ${
                            analysisResult.data.risk_level === '低' ? 'print-risk-safe' :
                            analysisResult.data.risk_level === '中' ? 'print-risk-caution' : 'print-risk-danger'
                          }`}>
                            {analysisResult.data.risk_level}风险
                          </span>
                        </div>
                      )}
                      <p style={{ marginTop: '12px', fontSize: '11pt' }}>
                        本租约分析报告包含 {analysisResult?.data?.clauses?.length || 0} 个条款的详细分析。
                        请仔细阅读每条风险提示，并在签署前与房东沟通协商不合理条款。
                      </p>
                    </div>

                    {/* New Summary Card */}
                    {analysisResult?.data?.summary && (
                      <LeaseSummaryCard summary={analysisResult.data.summary} lang={lang} />
                    )}

                    {/* Fallback Key Info (if no summary) */}
                    {!analysisResult?.data?.summary && analysisResult?.data?.key_info && (
                      <div className="p-4 bg-white rounded-lg border border-indigo-100 no-print">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Key Information</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-slate-500">Rent:</span> <span className="font-semibold">{analysisResult.data.key_info.rent_amount}</span></div>
                          <div><span className="text-slate-500">Term:</span> <span className="font-semibold">{analysisResult.data.key_info.lease_term}</span></div>
                          <div><span className="text-slate-500">Start:</span> <span className="font-semibold">{analysisResult.data.key_info.start_date}</span></div>
                          <div><span className="text-slate-500">Landlord:</span> <span className="font-semibold">{analysisResult.data.key_info.landlord}</span></div>
                        </div>
                      </div>
                    )}

                    {analysisResult?.data?.risk_score && (
                      <div className="p-8 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl shadow-xl border-4 border-red-100">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-7xl font-black text-red-600">
                            {analysisResult.data.risk_score}
                          </div>
                          <div className="text-left">
                            <div className="text-2xl font-bold text-red-700">/ 100</div>
                            <div className="text-xl font-semibold text-red-600 mt-1">
                              {analysisResult.data.risk_level}风险
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {analysisResult?.data?.red_flags?.length > 0 && (
                      <section>
                        <h3 className="text-2xl font-black text-red-600 mb-6 flex items-center gap-3">
                          <span>🔴</span>
                          发现风险条款
                          <span className="bg-red-500 text-white px-4 py-1 rounded-full text-base font-bold">
                            {analysisResult.data.red_flags.length}个
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {analysisResult.data.red_flags.map((flag: any, i: number) => (
                            <div key={flag.id || i} className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  flag.severity === 'high' ? 'bg-red-500 text-white' :
                                  flag.severity === 'medium' ? 'bg-amber-500 text-white' :
                                  'bg-slate-500 text-white'
                                }`}>
                                  {flag.severity === 'high' ? '高危' : flag.severity === 'medium' ? '中危' : '低危'}
                                </span>
                                <span className="text-sm font-semibold text-red-800">{flag.clause}</span>
                              </div>
                              <p className="text-base text-red-700 mb-4 leading-relaxed">{flag.issue}</p>
                              <div className="bg-red-100 p-3 rounded-xl font-medium text-red-900 text-sm border-l-4 border-red-400">
                                ⚠️ 潜在影响：{flag.impact}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {analysisResult?.data?.negotiation_tips?.length > 0 && (
                      <section>
                        <h3 className="text-2xl font-black text-green-600 mb-6 flex items-center gap-3">
                          <span>💰</span>
                          专业谈判策略
                          <span className="bg-green-500 text-white px-4 py-1 rounded-full text-base font-bold">
                            {analysisResult.data.negotiation_tips.length}条
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {analysisResult.data.negotiation_tips.map((tip: any, i: number) => (
                            <div key={tip.id || i} className="group p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  tip.priority === 'high' ? 'bg-green-600 text-white' :
                                  tip.priority === 'medium' ? 'bg-green-500 text-white' :
                                  'bg-green-400 text-white'
                                }`}>
                                  {tip.priority === 'high' ? '优先' : tip.priority === 'medium' ? '建议' : '可选'}
                                </span>
                                <span className="font-bold text-green-800">{tip.category}</span>
                              </div>
                              <p className="text-base text-green-700 mb-4 leading-relaxed">{tip.tip}</p>
                              {tip.expected_savings && (
                                <div className="bg-green-100 p-3 rounded-xl font-bold text-green-600 text-sm">
                                  💵 {tip.expected_savings}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* High Risk Clauses Section */}
                    <HighRiskClausesSection clauses={analysisResult?.data?.high_risk_clauses} lang={lang} />

                    {analysisResult?.data?.clause_summary && (
                      <details className="group">
                        <summary className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl font-bold text-lg text-blue-800 hover:bg-blue-100 transition-all shadow-md border-2 border-blue-100 cursor-pointer list-none flex items-center justify-between">
                          <span className="flex items-center gap-3">
                            <span>📋</span>
                            合同条款深度解析 ({Object.keys(analysisResult.data.clause_summary).length}条)
                          </span>
                          <span className="text-sm opacity-70 group-open:hidden">点击展开</span>
                          <span className="text-sm opacity-70 hidden group-open:inline">点击收起</span>
                        </summary>
                        <div className="p-6 bg-slate-50 rounded-b-2xl mt-1 space-y-3 border border-slate-200">
                          {Object.entries(analysisResult.data.clause_summary).map(([key, clause]: [string, any]) => (
                            <div key={key} className="p-5 bg-white rounded-xl border-l-4 border-blue-400 hover:shadow-md transition-all">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-bold text-lg text-blue-800">{clause.title}</span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                  {clause.clause_number}
                                </span>
                              </div>
                              <p className="text-base text-slate-700 mb-3 leading-relaxed">{clause.summary}</p>
                              {clause.details && (
                                <div className="bg-blue-50 p-3 rounded-lg text-sm text-slate-600 border-l-2 border-blue-300">
                                  <strong className="text-blue-900">详情：</strong> {clause.details}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    
                    {analysisResult.data.clauses && analysisResult.data.clauses.length > 0 && (
                      <div className="p-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm print-container">
                        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2 no-print">
                          <span>📝</span>
                          条款分析 ({analysisResult.data.shown_clauses} / {analysisResult.data.total_clauses})
                        </h3>
                        
                        {/* Print-only section title */}
                        <div className="print-only">
                          <h2 className="print-section-title">Clause Details / 条款详情</h2>
                        </div>
                        
                        <div className="space-y-6">
                          {Array.isArray(analysisResult.data.clauses) && analysisResult.data.clauses
                            .filter((clause: any) => {
                              const text = clause.clause_text || clause.original_clause || clause.text || "";
                              return text.length >= 10 && !text.startsWith("--- Page");
                            })
                            .map((clause: any, index: number) => {
                            const clauseText = clause.clause_text || clause.original_clause || clause.text || "";
                            const chineseExplanation = clause.chinese_explanation || "";
                            const riskLevel = (clause.risk_level || "").toLowerCase();
                            const analysisEn = clause.analysis_en || clause.analysis || "";
                            const analysisZh = clause.analysis_zh || "";
                            const suggestionEn = clause.suggestion_en || clause.suggestion || "";
                            const suggestionZh = clause.suggestion_zh || "";
                            const clauseId = clause.id || clause.clause_number || `clause-${index}`;
                            const cleanAnalysisEn = stripBoilerplate(analysisEn);
                            const cleanAnalysisZh = stripBoilerplate(analysisZh);
                            const cleanSuggestionEn = stripBoilerplate(suggestionEn);
                            const rawSuggestionZh = stripBoilerplate(suggestionZh);
                            const cleanSuggestionZh = enhancePaymentMethodSuggestion(rawSuggestionZh, clauseText);

                            const getRiskBadge = () => {
                              if (riskLevel === "safe") {
                                return (
                                  <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full no-print">
                                    ✓ Safe
                                  </span>
                                );
                              }
                              if (riskLevel === "caution" || riskLevel === "medium") {
                                return (
                                  <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full no-print">
                                    ⚠ Caution
                                  </span>
                                );
                              }
                              if (riskLevel === "danger" || riskLevel === "high" || riskLevel === "high risk") {
                                return (
                                  <span className="inline-flex items-center px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full no-print">
                                    ⛔ High Risk
                                  </span>
                                );
                              }
                              return null;
                            };

                            const getPrintRiskText = () => {
                              if (riskLevel === "safe") {
                                return "风险等级：安全（Safe）";
                              }
                              if (riskLevel === "caution" || riskLevel === "medium") {
                                return "风险等级：中等（Caution）";
                              }
                              if (riskLevel === "danger" || riskLevel === "high" || riskLevel === "high risk") {
                                return "风险等级：较高（High Risk）";
                              }
                              return "";
                            };

                            return (
                              <div
                                key={clauseId}
                                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow print-clause-card print-avoid-break"
                              >
                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 no-print">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
                                    {index + 1}
                                  </span>
                                  <span className="text-sm font-semibold text-slate-600">
                                    Clause {index + 1} / 条款 {index + 1}
                                  </span>
                                  {getRiskBadge()}
                                </div>
                                <div className="print-only print-clause-number">
                                  Clause {(index + 1)} / 条款 {(index + 1)}
                                </div>
                                
                                <div className="print-only print-clause-text">
                                  {clauseText}
                                </div>
                                
                                <p className="text-sm font-medium text-slate-800 leading-relaxed mb-3 no-print">
                                  {clauseText}
                                </p>
                                
                                {chineseExplanation && (
                                  <>
                                    {/* Print-only Chinese explanation */}
                                    <div className="print-only print-chinese-explanation">
                                      <strong>中文解释：</strong>{chineseExplanation}
                                    </div>
                                    {/* Screen Chinese explanation */}
                                    <div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-400 mb-3 no-print">
                                      <span className="font-semibold text-amber-800 text-sm">中文解释：</span>
                                      <span className="text-sm text-slate-700 ml-1">{chineseExplanation}</span>
                                    </div>
                                  </>
                                )}

                                <div className="print-only" style={{ marginBottom: '12px' }}>
                                  <span className={`print-risk-badge ${
                                    riskLevel === "safe" ? "print-risk-safe" :
                                    (riskLevel === "caution" || riskLevel === "medium") ? "print-risk-caution" : "print-risk-danger"
                                  }`}>
                                    {getPrintRiskText()}
                                  </span>
                                </div>

                                {/* Analysis section */}
                                {cleanAnalysisEn && (
                                  <>
                                    <div className="print-only print-analysis-block">
                                      <strong>Analysis (EN):</strong> {cleanAnalysisEn}
                                    </div>
                                    <div className="mb-2 no-print">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Analysis: </span>
                                      <span className="text-sm text-slate-600">{cleanAnalysisEn}</span>
                                    </div>
                                  </>
                                )}

                                {cleanAnalysisZh && (
                                  <>
                                    <div className="print-only print-analysis-block">
                                      <strong>分析（中文）：</strong>{cleanAnalysisZh}
                                    </div>
                                    <div className="mb-2 bg-blue-50 p-2 rounded border-l-2 border-blue-300 no-print">
                                      <span className="text-xs font-bold text-blue-700">分析（中文）：</span>
                                      <span className="text-sm text-slate-600 ml-1">{cleanAnalysisZh}</span>
                                    </div>
                                  </>
                                )}

                                {/* Suggestion section */}
                                {cleanSuggestionEn && (
                                  <>
                                    <div className="print-only print-suggestion-block">
                                      <strong>Suggestion (EN):</strong> {cleanSuggestionEn}
                                    </div>
                                    <div className="mb-2 no-print">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Suggestion: </span>
                                      <span className="text-sm text-slate-600">{cleanSuggestionEn}</span>
                                    </div>
                                  </>
                                )}

                                {cleanSuggestionZh && (
                                  <>
                                    <div className="print-only print-suggestion-block">
                                      <strong>建议（中文）：</strong>{cleanSuggestionZh}
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border-l-2 border-green-300 no-print">
                                      <span className="text-xs font-bold text-green-700">建议（中文）：</span>
                                      <span className="text-sm text-slate-600 ml-1">{cleanSuggestionZh}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {!hasFullAccess && analysisResult.data.total_clauses > analysisResult.data.shown_clauses && (
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg no-print">
                            <div className="flex items-center justify-center gap-2 text-amber-700 font-medium mb-2">
                              <span className="text-lg">🔒</span>
                              <span>还有 {analysisResult.data.total_clauses - analysisResult.data.shown_clauses} 条条款未解锁</span>
                            </div>
                            <button
                              onClick={() => handleOpenCheckout()}
                              className="w-full py-3 bg-[#4F46E5] text-white rounded-lg font-bold hover:bg-indigo-700 transition-all mt-2"
                            >
                              解锁完整报告
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between text-xs text-slate-500 no-print">
                      <span>Pages: {analysisResult.data.pages || analysisResult.data.page_count}</span>
                      <span>Processing Time: {analysisResult.data.processing_time}</span>
                    </div>
                  </div>
                  
                  {!hasFullAccess ? (
                    <button
                      onClick={() => handleOpenCheckout()}
                      className="mt-6 w-full py-4 bg-[#4F46E5] text-white rounded-xl font-bold hover:bg-indigo-700 transition-all no-print"
                    >
                      {lang === 'zh' ? '解锁完整报告' : 'Unlock Full Report'} - $9.90
                      <div className="text-xs font-normal opacity-90 mt-1">获得 30 天无限访问权限</div>
                    </button>
                  ) : (
                    <div className="mt-6 text-center no-print">
                      <button 
                        onClick={() => window.print()}
                        className="w-full py-4 bg-[#4F46E5] text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Printer className="h-5 w-5" />
                        Print / Save as PDF
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Click to print or save this report as a PDF file
                      </p>
                    </div>
                  )}

                  {paymentError && (
                    <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                      <div className="flex items-center text-rose-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">{paymentError}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-slate-200 no-print">
                    <div className="flex items-start gap-2 text-xs text-slate-400">
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p>
                          {lang === 'zh'
                            ? '本工具基于 AI 模型对租约进行自动分析，仅供参考，不构成法律意见。涉及重大金额或复杂纠纷风险，建议咨询专业律师或当地法律服务机构。'
                            : 'This tool uses AI to automatically analyze your lease and is for informational purposes only. It does not constitute legal advice. For high-stakes or complex situations, please consult a lawyer or qualified legal service.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Example Report Preview - What You Get */}
      <section id="example-report" className="py-20 bg-gradient-to-b from-slate-50 to-white no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              {lang === 'zh' ? 'AI 解读报告长什么样' : 'What Your AI Lease Report Looks Like'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {lang === 'zh'
                ? '每一条都会从"原文条款 → 对你意味着什么 → 可以怎么谈"三个角度帮你看明白。'
                : 'Each clause is broken down into: original text → what it means for you → how you can negotiate.'}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 - Late Fee */}
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                  ⚠ Caution / 中等风险
                </span>
              </div>
              <h4 className="font-semibold text-slate-800 text-sm mb-3">Clause: Late Fee / 滞纳金条款</h4>
              <p className="text-sm text-slate-600 italic mb-4 line-clamp-3 border-l-2 border-slate-200 pl-3">
                "If rent is not received by the 5th of the month, Tenant shall pay a late fee of 5% of the monthly rent."
              </p>
              <div className="bg-slate-50 p-3 rounded-lg mb-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-800">中文解释：</span>这一条款规定如果你在每月 5 号之后交房租，就要额外付当月房租 5% 的滞纳金，长期下来金额不低。
                </p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border-l-4 border-emerald-400">
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">💡 建议：</span>可以和房东协商改为固定金额（例如 50 美元封顶），避免随着房租上涨而无限增加滞纳金。
                </p>
              </div>
            </div>

            {/* Card 2 - Cleaning Fee */}
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                  ⚠ Caution / 中等风险
                </span>
              </div>
              <h4 className="font-semibold text-slate-800 text-sm mb-3">Clause: Cleaning Fee / 清洁费条款</h4>
              <p className="text-sm text-slate-600 italic mb-4 line-clamp-3 border-l-2 border-slate-200 pl-3">
                "Tenant agrees to return the property in the same condition or pay a $200 minimum cleaning fee if professional cleaning is required."
              </p>
              <div className="bg-slate-50 p-3 rounded-lg mb-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-800">中文解释：</span>本条款允许房东在认定需要"专业清洁"时向你收取至少 200 美元的清洁费，标准比较模糊。
                </p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border-l-4 border-emerald-400">
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">💡 建议：</span>可以要求写明只针对超出正常磨损的严重脏污，并按实际发票或合理市场价格收费。
                </p>
              </div>
            </div>

            {/* Card 3 - Early Termination */}
            <div className="bg-white p-6 rounded-2xl border-2 border-rose-300 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                  ⛔ High Risk / 高风险
                </span>
              </div>
              <h4 className="font-semibold text-slate-800 text-sm mb-3">Clause: Early Termination / 提前解约条款</h4>
              <p className="text-sm text-slate-600 italic mb-4 line-clamp-3 border-l-2 border-slate-200 pl-3">
                "If Tenant terminates the lease early, Tenant shall remain liable for all rent due until the end of the lease term, plus an additional penalty of one month's rent."
              </p>
              <div className="bg-slate-50 p-3 rounded-lg mb-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-800">中文解释：</span>如果你提前退租，不仅要继续承担剩余合同期内的全部房租，还要额外多付一整个月房租作为违约金，成本非常高。
                </p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border-l-4 border-emerald-400">
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">💡 建议：</span>可以尝试谈判，将责任限制为支付一定上限（例如最多 2 个月房租），或在找到新租客后停止计费。
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <p className="text-slate-600 mb-2">
              {lang === 'zh'
                ? '系统会自动从整份租约中挑出最重要的大约 10–20 条条款，帮你优先看清真正可能踩坑的地方。'
                : 'The AI analyzes your entire lease and surfaces roughly 10–20 of the most important clauses so you can focus on real risks first.'}
            </p>
            <p className="text-sm text-slate-500">
              {lang === 'zh'
                ? '📤 在页面顶部上传租约即可生成属于你的完整报告。'
                : '📤 Upload your lease at the top of the page to generate your own full report.'}
            </p>
          </div>
        </div>
      </section>

      {/* How the Report Works */}
      <section id="how-it-works" className="py-32 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{lang === 'zh' ? '它能帮你做什么？' : 'How the Report Works'}</h2>
            <p className="max-w-2xl mx-auto text-lg text-slate-500 font-medium leading-relaxed">
              {lang === 'zh' ? '上传合同，AI 会重点审查这些条款，然后给你一份中文报告' : 'We provide clear, actionable intelligence to protect your rights as a tenant.'}
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {lang === 'zh' ? '完整租约分析' : 'Full Lease Analysis'} ($9.90)
              </h3>
              <p className="text-gray-600 mb-6">
                {lang === 'zh'
                  ? '上传整份租约，AI 会逐条分析并生成中文风险报告，包含每条的风险等级、白话解释和谈判建议。'
                  : 'Upload your lease and get a clause-by-clause breakdown with risk scoring and negotiation suggestions.'}
              </p>
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
                <h4 className="font-semibold text-indigo-900 mb-4">
                  {lang === 'zh' ? '包含内容：' : 'What\'s included:'}
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      {lang === 'zh'
                        ? '整份租约的逐条分析（约 10–20 条重点条款）'
                        : 'Clause-by-clause analysis of your entire lease (~10-20 key clauses)'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      {lang === 'zh'
                        ? '每条的风险等级评估（安全 / 中等 / 高风险）'
                        : 'Risk level for each clause (Safe / Caution / High Risk)'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      {lang === 'zh'
                        ? '中文白话解释，让你真正看懂每条意味着什么'
                        : 'Plain-language explanations so you understand what each clause means'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      {lang === 'zh'
                        ? '可直接复制给房东的谈判建议'
                        : 'Negotiation suggestions you can share with your landlord'}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      {lang === 'zh'
                        ? '30 天内可分析最多 5 份租约'
                        : 'Up to 5 lease analyses within 30 days'}
                    </span>
                  </li>
                </ul>
              </div>
              
              <div className="text-center">
                <p className="text-slate-600">
                  {lang === 'zh'
                    ? '📤 在页面顶部上传租约即可立即开始完整分析。'
                    : '📤 Upload your lease at the top of the page to start a full analysis.'}
                </p>
              </div>
            </div>
          </div>
          <div className="text-center mt-12">
            <button 
              onClick={() => scrollToSection('pricing')}
              className="text-[#4F46E5] font-bold flex items-center mx-auto hover:gap-3 transition-all text-sm uppercase tracking-widest"
            >
              {lang === 'zh' ? '查看完整定价详情' : 'See Full Pricing Details'} <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose QiYoga */}
      <section className="py-24 bg-white no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{lang === 'zh' ? '为什么不直接用翻译软件？' : 'Why Choose AI-Powered Analysis?'}</h2>
            <p className="text-xl text-slate-600">{lang === 'zh' ? '翻译软件 vs 租房合同 AI' : 'See how we compare to traditional methods'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-slate-200">
              <div className="bg-rose-50 px-6 py-4">
                <h3 className="text-xl font-bold text-slate-900">{lang === 'zh' ? '翻译软件' : 'Without QiYoga'}</h3>
              </div>
              <div className="bg-green-50 px-6 py-4">
                <h3 className="text-xl font-bold text-slate-900">{lang === 'zh' ? '租房合同 AI' : 'With QiYoga'}</h3>
              </div>
            </div>

            {/* Table Rows */}
            {(
              lang === 'zh' 
              ? [
                  {
                    without: "逐字翻译，看不出哪里有问题",
                    with: "专门分析租房合同，知道哪些条款容易藏雷"
                  },
                  {
                    without: "翻完还是一头雾水，不知重点在哪",
                    with: "直接指出：这份合同风险最大的地方是哪里"
                  },
                  {
                    without: "法律术语翻得晦涩难懂",
                    with: "用大白话解释，让你真正看明白"
                  }
                ]
              : [
                  {
                    without: "Spend 2-3 hours reading fine print",
                    with: "Get results in 10 seconds"
                  },
                  {
                    without: "Easy to miss hidden red flags",
                    with: "AI scans every clause automatically"
                  },
                  {
                    without: "Hire a lawyer for $200-500",
                    with: "Pay only $9.90 for unlimited access"
                  },
                  {
                    without: "No guidance on what to negotiate",
                    with: "Get specific suggestions for every issue"
                  },
                  {
                    without: "Sign lease and hope for the best",
                    with: "Know exactly what you're agreeing to"
                  },
                  {
                    without: "Discover problems after moving in",
                    with: "Catch unfair terms before signing"
                  }
                ]
            ).map((item, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 md:grid-cols-2 border-b border-slate-100 last:border-b-0`}
              >
                {/* Left Column */}
                <div className="bg-rose-50/30 px-6 py-5 flex items-start gap-3">
                  <X className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600 leading-relaxed">{item.without}</span>
                </div>

                {/* Right Column */}
                <div className="bg-green-50/30 px-6 py-5 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-900 font-semibold leading-relaxed">{item.with}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">{lang === 'zh' ? '简单透明的定价' : 'Simple, Transparent Pricing'}</h2>
            <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium leading-relaxed">
              {lang === 'zh' ? '30 天内最多分析 5 份租约，无隐藏费用' : '30-day pass. Full analysis. No hidden fees.'}
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-indigo-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  {lang === 'zh' ? '最划算' : 'Best Value'}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {lang === 'zh' ? '30 天套餐' : '30-Day Moving Pack'}
              </h3>

              <div className="mb-4">
                <span className="text-5xl font-bold text-indigo-600">$9.90</span>
                <span className="text-gray-600 ml-2">{lang === 'zh' ? '一次性付费' : 'one-time payment'}</span>
              </div>

              <p className="text-center text-gray-700 font-medium mb-4">
                {lang === 'zh' ? '30 天内最多分析 5 份租约' : 'Up to 5 full lease reviews in 30 days.'}
              </p>

              <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">💰 {lang === 'zh' ? '对比其他方案：' : 'Compare to alternatives:'}</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>❌ {lang === 'zh' ? '律师审核：$150-300 / 份' : 'Lawyer review: $150-300 per lease'}</li>
                  <li>❌ LegalZoom: $79 {lang === 'zh' ? '/ 份' : 'per document'}</li>
                  <li>✅ QiYoga: $9.90 {lang === 'zh' ? '/ 30 天' : 'for 30 days'}</li>
                </ul>
              </div>

              <ul className="space-y-4 mb-6">
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{lang === 'zh' ? '30 天内最多分析 5 份租约' : 'Analyze up to 5 leases within 30 days'}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{lang === 'zh' ? 'AI 逐条分析每个条款' : 'Full AI review of every clause'}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{lang === 'zh' ? '整体风险评分 + 风险条款清单' : 'Overall risk score + red‑flag list'}</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{lang === 'zh' ? '可复制给房东的谈判建议' : 'Negotiation questions to ask your landlord'}</span>
                </li>
              </ul>

              <p className="text-sm text-center text-gray-500 mb-4">
                💡 {lang === 'zh' ? '用户平均在签约前分析 4 份租约' : 'Average user analyzes 4 leases before signing'}
              </p>

              {hasFullAccess ? (
                <button
                  onClick={() => scrollToSection('analyze')}
                  className="w-full py-4 bg-gray-300 text-gray-600 rounded-xl font-bold text-lg cursor-not-allowed"
                  disabled
                >
                  {lang === 'zh' ? '已获得完整权限 ✓' : 'You Have Full Access ✓'}
                </button>
              ) : (
                <button
                  onClick={() => handleOpenCheckout()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  {lang === 'zh' ? '立即开始 — 解锁完整报告' : 'Get started – Unlock full lease reports'}
                  Get started – Unlock full lease reports
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50 no-print">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{lang === 'zh' ? '常见问题' : 'Frequently Asked Questions'}</h2>
            <p className="text-lg text-slate-600">{lang === 'zh' ? '关于租房合同分析工具的常见疑问' : 'Everything you need to know about QiYoga Studio'}</p>
          </div>

          <div className="space-y-4">
            {/* Q1 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-all"
              >
                <span className="font-semibold text-slate-900 text-lg">{lang === 'zh' ? '会保存我的合同吗？' : 'Is my lease data secure?'}</span>
                {openFaq === 1 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 1 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    {lang === 'zh' 
                      ? '不会。合同只用于本次分析，处理完立即删除。我们不存储、不共享、不出售你的合同，也不会用于训练模型。' 
                      : 'Absolutely. Your lease is processed securely and never shared with third parties. We use bank-level encryption (AES-256) and delete your document within 30 days after analysis. We\'re GDPR and CCPA compliant. Your privacy is our top priority.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Q2 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-all"
              >
                <span className="font-semibold text-slate-900 text-lg">{lang === 'zh' ? '这算法律意见 (legal advice) 吗？' : 'What if AI misses something?'}</span>
                {openFaq === 2 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 2 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    {lang === 'zh' 
                      ? '不算。这是一个帮你理解合同的工具，不构成法律意见。遇到实际纠纷或需要法律判断时，请咨询当地持牌律师。' 
                      : 'Our AI is trained on thousands of lease agreements and continuously improving. However, we recommend using our analysis as a helpful guide, not a replacement for legal advice. If you find any errors, contact us at support@qiyoga.xyz and we\'ll review it manually at no extra cost.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Q3 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-all"
              >
                <span className="font-semibold text-slate-900 text-lg">{lang === 'zh' ? '支持哪些州？' : 'Can I get a refund?'}</span>
                {openFaq === 3 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 3 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    {lang === 'zh' 
                      ? '美国 50 州的常见住宅租约都支持，部分州会额外提示当地法规。' 
                      : 'Yes! We offer a 7-day money-back guarantee. If you\'re not satisfied with analysis for any reason, email us within 7 days of purchase for a full refund, no questions asked.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Q4 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(4)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-all"
              >
                <span className="font-semibold text-slate-900 text-lg">{lang === 'zh' ? '分析一定准确吗？' : 'How accurate is analysis?'}</span>
                {openFaq === 4 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 4 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    {lang === 'zh' 
                      ? 'AI 会尽力分析，但无法保证 100% 准确。建议你结合自己的情况判断，重要合同最好再找人工复核一遍。' 
                      : 'Our AI has been trained on 10,000+ residential lease agreements and achieves 94% accuracy in identifying problematic clauses. We use same natural language processing technology trusted by law firms. That said, for complex commercial leases or unusual situations, we recommend consulting a lawyer.'}
                  </p>
                </div>
              </div>
            </div>

             {lang === 'en' && (
              <>
                {/* Q5 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => toggleFaq(5)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-all"
                  >
                    <span className="font-semibold text-slate-900 text-lg">Do you share my data with landlords or brokers?</span>
                    {openFaq === 5 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 5 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6">
                      <p className="text-slate-600 leading-relaxed">
                        Never. Your lease analysis is 100% confidential. We don't sell, share, or monetize your data. We're on YOUR side as a tenant, not the landlord's.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Q6 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => toggleFaq(6)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-all"
                  >
                    <span className="font-semibold text-slate-900 text-lg">How long does my $9.90 plan stay active?</span>
                    {openFaq === 6 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 6 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6">
                      <p className="text-slate-600 leading-relaxed">
                        Your access is valid for 30 days from the date of purchase. During that time, you can upload and analyze up to 5 leases. After 30 days, your access expires, and you can purchase another 30‑day pack if you need more reviews.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
           </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="py-24 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{lang === 'zh' ? '用户评价' : 'What Renters Say About Us'}</h2>
            <p className="text-xl text-slate-600">{lang === 'zh' ? '已为上千份租约生成风险分析报告' : 'Join 2,000+ tenants who avoided unfair lease terms'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="flex items-center mb-4">
                <img
                  src="https://ui-avatars.com/api/?name=Michael+Chen&background=4F46E5&color=fff"
                  alt="Michael Chen"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-bold text-slate-900">Michael Chen</p>
                  <p className="text-sm text-slate-500">Manhattan</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                <span className="text-amber-400 text-xl">★★★★★</span>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                "I was about to sign a lease that made me pay for ALL building repairs, even structural issues. QiYoga's AI caught it in 20 seconds. I negotiated it out and probably saved $5,000+. Worth every penny."
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="flex items-center mb-4">
                <img
                  src="https://ui-avatars.com/api/?name=Jessica+R&background=4F46E5&color=fff"
                  alt="Jessica R."
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-bold text-slate-900">Jessica R.</p>
                  <p className="text-sm text-slate-500">Queens</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                <span className="text-amber-400 text-xl">★★★★★</span>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                "The landlord tried to sneak in a clause where he could enter 'at any time without notice.' I had no idea that was illegal in NY. QiYoga flagged it immediately and gave me the exact legal code to cite. Lease got fixed before I signed."
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="flex items-center mb-4">
                <img
                  src="https://ui-avatars.com/api/?name=David+Park&background=4F46E5&color=fff"
                  alt="David Park"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-bold text-slate-900">David Park</p>
                  <p className="text-sm text-slate-500">Brooklyn</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                <span className="text-amber-400 text-xl">★★★★★</span>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                "I'm not a lawyer, but with QiYoga I felt like I had one. It found 3 major red flags in my lease, including an unfair late fee structure. I showed the report to my landlord and got better terms. Best $10 I ever spent."
              </p>
            </div>

            {/* Card 4 - Chinese Student */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="flex items-center mb-4">
                <img
                  src="https://ui-avatars.com/api/?name=Li+Jing&background=059669&color=fff"
                  alt="Li Jing"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-bold text-slate-900">Li Jing (李静)</p>
                  <p className="text-sm text-slate-500">Boston · F-1 Student</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                <span className="text-amber-400 text-xl">★★★★★</span>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                {lang === 'zh'
                  ? '作为刚来美国的留学生，16页的英文租约让我很头疼。QiYoga帮我找出了5个高风险条款，包括提前解约要罚两个月房租。我用中文解释和谈判建议去跟房东沟通，最后成功改掉了最不合理的那几条。'
                  : 'As a new F-1 student, the 16-page English lease was overwhelming. QiYoga found 5 high-risk clauses, including a 2-month penalty for early termination. I used the Chinese explanations to negotiate, and the landlord agreed to fix the worst terms.'}
              </p>
            </div>

            {/* Card 5 - Chinese Student */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="flex items-center mb-4">
                <img
                  src="https://ui-avatars.com/api/?name=Wang+Yiming&background=DC2626&color=fff"
                  alt="Wang Yiming"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-bold text-slate-900">Wang Yiming (王一鸣)</p>
                  <p className="text-sm text-slate-500">San Francisco · Masters Student</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                <span className="text-amber-400 text-xl">★★★★★</span>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                {lang === 'zh'
                  ? '第一次在美国租房，完全不知道清洁费可以无上限扣。QiYoga的分析报告让我看到这条隐藏的陷阱，还有自动续约条款。最后我和房东协商把清洁费改成$200封顶，自动续约也改成需要双方确认。'
                  : 'First time renting in the US, I had no idea cleaning fees could be unlimited. QiYoga revealed this hidden trap, plus an auto-renewal clause. I negotiated a $200 cleaning fee cap and got the auto-renewal changed to require mutual consent.'}
              </p>
            </div>

            {/* Card 6 - Chinese Student */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="flex items-center mb-4">
                <img
                  src="https://ui-avatars.com/api/?name=Zhang+Yuxin&background=7C3AED&color=fff"
                  alt="Zhang Yuxin"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-bold text-slate-900">Zhang Yuxin (张雨欣)</p>
                  <p className="text-sm text-slate-500">Seattle · PhD Student</p>
                </div>
              </div>
              <div className="flex items-center mb-4">
                <span className="text-amber-400 text-xl">★★★★★</span>
              </div>
              <p className="text-slate-600 italic leading-relaxed">
                {lang === 'zh'
                  ? '租房中介说合同是"标准模板"不用看，幸好我还是用了QiYoga。结果发现押金退还条件特别苛刻，还有一条要求我承担所有水管维修费用。报告里的中文建议特别实用，帮我省了很多麻烦。'
                  : 'The agent said the lease was a "standard template" I didn\'t need to read. Luckily I still used QiYoga. It found harsh deposit return conditions and a clause making me responsible for ALL plumbing repairs. The Chinese suggestions were incredibly practical and saved me so much trouble.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Need Assistance */}
      <section id="contact" className="py-32 bg-[#F8FAFC] no-print">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white p-16 rounded-[3rem] border border-slate-100 text-center shadow-xl shadow-slate-200/50">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-6">{lang === 'zh' ? '需要帮助？' : 'Need Assistance?'}</h2>
            <p className="text-slate-500 text-lg font-medium mb-12">{lang === 'zh' ? '有任何问题，欢迎联系我们的支持团队' : 'Reach out to our team for questions about your report or our digital consulting.'}</p>
            <div className="flex justify-center">
              <a href="mailto:support@qiyoga.vip" className="inline-flex items-center space-x-4 bg-slate-50 px-10 py-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                <Mail className="h-6 w-6 text-[#4F46E5] group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-slate-800 text-lg">support@qiyoga.vip</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
