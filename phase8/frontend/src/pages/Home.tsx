import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  ShieldCheck,
  Users,
  ShoppingBag,
  LifeBuoy,
  Terminal,
} from 'lucide-react';
import {
  api,
  getApiKey,
  type Metrics,
  type Customer,
  type Order,
  type Ticket,
  type Refund,
  type Approval,
  type McpTool,
  type McpResource,
  type McpPrompt,
} from '../lib/api';

import { Header } from '../sections/Header';
import { KpiRibbon } from '../sections/KpiRibbon';
import { ChatCopilot } from '../sections/ChatCopilot';
import { ApprovalsQueue } from '../sections/ApprovalsQueue';
import { CustomersHub } from '../sections/CustomersHub';
import { OrdersManager } from '../sections/OrdersManager';
import { TicketsDesk } from '../sections/TicketsDesk';
import { McpInspector } from '../sections/McpInspector';

import { RefundModal } from '../components/RefundModal';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { ApiKeyModal } from '../components/ApiKeyModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [apiKey, setApiKeyState] = useState<string>(getApiKey());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Data states
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [resources, setResources] = useState<McpResource[]>([]);
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);

  // Modals
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [preselectedOrder, setPreselectedOrder] = useState<Order | undefined>(undefined);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Check health
      try {
        await api.checkHealth();
        setServerStatus('online');
      } catch {
        setServerStatus('offline');
      }

      // Fetch all collections in parallel
      const [
        metricsRes,
        customersRes,
        ordersRes,
        ticketsRes,
        refundsRes,
        approvalsRes,
        toolsRes,
        resourcesRes,
        promptsRes,
      ] = await Promise.allSettled([
        api.getMetrics(),
        api.getCustomers(),
        api.getAllOrders(),
        api.getAllTickets(),
        api.getAllRefunds(),
        api.getApprovals(),
        api.getTools(),
        api.getResources(),
        api.getPrompts(),
      ]);

      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
      if (customersRes.status === 'fulfilled') setCustomers(customersRes.value);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value);
      if (ticketsRes.status === 'fulfilled') setTickets(ticketsRes.value);
      if (refundsRes.status === 'fulfilled') setRefunds(refundsRes.value);
      if (approvalsRes.status === 'fulfilled') setApprovals(approvalsRes.value);
      if (toolsRes.status === 'fulfilled') setTools(toolsRes.value);
      if (resourcesRes.status === 'fulfilled') setResources(resourcesRes.value);
      if (promptsRes.status === 'fulfilled') setPrompts(promptsRes.value);
    } catch (err) {
      console.error('Error refreshing system data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  const handleOpenRefundWithOrder = (order?: Order) => {
    setPreselectedOrder(order);
    setIsRefundModalOpen(true);
  };

  const handleSelectCustomerForChat = (_customer: Customer) => {
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        serverStatus={serverStatus}
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onRefreshAll={fetchAllData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Ribbon */}
        <KpiRibbon
          metrics={metrics}
          pendingApprovals={approvals}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-6 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>AI Operations Copilot</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap relative ${
              activeTab === 'approvals'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Consent Gate</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold ml-1 animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Orders & Refunds ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Support Tickets ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'mcp'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>MCP Protocol Inspector</span>
          </button>
        </div>

        {/* Tab Views */}
        <div>
          {activeTab === 'chat' && (
            <ChatCopilot
              onRefreshAll={fetchAllData}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'approvals' && (
            <ApprovalsQueue
              approvals={approvals}
              onRefreshAll={fetchAllData}
              onRequestRefundModal={() => handleOpenRefundWithOrder()}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersHub
              customers={customers}
              onSelectCustomerForChat={handleSelectCustomerForChat}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersManager
              orders={orders}
              refunds={refunds}
              onOpenRefundModal={handleOpenRefundWithOrder}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketsDesk
              tickets={tickets}
              onOpenCreateTicketModal={() => setIsCreateTicketModalOpen(true)}
            />
          )}

          {activeTab === 'mcp' && (
            <McpInspector
              tools={tools}
              resources={resources}
              prompts={prompts}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={() => {
          setApiKeyState(getApiKey());
          fetchAllData();
        }}
      />

      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        orders={orders}
        preselectedOrder={preselectedOrder}
        onSuccess={() => {
          fetchAllData();
          setActiveTab('approvals');
        }}
      />

      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setIsCreateTicketModalOpen(false)}
        customers={customers}
        onSuccess={() => {
          fetchAllData();
          setActiveTab('tickets');
        }}
      />
    </div>
  );
}
