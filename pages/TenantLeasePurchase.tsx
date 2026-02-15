import React, { useState } from 'react';
import PaddleCheckoutButton from '../components/PaddleCheckoutButton';
import { getCurrentPriceId } from '../src/config/paddle';

export default function TenantLeasePurchase() {
  const [email, setEmail] = useState('');

  const handlePaymentStart = () => {
    console.log('Payment initiation started');
  };

  const handlePaymentComplete = (data: any) => {
    console.log('Payment completed successfully:', data);
    alert('Payment successful! Thank you for your purchase.');
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    alert(`Payment failed: ${error}`);
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          fontSize: '32px',
          marginBottom: '10px',
          color: '#333'
        }}>
          TenantLease
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666'
        }}>
          Professional Lease Analysis Tool
        </p>
      </div>

      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '30px',
        borderRadius: '10px',
        marginBottom: '30px'
      }}>
        <h2 style={{
          fontSize: '24px',
          marginBottom: '20px',
          color: '#333'
        }}>
          One-Time Purchase
        </h2>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '10px',
          fontSize: '16px'
        }}>
          <span>TenantLease License</span>
          <span>$9.90</span>
        </div>

        <div style={{
          borderTop: '2px solid #ddd',
          margin: '20px 0',
          padding: '20px 0'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            <span>Total</span>
            <span>$9.90</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          <p style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '5px'
          }}>
            Your license will be sent to this email
          </p>
        </div>

        <PaddleCheckoutButton
          email={email}
          onPaymentStart={handlePaymentStart}
          onPaymentComplete={handlePaymentComplete}
          onPaymentError={handlePaymentError}
        />
      </div>

      <div style={{
        fontSize: '14px',
        color: '#999',
        textAlign: 'center'
      }}>
        <p>Powered by Paddle • Secure payment processing</p>
      </div>
    </div>
  );
}
