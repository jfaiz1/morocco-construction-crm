const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('crm_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch('/auth/me'),
  updateProfile: (data) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  stats: () => apiFetch('/dashboard/stats'),
  chart: () => apiFetch('/dashboard/chart'),

  // Invoices
  getInvoices: (params = '') => apiFetch(`/invoices?${params}`),
  getInvoice: (id) => apiFetch(`/invoices/${id}`),
  createInvoice: (data) => apiFetch('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id, data) => apiFetch(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInvoice: (id) => apiFetch(`/invoices/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (params = '') => apiFetch(`/customers?${params}`),
  getCustomer: (id) => apiFetch(`/customers/${id}`),
  createCustomer: (data) => apiFetch('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => apiFetch(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Payments
  getPayments: (params = '') => apiFetch(`/payments?${params}`),
  createPayment: (data) => apiFetch('/payments', { method: 'POST', body: JSON.stringify(data) }),
};

export function useAuth() {
  const user = JSON.parse(localStorage.getItem('crm_user') || 'null');
  const token = localStorage.getItem('crm_token');

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('crm_token', data.token);
    localStorage.setItem('crm_user', JSON.stringify(data.user));
    return data;
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    localStorage.setItem('crm_token', data.token);
    localStorage.setItem('crm_user', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    window.location.href = '/login';
  };

  return { user, token, isAuthenticated: !!token, login, register, logout };
}
