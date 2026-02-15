# Paddle Payment Integration - Quick Start Guide

## 🚀 Quick Start (3 steps)

### 1. Install Dependencies
```bash
cd backend/paddle
npm install
```

### 2. Configure Environment
Edit `.env` file with your Paddle credentials:
```env
PADDLE_LIVE_TOKEN=your_live_token_here
PADDLE_API_URL=https://api.paddle.com
PADDLE_PRODUCT_ID=pro_01kgrhkyabt3244vn6hqgj3ype
PADDLE_PRICE_ID=pri_01kgrhp2wrthebpgwmn8eh5ssy
PORT=3001
FRONTEND_URL=https://qiyoga.xyz
PADDLE_WEBHOOK_SECRET=  # Get from Paddle dashboard
```

### 3. Start Server
```bash
npm run dev:full
```

Server will run on `http://localhost:3001`

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkout` | POST | Create Paddle checkout |
| `/webhook/paddle` | POST | Handle Paddle webhooks |
| `/api/transactions/:email` | GET | Get user transactions |
| `/health` | GET | Health check |

## 🎨 Frontend Integration

### Option 1: Use the Component

```tsx
import PaddleCheckoutButton from '../components/PaddleCheckoutButton';

<PaddleCheckoutButton 
  email="user@example.com"
  onPaymentStart={() => console.log('Payment started')}
  onPaymentComplete={(data) => console.log('Complete:', data)}
  onPaymentError={(error) => console.error('Error:', error)}
/>
```

### Option 2: Direct API Call

```javascript
const response = await fetch('http://localhost:3001/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

const { checkout_url } = await response.json();
window.location.href = checkout_url;
```

## 🔐 Webhook Setup

1. Go to Paddle Dashboard → Developer Tools → Webhooks
2. Create webhook: `https://qiyoga.xyz/webhook/paddle`
3. Subscribe to: `transaction.completed`
4. Copy webhook secret to `.env` as `PADDLE_WEBHOOK_SECRET`

## 📊 Database

Transactions are saved to `transactions.db` (SQLite).

Schema:
- `transaction_id` - Paddle transaction ID
- `customer_email` - User email
- `amount` - Payment amount
- `currency` - Currency code
- `status` - Transaction status
- `product` - Product name
- `created_at` - Creation timestamp

## 🧪 Testing

### Test Signature Verification
```bash
node test/signature-test.js
```

### Test Checkout (with curl)
```bash
curl -X POST http://localhost:3001/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🌐 Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start backend/paddle/server-full.js --name paddle-payment
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
location /api/checkout {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
}

location /webhook/paddle {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
}
```

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PADDLE_API_KEY` | Yes | - | Your Paddle API key |
| `PADDLE_API_URL` | No | https://api.paddle.com | Paddle API endpoint |
| `PADDLE_PRICE_ID` | Yes | - | Price ID for product |
| `PORT` | No | 3001 | Server port |
| `FRONTEND_URL` | No | https://qiyoga.xyz | Frontend URL for redirects |
| `PADDLE_WEBHOOK_SECRET` | No | - | Webhook signature secret |

## 📝 Example: Complete Purchase Flow

```tsx
// 1. User enters email and clicks purchase
// 2. Frontend calls POST /api/checkout
// 3. User redirected to Paddle checkout
// 4. User completes payment
// 5. Paddle sends webhook to POST /webhook/paddle
// 6. Transaction saved to database
// 7. User redirected to success page
```

## 🆘 Troubleshooting

**Checkout fails with 401**: Check API key is correct

**Webhook returns 401**: Verify webhook secret matches Paddle dashboard

**Database not saving**: Ensure `backend/paddle/` directory is writable

**CORS errors**: Update frontend checkout URL in server settings

## 📚 Documentation

- Paddle API: https://developer.paddle.com/
- Paddle Webhooks: https://developer.paddle.com/webhooks
- Test Cards: https://developer.paddle.com/testing/test-cards
