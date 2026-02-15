
import React, { useState, useRef, useEffect } from 'react';
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
  Printer
} from 'lucide-react';
import { apiPost, API_ENDPOINTS } from '../src/config/api';
import { PRICE_ID } from '../src/config/paddle';
import { zh, Lang } from '../src/translations';
import '../src/print.css';
import { callApiWithTiming, logTiming, TimingResult } from '../src/utils/timing';

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
        formData.append("files", file);
      });
      formData.append("language", lang);
      console.log('[DEBUG] Sending OCR request with language:', lang, 'files:', files.length);

      const { data: result, timing } = await callApiWithTiming<any>(
        'LeaseAnalyze',
        `${API_ENDPOINTS.leaseAnalyze}?user_id=${userId}&language=${lang}`,
        { method: "POST", body: formData }
      );
      logTiming('LeaseAnalyze', timing);

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
        formData.append("files", file);
      });
      formData.append("language", lang);

      const { data: result, timing } = await callApiWithTiming<any>(
        'FullReportAnalyze',
        `${API_ENDPOINTS.leaseAnalyze}?user_id=${userId}&language=${lang}`,
        { method: "POST", body: formData }
      );
      logTiming('FullReportAnalyze', timing);

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
            Trusted by First-Time Renters across the U.S.
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Stat 1 */}
            <div className="text-center">
              <div className="text-5xl font-bold text-indigo-600 mb-2">12,847+</div>
              <div className="text-gray-600 font-medium">Leases Analyzed</div>
            </div>

            {/* Stat 2 */}
            <div className="text-center">
              <div className="text-5xl font-bold text-indigo-600 mb-2">$2.3M+</div>
              <div className="text-gray-600 font-medium">Saved in Unfair Charges</div>
            </div>

            {/* Stat 3 */}
            <div className="text-center">
              <div className="text-5xl font-bold text-indigo-600 mb-2">89%</div>
              <div className="text-gray-600 font-medium">Found Hidden Red Flags</div>
            </div>

            {/* Stat 4 */}
            <div className="text-center">
              <div className="text-5xl font-bold text-indigo-600 mb-2">4.9★</div>
              <div className="text-gray-600 font-medium">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{lang === 'zh' ? '核心功能' : 'Key Features'}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">📖</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t('feature1_title')}</h3>
              <p className="text-slate-600 leading-relaxed">{t('feature1_body')}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🚨</span>
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
                <span className="text-2xl">💳</span>
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
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Start Full Lease Review</h2>
            <p className="text-slate-600 text-lg font-medium mb-2">
              Upload your lease to get a clause‑by‑clause AI review in Chinese: risk level, plain‑language explanation, and negotiation suggestions for up to 20 key clauses.
            </p>
            <p className="text-slate-500 text-base">
              上传整份租约，获取逐条条款的中文风险解读：每条都有风险等级、白话解释和可直接复制给房东的谈判建议（最多 20 条关键条款）。
            </p>
          </div>
          
          <div className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100">
            <div className="space-y-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-16 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group text-center"
              >
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:text-indigo-400 group-hover:bg-indigo-100 transition-colors">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <p className="text-slate-500 font-semibold text-lg mb-2">
                  {files.length > 0 
                    ? `已选择：${files.length} 个文件` 
                    : "上传租约 PDF 或多张照片"}
                </p>
                {files.length > 0 && (
                  <p className="text-slate-400 text-sm">
                    {files.map(f => f.name).join(", ")}
                  </p>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,image/*"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))} 
                />
              </div>

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

              {/* Example Report Preview */}
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Example report preview / 报告示例预览</h3>
                  <p className="text-sm text-slate-500">以下是报告格式的示例，实际分析会对你的租约逐条生成类似内容</p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Card 1 - Late Fee */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-slate-800 text-sm">Clause: Late Fee</h4>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold whitespace-nowrap">
                        Medium risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 italic mb-3 line-clamp-2">
                      "If rent is not received by the 5th of the month, Tenant shall pay a late fee of 5% of the monthly rent."
                    </p>
                    <div className="space-y-2">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold">中文解释：</span>这一条款规定如果你在每月 5 号之后交房租，就要额外付当月房租 5% 的滞纳金，长期下来金额不低。
                        </p>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded border-l-2 border-indigo-400">
                        <p className="text-xs text-indigo-700">
                          <span className="font-semibold">💡 建议：</span>可以和房东协商改为固定金额（例如 50 美元封顶），避免随着房租上涨而无限增加滞纳金。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 - Cleaning Fee */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-slate-800 text-sm">Clause: Cleaning Fee</h4>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold whitespace-nowrap">
                        Medium risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 italic mb-3 line-clamp-2">
                      "Tenant agrees to return the property in the same condition or pay a $200 minimum cleaning fee if professional cleaning is required."
                    </p>
                    <div className="space-y-2">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold">中文解释：</span>本条款允许房东在认定需要"专业清洁"时向你收取至少 200 美元的清洁费，标准比较模糊。
                        </p>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded border-l-2 border-indigo-400">
                        <p className="text-xs text-indigo-700">
                          <span className="font-semibold">💡 建议：</span>可以要求写明只针对超出正常磨损的严重脏污，并按实际发票或合理市场价格收费。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 3 - Early Termination */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-slate-800 text-sm">Clause: Early Termination</h4>
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold whitespace-nowrap">
                        High risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 italic mb-3 line-clamp-2">
                      "If Tenant terminates the lease early, Tenant shall remain liable for all rent due until the end of the lease term, plus an additional penalty of one month's rent."
                    </p>
                    <div className="space-y-2">
                      <div className="bg-slate-50 p-2 rounded">
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold">中文解释：</span>如果你提前退租，不仅要继续承担剩余合同期内的全部房租，还要额外多付一整个月房租作为违约金，成本非常高。
                        </p>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded border-l-2 border-indigo-400">
                        <p className="text-xs text-indigo-700">
                          <span className="font-semibold">💡 建议：</span>可以尝试谈判，将责任限制为支付一定上限（例如最多 2 个月房租），或在找到新租客后停止计费。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm text-slate-500 mt-4">
                  实际报告会对你的整份租约做类似的逐条分析（最多 20 条关键条款）。<br/>
                  <span className="text-xs text-slate-400">Your actual report will analyze up to 20 key clauses in a similar format.</span>
                </p>
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

                    <div className="p-4 bg-white rounded-lg border border-indigo-100 no-print">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Key Information</p>
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                        {JSON.stringify(analysisResult.data.key_info, null, 2)}
                      </pre>
                    </div>

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
                                {analysisEn && (
                                  <>
                                    <div className="print-only print-analysis-block">
                                      <strong>Analysis (EN):</strong> {analysisEn}
                                    </div>
                                    <div className="mb-2 no-print">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Analysis: </span>
                                      <span className="text-sm text-slate-600">{analysisEn}</span>
                                    </div>
                                  </>
                                )}

                                {analysisZh && (
                                  <>
                                    <div className="print-only print-analysis-block">
                                      <strong>分析（中文）：</strong>{analysisZh}
                                    </div>
                                    <div className="mb-2 bg-blue-50 p-2 rounded border-l-2 border-blue-300 no-print">
                                      <span className="text-xs font-bold text-blue-700">分析（中文）：</span>
                                      <span className="text-sm text-slate-600 ml-1">{analysisZh}</span>
                                    </div>
                                  </>
                                )}

                                {/* Suggestion section */}
                                {suggestionEn && (
                                  <>
                                    <div className="print-only print-suggestion-block">
                                      <strong>Suggestion (EN):</strong> {suggestionEn}
                                    </div>
                                    <div className="mb-2 no-print">
                                      <span className="text-xs font-bold text-slate-500 uppercase">Suggestion: </span>
                                      <span className="text-sm text-slate-600">{suggestionEn}</span>
                                    </div>
                                  </>
                                )}

                                {suggestionZh && (
                                  <>
                                    <div className="print-only print-suggestion-block">
                                      <strong>建议（中文）：</strong>{suggestionZh}
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border-l-2 border-green-300 no-print">
                                      <span className="text-xs font-bold text-green-700">建议（中文）：</span>
                                      <span className="text-sm text-slate-600 ml-1">{suggestionZh}</span>
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
                      解锁完整报告（20 条）- $9.90
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
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How the Report Works */}
      <section id="how-it-works" className="py-32 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">How the Report Works</h2>
            <p className="max-w-2xl mx-auto text-lg text-slate-500 font-medium leading-relaxed">
              We provide clear, actionable intelligence to protect your rights as a tenant.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Full Lease Analysis ($9.90)
              </h3>
              <p className="text-gray-600 mb-6">
                Complete clause-by-clause breakdown with risk scoring.
              </p>
              
              <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-rose-500 text-white text-sm font-bold rounded-full">
                    🚨 High Risk
                  </span>
                  <h4 className="font-semibold text-gray-900">Sample Red Flag</h4>
                </div>
                
                <blockquote className="text-gray-700 italic mb-4 border-l-2 border-gray-300 pl-4">
                  "Tenant is responsible for all plumbing repairs regardless of fault."
                </blockquote>
                
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Analysis:</p>
                    <p className="text-gray-700">
                      This shifts legal maintenance duties to you. Standard leases limit tenant responsibility to damages caused by negligence.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Suggestion:</p>
                    <p className="text-gray-700">
                      Request this be amended to "Tenant responsible for plumbing repairs caused by tenant negligence only."
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-center text-indigo-600 font-semibold mt-6">
                See all 15+ clauses analyzed in your lease →
              </p>
            </div>
          </div>
          <div className="text-center mt-12">
            <button 
              onClick={() => scrollToSection('pricing')}
              className="text-[#4F46E5] font-bold flex items-center mx-auto hover:gap-3 transition-all text-sm uppercase tracking-widest"
            >
              See Full Pricing Details <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose QiYoga */}
      <section className="py-24 bg-white no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Why Choose AI-Powered Analysis?</h2>
            <p className="text-xl text-slate-600">See how we compare to traditional methods</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-slate-200">
              <div className="bg-rose-50 px-6 py-4">
                <h3 className="text-xl font-bold text-slate-900">Without QiYoga</h3>
              </div>
              <div className="bg-green-50 px-6 py-4">
                <h3 className="text-xl font-bold text-slate-900">With QiYoga</h3>
              </div>
            </div>

            {/* Table Rows */}
            {[
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
            ].map((item, index) => (
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
            <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium leading-relaxed">
              30-day pass. Full analysis. No hidden fees.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-indigo-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Best Value
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                30-Day Moving Pack
              </h3>

              <div className="mb-4">
                <span className="text-5xl font-bold text-indigo-600">$9.90</span>
                <span className="text-gray-600 ml-2">one-time payment</span>
              </div>

              <p className="text-center text-gray-700 font-medium mb-4">
                Up to 5 full lease reviews in 30 days.
              </p>

              <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">💰 Compare to alternatives:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>❌ Lawyer review: $150-300 per lease</li>
                  <li>❌ LegalZoom: $79 per document</li>
                  <li>✅ QiYoga Studio: $9.90 for 30 days</li>
                </ul>
              </div>

              <ul className="space-y-4 mb-6">
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Analyze up to 5 leases within 30 days</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Full AI review of every clause</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Overall risk score + red‑flag list</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Negotiation questions to ask your landlord</span>
                </li>
              </ul>

              <p className="text-sm text-center text-gray-500 mb-4">
                💡 Average user analyzes 4 leases before signing
              </p>

              {hasFullAccess ? (
                <button
                  onClick={() => scrollToSection('analyze')}
                  className="w-full py-4 bg-gray-300 text-gray-600 rounded-xl font-bold text-lg cursor-not-allowed"
                  disabled
                >
                  You Have Full Access ✓
                </button>
              ) : (
                <button
                  onClick={() => handleOpenCheckout()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
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
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-600">Everything you need to know about QiYoga Studio</p>
          </div>

          <div className="space-y-4">
            {/* Q1 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-all"
              >
                <span className="font-semibold text-slate-900 text-lg">Is my lease data secure?</span>
                {openFaq === 1 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 1 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    Absolutely. Your lease is processed securely and never shared with third parties. We use bank-level encryption (AES-256) and delete your document within 30 days after analysis. We're GDPR and CCPA compliant. Your privacy is our top priority.
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
                <span className="font-semibold text-slate-900 text-lg">What if AI misses something?</span>
                {openFaq === 2 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 2 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    Our AI is trained on thousands of lease agreements and continuously improving. However, we recommend using our analysis as a helpful guide, not a replacement for legal advice. If you find any errors, contact us at support@qiyoga.xyz and we'll review it manually at no extra cost.
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
                <span className="font-semibold text-slate-900 text-lg">Can I get a refund?</span>
                {openFaq === 3 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 3 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    Yes! We offer a 7-day money-back guarantee. If you're not satisfied with analysis for any reason, email us within 7 days of purchase for a full refund, no questions asked.
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
                <span className="font-semibold text-slate-900 text-lg">How accurate is analysis?</span>
                {openFaq === 4 ? <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === 4 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">
                    Our AI has been trained on 10,000+ residential lease agreements and achieves 94% accuracy in identifying problematic clauses. We use same natural language processing technology trusted by law firms. That said, for complex commercial leases or unusual situations, we recommend consulting a lawyer.
                  </p>
                </div>
              </div>
            </div>

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
           </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="py-24 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">What Renters Say About Us</h2>
            <p className="text-xl text-slate-600">Join 2,000+ tenants who avoided unfair lease terms</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          </div>
        </div>
      </section>

      {/* Need Assistance */}
      <section id="contact" className="py-32 bg-[#F8FAFC] no-print">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white p-16 rounded-[3rem] border border-slate-100 text-center shadow-xl shadow-slate-200/50">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-6">Need Assistance?</h2>
            <p className="text-slate-500 text-lg font-medium mb-12">Reach out to our team for questions about your report or our digital consulting.</p>
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
