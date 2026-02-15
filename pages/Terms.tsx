
import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold mb-8 text-slate-900">Terms of Service</h1>
      <div className="prose prose-indigo max-w-none text-slate-600 space-y-6">
        <p className="text-lg font-medium text-slate-900 italic">Effective Date: January 1, 2025</p>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
          <p className="font-bold text-slate-900">
            These Terms of Service are between LIU QING, operating as QiYoga Studio, and users of qiyoga.xyz.
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Business Entity</h2>
          <p>
            These Terms and Conditions are entered into by and between LIU QING (“QiYoga Studio”) and customers of qiyoga.xyz. QiYoga Studio is an independent software publisher providing web-based AI tools and online consulting services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Online Consultation Services</h2>
          <p>
            qiyoga.xyz is a website for an online consulting service that helps U.S. tenants review and understand their rental agreements. Customers can book a consultation and receive written explanations of their lease terms. <strong>All services are delivered online; no physical goods are involved.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Not Legal Advice</h2>
          <p>
            LeaseGuard AI and associated consulting reports are for informational and educational purposes only. We are not a law firm, and our staff are not acting as your attorneys. Our tools do not constitute legal advice. For legal representation or advice on a specific legal matter, you should consult with a qualified attorney in your jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Use of AI Technology</h2>
          <p>
            Our services utilize Large Language Models (LLMs) to analyze documents. While we aim for high accuracy, AI can occasionally generate interpretations that are incorrect or contextually incomplete. Users are responsible for verifying all outputs against the original document text.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Service Delivery</h2>
          <p>
            Services are delivered immediately upon completion of the analysis through a browser-based dashboard or via email. QiYoga Studio is responsible for delivering the digital service and providing customer support at <span className="font-semibold">support@qiyoga.vip</span>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Payment Processing</h2>
          <p>
            Payments are processed securely by our partner and Merchant of Record, Paddle. By purchasing a service, you agree to the payment terms provided by Paddle at checkout.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Governing Law</h2>
          <p>
            These terms are governed by the laws of the jurisdiction in which the operator resides, without regard to its conflict of law principles.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
