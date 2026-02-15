
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Mail, FileUp, Clock } from 'lucide-react';

const Success: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Payment Successful – Next Steps</h1>
        <p className="text-slate-600 mb-6 text-lg">
          Thank you for your order. Your lease review request has been received.
        </p>
        
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-10 text-left">
          <p className="text-slate-700 font-medium mb-4">
            You’ll receive a payment receipt from Paddle in your email inbox within a few minutes. Please keep it for your records.
          </p>
          
          <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">What happens next?</h3>
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="bg-indigo-100 p-2 rounded-lg mr-4 mt-0.5">
                <Mail className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">1. Check your inbox</p>
                <p className="text-sm text-slate-500">Look for an automated confirmation from support@qiyoga.vip.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-indigo-100 p-2 rounded-lg mr-4 mt-0.5">
                <FileUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">2. Secure document submission</p>
                <p className="text-sm text-slate-500">If you haven't uploaded your lease yet, follow the link in your email or reply to us with the PDF attached.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-indigo-100 p-2 rounded-lg mr-4 mt-0.5">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">3. Expert audit processing</p>
                <p className="text-sm text-slate-500">Our team and AI will analyze your lease. Your report will be delivered within 24 hours (priority) or 48 hours (standard).</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <Link 
            to="/" 
            className="w-full inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Back to Home
          </Link>
          
          <p className="text-xs text-slate-400 pt-4">
            Having trouble? Reach out to our 24/7 support at <span className="font-semibold">support@qiyoga.vip</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Success;
