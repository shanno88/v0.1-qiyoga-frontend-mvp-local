/**
 * Paddle Billing Integration - React Component
 * 
 * This component handles:
 * 1. Creating Paddle checkout sessions
 * 2. Redirecting to Paddle checkout
 * 3. Handling payment success/failure
 * 4. Displaying order history
 * 
 * Usage:
 *   <PaddleCheckout userId="session_abc123" />
 *   <OrderHistory userId="session_abc123" />
 */

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, X, AlertCircle, CreditCard, Clock } from 'lucide-react';
import { API_ENDPOINTS } from '../src/config/api';

// Type definitions
interface Transaction {
  id: string;
  paddle_transaction_id: string;
  user_id: string;
  product_id: string;
  price_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  customer_email?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface CheckoutResponse {
  success: boolean;
  checkout_url?: string;
  transaction_id?: string;
  error?: string;
}

interface OrderHistoryResponse {
  success: boolean;
  orders: Transaction[];
  total_count: number;
  error?: string;
}

interface AccessStatusResponse {
  success: boolean;
  has_access: boolean;
  expires_at?: string;
  days_remaining?: number;
  analyses_count?: number;
  message?: string;
}

// PaddleCheckout Component
export const PaddleCheckout: React.FC<{
  userId: string;
  email?: string;
  onPaymentComplete?: () => void;
}> = ({ userId, email, onPaymentComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.billingCheckoutCreate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email: email,
        }),
      });

      if (!response.ok) {
        const data: CheckoutResponse = await response.json();
        throw new Error(data.error || 'Failed to create checkout');
      }

      const data: CheckoutResponse = await response.json();

      if (data.success && data.checkout_url) {
        // Redirect to Paddle checkout
        setIsRedirecting(true);
        window.location.href = data.checkout_url;
      } else if (data.success && !data.checkout_url) {
        // User already has access
        alert('You already have 30-day unlimited access!');
        if (onPaymentComplete) onPaymentComplete();
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
      console.error('Checkout error:', err);
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError('服务器暂时不可用，请稍后再试。如果多次失败，请联系支持。');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="flex items-center text-rose-700">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <button
          disabled
          className="w-full py-4 bg-indigo-400 text-white rounded-xl font-bold text-lg cursor-not-allowed"
        >
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Processing...
        </button>
      ) : isRedirecting ? (
        <button
          disabled
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg cursor-not-allowed"
        >
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Redirecting to Paddle Checkout...
        </button>
      ) : (
        <button
          onClick={handleCheckout}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Purchase - $9.90
        </button>
      )}
    </div>
  );
};

// OrderHistory Component
export const OrderHistory: React.FC<{
  userId: string;
  refreshTrigger?: number;
}> = ({ userId, refreshTrigger }) => {
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.billingOrders(userId));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OrderHistoryResponse = await response.json();

      if (data.success) {
        setOrders(data.orders);
      } else {
        setError(data.error || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load order history';
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError('服务器暂时不可用，请稍后再试。如果多次失败，请联系支持。');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId, refreshTrigger]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 bg-emerald-50';
      case 'pending':
        return 'text-amber-600 bg-amber-50';
      case 'failed':
        return 'text-rose-600 bg-rose-50';
      case 'refunded':
        return 'text-slate-600 bg-slate-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="flex items-center text-rose-700">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Your Orders</h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No orders yet</p>
            <p className="text-sm text-slate-500">
              Your order history will appear here after you make a purchase.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {orders.map((order) => (
              <div key={order.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        TenantLease - 30-Day Access
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-semibold">${order.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-500">Date:</span>
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                      {order.paddle_transaction_id && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Transaction ID:</span>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                            {order.paddle_transaction_id.slice(0, 8)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// AccessStatus Component (useful for checking if user has active access)
export const AccessStatus: React.FC<{
  userId: string;
  onUpdate?: (hasAccess: boolean) => void;
}> = ({ userId, onUpdate }) => {
  const [accessInfo, setAccessInfo] = useState<AccessStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.billingCheckAccess(userId));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AccessStatusResponse = await response.json();
        setAccessInfo(data);
        if (onUpdate) {
          onUpdate(data.has_access);
        }
      } catch (err) {
        console.error('Failed to check access status:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to check access status';
        if (err instanceof Error && err.message.includes('Failed to fetch')) {
          setError('服务器暂时不可用，请稍后再试。如果多次失败，请联系支持。');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [userId, onUpdate]);

  if (isLoading) {
    return <div className="text-slate-500">Checking access status...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
        <div className="flex items-center text-rose-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="font-medium">{error}</span>
        </div>
      </div>
    );
  }

  if (accessInfo && accessInfo.has_access) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-6 py-4">
        <div className="flex items-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-2" />
          <div className="flex-1">
            <p className="text-emerald-800 font-semibold">You have active 30-day access!</p>
            <p className="text-sm text-emerald-700">
              Expires on {new Date(accessInfo.expires_at || '').toLocaleDateString()} 
              ({accessInfo.days_remaining} days remaining)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-6 py-4">
      <p className="text-slate-700">
        {accessInfo?.message || 'No active access found'}
      </p>
    </div>
  );
};

// Hook to check access status
export const useAccessStatus = (userId: string) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessInfo, setAccessInfo] = useState<AccessStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.billingCheckAccess(userId));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AccessStatusResponse = await response.json();
        setAccessInfo(data);
        setHasAccess(data.has_access);
      } catch (err) {
        console.error('Failed to check access status:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to check access status';
        if (err instanceof Error && err.message.includes('Failed to fetch')) {
          setError('服务器暂时不可用，请稍后再试。如果多次失败，请联系支持。');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [userId]);

  return { hasAccess, isLoading, accessInfo, error };
};

// Utility function to poll for payment status
export const pollTransactionStatus = async (
  transactionId: string,
  onCompleted: () => void,
  onFailed: () => void,
  maxAttempts: number = 30,
  intervalMs: number = 2000,
): Promise<void> => {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Polling timeout'));
        return;
      }

      try {
        const response = await fetch(API_ENDPOINTS.billingTransaction(transactionId));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.transaction) {
          const status = data.transaction.status;

          if (status === 'completed') {
            onCompleted();
            resolve();
          } else if (status === 'failed') {
            onFailed();
            resolve();
          } else {
            // Still pending, continue polling
            attempts++;
            setTimeout(poll, intervalMs);
          }
        }
      } catch (err) {
        console.error('Poll transaction status error:', err);
        reject(err);
      }
    };

    poll();
  });
};
