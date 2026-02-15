
import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold mb-8 text-slate-900">Privacy Policy</h1>
      <div className="prose prose-indigo max-w-none text-slate-600 space-y-6">
        <p className="text-lg font-medium text-slate-900 italic">Effective Date: January 1, 2025</p>
        
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Data Collection</h2>
          <p>
            We collect data necessary to provide our digital consulting services, including rental agreements you upload for analysis and your email address for account management and support.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Document Privacy</h2>
          <p>
            Documents uploaded to LeaseGuard AI are processed purely to generate the informational reports you request. We do not sell your personal documents or data to third parties. Our AI processing is fully automated, and no data is stored permanently beyond the session required for analysis.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Payment Processing</h2>
          <p>
            Payment processing is handled securely by Paddle (Merchant of Record). QiYoga Studio does not store your credit card details or sensitive payment information on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Contact & Support</h2>
          <p>
            You may request the deletion of your account and associated data by contacting our support team at <span className="font-semibold text-indigo-600">support@qiyoga.vip</span>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
