/**
 * Paddle Payment Success Page
 * 
 * This page handles:
 * 1. Verifying payment via URL parameters
 * 2. Displaying success message
 * 3. Showing access status
 * 4. Providing next steps
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Home, Loader2, AlertCircle, CreditCard, Calendar, Clock, FileCheck } from 'lucide-react';
import { API_ENDPOINTS } from '../src/config/api';

interface AccessStatus {
  has_access: boolean;
  expires_at?: string;
  days_remaining?: number;
  analyses_count?: number;
  message?: string;
}

const BillingSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = searchParams.get('user_id');

  useEffect(() => {
    if (!userId) {
      setError('Missing user_id parameter');
      setIsLoading(false);
      return;
    }

    // Check access status after payment
    const checkAccess = async () => {
      try {
        // Poll for a moment to ensure webhook has been processed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await fetch(API_ENDPOINTS.billingCheckAccess(userId));
        const data: AccessStatus = await response.json();

        setAccessStatus(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to check access status:', err);
        setError('Failed to verify payment. Please contact support if the issue persists.');
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-6 py-12">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-indigo-600 mx-auto mb-6" />
          <p className="text-xl text-slate-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-12 text-center">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Payment Verification Failed</h1>
          <p className="text-slate-600 mb-8">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              <Home className="h-5 w-5 mr-2" />
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-12 text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            🎉 Payment Successful!
          </h1>
          <p className="text-xl text-slate-600">
            Your <strong>30-day unlimited access</strong> is now active.
          </p>
        </div>

        {accessStatus && accessStatus.has_access && (
          <div className="bg-indigo-50 rounded-xl p-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Access Status:</span>
                <span className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">Active</span>
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Expires On:</span>
                <span className="font-semibold text-slate-900">
                  {accessStatus.expires_at ? new Date(accessStatus.expires_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }) : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Days Remaining:</span>
                <span className="font-bold text-slate-900">
                  {accessStatus.days_remaining || 0} days
                </span>
              </div>
            </div>
          </div>
        )}

        {accessStatus && !accessStatus.has_access && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-1 flex-shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-amber-800 mb-2">Access Not Active</p>
                <p className="text-amber-700 text-sm">
                  {accessStatus.message || 'There was an issue activating your access. Please contact support.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Section */}
        <div className="bg-slate-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">What You Can Do Now:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
              <FileCheck className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Unlimited Lease Analysis</p>
                <p className="text-sm text-slate-600">Analyze as many leases as you need</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Full Clause Breakdown</p>
                <p className="text-sm text-slate-600">See all 15-20 clauses analyzed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">30-Day Validity</p>
                <p className="text-sm text-slate-600">Access valid for 30 days from purchase</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Risk Scoring</p>
                <p className="text-sm text-slate-600">Get red flags and suggestions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Section */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
          <p className="text-indigo-800 text-center">
            <span className="font-bold">💡 Pro Tip:</span> Bookmark this page so you can easily return to analyze more leases within your 30-day access period.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Home className="h-5 w-5" />
            Analyze Another Lease
          </button>
          
          <button
            onClick={() => {
              // In a real app, navigate to order history page
              console.log('Navigate to order history');
            }}
            className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="h-5 w-5" />
            View Order History
          </button>
        </div>

        {/* Support Section */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-slate-600 text-center mb-4">
            Need help? Contact our support team.
          </p>
          <a
            href="mailto:support@qiyoga.xyz"
            className="inline-flex items-center gap-2 bg-slate-50 px-6 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
          >
            <span className="font-bold text-slate-800">support@qiyoga.xyz</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default BillingSuccess;
