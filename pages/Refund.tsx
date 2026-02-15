
import React from 'react';

const Refund: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold mb-8 text-slate-900">Refund Policy</h1>
      <div className="prose prose-indigo max-w-none text-slate-600 space-y-6">
        <p className="text-lg font-medium text-slate-900 italic">Effective Date: January 1, 2025</p>
        
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mb-8">
          <p className="text-indigo-900 font-medium">
            At QiYoga Studio, we want you to feel completely confident using our AI tools. We offer a clear and straightforward refund policy in line with our partnership with Paddle, our Merchant of Record.
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">14-Day Right of Withdrawal</h2>
          <p>
            You have the right to request a full refund for any reason within 14 days of your initial purchase or your first subscription payment. This "cooling-off period" ensures you have enough time to evaluate our service. You do not need to prove a technical failure to qualify for this refund. Simply contact our support team at <span className="font-semibold text-indigo-600">support@qiyoga.vip</span> within 14 days of your transaction, and we will initiate the process.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Post 14-Day Period</h2>
          <p>
            Once the initial 14-day window has passed, payments are generally non-refundable. At this stage, we do not offer prorated refunds or credits for partially used periods, except where specifically required by applicable local consumer laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Payment Processing</h2>
          <p>
            All payments and refunds are handled securely by Paddle, who acts as our Merchant of Record. This means they are responsible for the financial transaction and ensuring your refund is returned to your original payment method. Depending on your bank, it may take 5–10 business days for the credit to appear on your statement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
          <p>
            If you have any questions or would like to request a refund, please email us at <span className="font-semibold text-indigo-600">support@qiyoga.vip</span>. We are committed to responding to all inquiries within 24–48 hours.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Refund;
