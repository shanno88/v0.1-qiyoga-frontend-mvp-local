import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Home, Loader2, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../src/config/api';

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [accessInfo, setAccessInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = searchParams.get('user_id');
    if (!userId) {
      navigate('/');
      return;
    }

    // 检查通行证状态
    fetch(API_ENDPOINTS.billingCheckAccess(userId))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAccessInfo(data);
        } else {
          setError("Failed to verify your payment status");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to verify payment. Please try again later.");
        setLoading(false);
      });
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-12 text-center">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Verification Failed</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-12 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎉 Payment Successful!
          </h1>
        </div>

        {accessInfo?.has_access && (
          <div className="bg-indigo-50 rounded-xl p-6 mb-8">
            <p className="text-lg text-gray-700 mb-4">
              Your <strong>30-day unlimited access</strong> is now active.
            </p>
            <p className="text-gray-600 mb-2">
              You can analyze unlimited leases before{' '}
              <strong>{new Date(accessInfo.expires_at).toLocaleDateString()}</strong>
            </p>
            <p className="text-sm text-gray-500">
              ({accessInfo.days_remaining} days remaining)
            </p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <p className="text-amber-800 font-medium mb-2">💡 Tip</p>
          <p className="text-amber-700 text-sm">
            Bookmark this page. You can return anytime within 30 days to analyze more leases.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-center gap-2">
            <Home className="h-5 w-5" />
            <span>Go Back to Upload</span>
          </div>
        </button>
      </div>
    </div>
  );
}
