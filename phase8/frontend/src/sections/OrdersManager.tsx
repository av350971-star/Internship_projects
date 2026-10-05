import React, { useState } from 'react';
import { Search, RotateCcw, Filter, CheckCircle2, Truck, XCircle, Clock } from 'lucide-react';
import type { Order, Refund } from '../lib/api';

interface OrdersManagerProps {
  orders: Order[];
  refunds: Refund[];
  onOpenRefundModal: (order?: Order) => void;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({
  orders,
  refunds,
  onOpenRefundModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'refunds'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Delivered</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center space-x-1">
            <Truck className="h-3 w-3" />
            <span>Shipped</span>
          </span>
        );
      case 'refunded':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
            <RotateCcw className="h-3 w-3" />
            <span>Refunded</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center space-x-1">
            <XCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Returned</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`text-sm font-semibold pb-1 transition border-b-2 ${
              activeSubTab === 'orders'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('refunds')}
            className={`text-sm font-semibold pb-1 transition border-b-2 ${
              activeSubTab === 'refunds'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Audited Refunds ({refunds.length})
          </button>
        </div>

        <button
          onClick={() => onOpenRefundModal()}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Stage Refund</span>
        </button>
      </div>

      {activeSubTab === 'orders' ? (
        <>
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search order ID, item or customer..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-slate-500 flex items-center space-x-1">
                <Filter className="h-3.5 w-3.5" />
                <span>Status:</span>
              </span>
              {['all', 'delivered', 'shipped', 'returned', 'refunded', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Product / Item</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-bold text-indigo-400">{ord.id}</td>
                      <td className="py-3 px-4 font-sans text-slate-300">{ord.customer_id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-white">{ord.item}</td>
                      <td className="py-3 px-4 font-bold text-white">₹{ord.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-slate-400">{ord.date}</td>
                      <td className="py-3 px-4 font-sans">{getStatusBadge(ord.status)}</td>
                      <td className="py-3 px-4 text-right font-sans">
                        {ord.status === 'delivered' ? (
                          <button
                            onClick={() => onOpenRefundModal(ord)}
                            className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-medium transition"
                          >
                            Initiate Refund
                          </button>
                        ) : ord.status === 'refunded' ? (
                          <span className="text-[11px] text-slate-500">Refund Settled</span>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Audited Refunds List */
        <div className="space-y-4">
          {refunds.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center text-xs text-slate-400">
              No refunds have been processed yet. Approved refunds from the Consent Gate will show up here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {refunds.map((ref) => (
                <div key={ref.id} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-rose-400">{ref.id}</span>
                    <span className="text-[11px] text-slate-500">{ref.processed_at}</span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">₹{ref.amount.toLocaleString('en-IN')}</div>
                  <p className="text-xs text-slate-300">Reason: {ref.reason}</p>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Order: {ref.order_id}</span>
                    <span>Approval: {ref.approval_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
