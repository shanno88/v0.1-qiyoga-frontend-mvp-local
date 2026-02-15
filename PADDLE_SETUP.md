# Paddle Payment Setup Guide

This guide walks you through setting up Paddle Billing for the QiYoga Lease Analyzer.

## Prerequisites

- Paddle Vendor Account: https://vendor.paddle.com/
- Active Paddle Billing account with sandbox access

## Step 1: Get Paddle Credentials

1. Log in to Paddle Dashboard: https://vendor.paddle.com/
2. Navigate to **Developer Tools** → **Authentication**
3. Copy the following values:
   - **Vendor ID**: Your unique vendor identifier
   - **API Key**: Used for server-side API calls
   - **Client-side Token**: Used for frontend SDK (if using overlay checkout)

## Step 2: Create Product and Price

1. In Paddle Dashboard, go to **Products** → **Products**
2. Click **Create Product**
3. Fill in product details:
   - **Name**: Lease Analysis Full Report
   - **Description**: Full OCR analysis with key information extraction
   - **Type**: One-time purchase
4. Create a price:
    - **Amount**: $9.90
    - **Currency**: USD
    - **Billing**: One-time
5. Save and copy the **Price ID** (starts with `pri_...` or `price_...`)

## Step 3: Configure Webhook

1. In Paddle Dashboard, go to **Developer Tools** → **Notifications** → **Webhooks**
2. Click **Create Webhook**
3. Configure:
   - **Name**: QiYoga Lease Analyzer
   - **URL**: `http://your-backend-domain.com/api/billing/webhook`
     - For local testing: Use ngrok or similar tunneling service
4. Select events to listen for:
    - ✅ `transaction.completed`
    - ✅ `transaction.billed`
5. Save and copy the **Signing Secret** (not currently used, but good practice)

## Step 4: Set Environment Variables

Create or update your `.env` file in the `backend` directory:

```bash
# Paddle Payment Configuration
PADDLE_VENDOR_ID=your_actual_vendor_id
PADDLE_API_KEY=your_actual_api_key
PADDLE_CLIENT_TOKEN=your_actual_client_token
PADDLE_ENV=sandbox
PADDLE_PRICE_ID=pri_1a2b3c4d5e6f7g8h

# Frontend URL (for Paddle redirect URLs)
FRONTEND_URL=http://localhost:5173
```

**Important**: Replace the placeholder values with your actual Paddle credentials.

## Step 5: Local Testing with Ngrok

Since Paddle webhooks need a public URL, use ngrok for local testing:

1. Install ngrok: https://ngrok.com/download
2. Start your backend: `python backend/app.py`
3. In another terminal, run: `ngrok http 8000`
4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
5. Update Paddle webhook URL to: `https://abc123.ngrok.io/api/billing/webhook`

## Step 6: Test the Payment Flow

### Using Paddle Sandbox

1. Set `PADDLE_ENV=sandbox` in your `.env`
2. Start backend: `python backend/app.py`
3. Start frontend: `npm run dev`
4. Open `http://localhost:5173`
5. Upload a lease PDF and click "Analyze"
6. Click "Unlock Full Report - $9.90"
7. Complete the test purchase using Paddle's test card:
   - Card Number: `4000 0000 0000 0077` (Visa)
   - Expiry: Any future date
   - CVC: Any 3 digits
8. Verify:
   - Redirect to `/billing/success?analysis_id=...`
   - Full report is displayed
   - Webhook received and marked analysis as paid

### Switching to Live Mode

To go live:
1. Update `PADDLE_ENV=live` in `.env`
2. Use live API keys and price IDs
3. Update webhook URL to production domain
4. Test with a small real payment

## Paddle Resources

- [Paddle Billing Documentation](https://developer.paddle.com/)
- [Paddle Testing Guide](https://developer.paddle.com/testing/checkout)
- [Paddle Webhook Guide](https://developer.paddle.com/webhooks)
- [Paddle API Reference](https://developer.paddle.com/api-reference/)

## Troubleshooting

### Webhook not received
- Check ngrok is running and URL is correct
- Verify webhook is enabled in Paddle Dashboard
- Check backend logs for webhook errors

### Payment not marked as paid
- Verify webhook signature verification (check API key matches)
- Check `analysis_id` is passed in `custom_data`
- Review webhook event data in Paddle Dashboard

### CORS errors
- Ensure CORS middleware allows your frontend origin
- Check `FRONTEND_URL` is set correctly

### Sandbox vs Live
- Always use sandbox for development
- Switch to live only after thorough testing
- Live prices have different IDs than sandbox prices
