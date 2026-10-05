export const API_BASE = '';
export const DEFAULT_API_KEY = 'dev-local-key-123';

export function getApiKey(): string {
  return localStorage.getItem('mcp_api_key') || DEFAULT_API_KEY;
}

export function setApiKey(key: string): void {
  localStorage.setItem('mcp_api_key', key);
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: 'gold' | 'silver' | 'basic';
  city: string;
}

export interface Order {
  id: string;
  customer_id: string;
  item: string;
  amount: number;
  status: 'delivered' | 'shipped' | 'returned' | 'cancelled' | 'refunded';
  date: string;
}

export interface Ticket {
  id: string;
  customer_id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}

export interface Refund {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  reason: string;
  approval_id: string;
  processed_at: string;
}

export interface Approval {
  approval_id: string;
  action: string;
  params: {
    order_id?: string;
    amount?: number;
    reason?: string;
    customer_id?: string;
    [key: string]: any;
  };
  summary: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  created_at: string;
  note?: string;
}

export interface Metrics {
  total_customers: number;
  total_orders: number;
  revenue_delivered_orders_inr: number;
  open_tickets: number;
  refunds_processed: number;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-API-Key', getApiKey());
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  checkHealth: () => request<{ status: string; ai_configured: boolean }>('/api/health'),
  
  getMetrics: () => request<Metrics>('/api/metrics'),
  
  getCustomers: (q: string = '') => request<Customer[]>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  
  getCustomerOrders: (customerId: string) => request<Order[]>(`/api/customers/${customerId}/orders`),
  
  getAllOrders: () => request<Order[]>('/api/orders'),
  
  getAllTickets: () => request<Ticket[]>('/api/tickets'),
  
  getAllRefunds: () => request<Refund[]>('/api/refunds'),
  
  getApprovals: () => request<Approval[]>('/api/approvals'),
  
  createApproval: (data: { order_id: string; amount: number; reason: string; action?: string }) =>
    request<Approval>('/api/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  approveApproval: (approvalId: string, note: string = '') =>
    request<{ approval: Approval; result: any }>(`/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
    
  rejectApproval: (approvalId: string, note: string = '') =>
    request<Approval>(`/api/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
    
  getTools: () => request<McpTool[]>('/api/tools'),
  
  getResources: () => request<McpResource[]>('/api/resources'),
  
  getPrompts: () => request<McpPrompt[]>('/api/prompts'),
  
  sendChat: (message: string) =>
    request<{
      type: 'message' | 'approval_required';
      text: string;
      approval?: Approval;
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
    
  callMcp: (method: string, params: any = {}) =>
    request<any>('/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    }),
};
