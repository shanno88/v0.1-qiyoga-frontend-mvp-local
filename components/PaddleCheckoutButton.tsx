import React, { useState } from 'react';
import { API_ENDPOINTS } from '../src/config/api';

interface PaddleCheckoutButtonProps {
  email: string;
  onPaymentStart?: () => void;
  onPaymentComplete?: (data: any) => void;
  onPaymentError?: (error: any) => void;
}

export default function PaddleCheckoutButton({ 
  email, 
  onPaymentStart, 
  onPaymentComplete,
  onPaymentError 
}: PaddleCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      if (onPaymentStart) {
        onPaymentStart();
      }

      const response = await fetch(API_ENDPOINTS.checkout, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const data = await response.json();

      window.location.href = data.checkout_url;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(errorMessage);
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="paddle-checkout-container">
      <button
        onClick={handleCheckout}
        disabled={loading || !email}
        className="paddle-checkout-button"
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff',
          backgroundColor: loading || !email ? '#cccccc' : '#4CAF50',
          border: 'none',
          borderRadius: '8px',
          cursor: loading || !email ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s ease',
        }}
        onMouseEnter={(e) => {
          if (!loading && email) {
            e.currentTarget.style.backgroundColor = '#45a049';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading && email) {
            e.currentTarget.style.backgroundColor = '#4CAF50';
          }
        }}
      >
        {loading ? 'Processing...' : 'Purchase TenantLease ($9.90)'}
      </button>

      {error && (
        <div className="error-message" style={{ color: '#f44336', marginTop: '10px' }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        Secure payment powered by Paddle
      </p>
    </div>
  );
}
