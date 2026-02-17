export const API_BASE_URL = 'http://localhost:3001';

export const API_ENDPOINTS = {
  checkout: `${API_BASE_URL}/api/checkout`,
  webhookPaddle: `${API_BASE_URL}/webhook/paddle`,
  ocr: (userId: string) => `${API_BASE_URL}/api/lease/ocr?user_id=${userId}`,
  billingCheckAccess: (userId: string) => `${API_BASE_URL}/api/billing/check-access?user_id=${userId}`,
  billingCheckoutCreate: `${API_BASE_URL}/api/billing/checkout/create`,
  billingOrders: (userId: string) => `${API_BASE_URL}/api/billing/orders/${userId}`,
  billingTransaction: (transactionId: string) => `${API_BASE_URL}/api/billing/transaction/${transactionId}`,
  leaseAnalyze: (userId: string) => `${API_BASE_URL}/api/lease/analyze?user_id=${userId}`,
  quickClauseAnalyze: `${API_BASE_URL}/api/lease/clause/quick-analyze`,
  quickClauseHistory: `${API_BASE_URL}/api/lease/clause/quick-analyze/history`,
  analyzeClauses: `${API_BASE_URL}/api/analyze-clauses`
};

export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  return response;
}

export async function apiPost(url: string, data?: any): Promise<Response> {
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function apiGet(url: string): Promise<Response> {
  return apiRequest(url, {
    method: 'GET'
  });
}
