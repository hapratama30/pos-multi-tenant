const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function registerXenditTenant({ tenantId, businessName, emailBisnis }) {
  return apiPost('/api/xendit/register-tenant', { tenantId, businessName, emailBisnis });
}

export async function createXenditQR({ tenantId, amount, transactionId }) {
  return apiPost('/api/xendit/create-qr', { tenantId, amount, transactionId });
}

export async function createXenditVA({ tenantId, bankCode, name, amount, transactionId }) {
  return apiPost('/api/xendit/create-va', { tenantId, bankCode, name, amount, transactionId });
}

export async function getXenditStaticQR({ tenantId }) {
  return apiPost('/api/xendit/static-qr', { tenantId });
}

export async function getXenditFixedVAs({ tenantId }) {
  return apiPost('/api/xendit/fixed-vas', { tenantId });
}

export { API_BASE };
