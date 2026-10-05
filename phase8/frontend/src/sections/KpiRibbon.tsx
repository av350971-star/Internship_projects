import React from 'react';
import { Users, ShoppingBag, IndianRupee, LifeBuoy, RotateCcw, AlertTriangle } from 'lucide-react';
import type { Metrics, Approval } from '../lib/api';

interface KpiRibbonProps {
  metrics: Metrics | null;
  pendingApprovals: Approval[];
  onSelectTab: (tab: string) => void;
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({
  metrics,
  pendingApprovals,
  onSelectTab,
}) => {
  const pendingCount = pendingApprovals.filter(a => a.status === 'pending').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* Total Customers */}
      <div 
        onClick={() => onSelectTab('customers')}
        className="glass-card p-3.5 rounded-xl cursor-pointer hover:border-indigo-500/40 transition group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium group-hover:text-indigo-300 transition">Customers</span>
          <Users className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition transform" />
        </div>
        <div className="text-xl font-bold text-white font-mono">
          {metrics ? metrics.total_customers : '—'}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">Active directory</p>
      </div>

      {/* Total Orders */}
      <div 
        onClick={() => onSelectTab('orders')}
        className="glass-card p-3.5 rounded-xl cursor-pointer hover:border-violet-500/40 transition group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium group-hover:text-violet-300 transition">Orders</span>
          <ShoppingBag className="h-4 w-4 text-violet-400 group-hover:scale-110 transition transform" />
        </div>
        <div className="text-xl font-bold text-white font-mono">
          {metrics ? metrics.total_orders : '—'}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">Store transactions</p>
      </div>

      {/* Delivered Revenue */}
      <div 
        onClick={() => onSelectTab('orders')}
        className="glass-card p-3.5 rounded-xl cursor-pointer hover:border-emerald-500/40 transition group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium group-hover:text-emerald-300 transition">Delivered Revenue</span>
          <IndianRupee className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition transform" />
        </div>
        <div className="text-xl font-bold text-emerald-400 font-mono">
          {metrics ? `₹${metrics.revenue_delivered_orders_inr.toLocaleString('en-IN')}` : '—'}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">Settled volume</p>
      </div>

      {/* Open Tickets */}
      <div 
        onClick={() => onSelectTab('tickets')}
        className="glass-card p-3.5 rounded-xl cursor-pointer hover:border-amber-500/40 transition group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium group-hover:text-amber-300 transition">Open Tickets</span>
          <LifeBuoy className="h-4 w-4 text-amber-400 group-hover:scale-110 transition transform" />
        </div>
        <div className="text-xl font-bold text-amber-300 font-mono">
          {metrics ? metrics.open_tickets : '—'}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">Need resolution</p>
      </div>

      {/* Processed Refunds */}
      <div 
        onClick={() => onSelectTab('orders')}
        className="glass-card p-3.5 rounded-xl cursor-pointer hover:border-rose-500/40 transition group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium group-hover:text-rose-300 transition">Refunds</span>
          <RotateCcw className="h-4 w-4 text-rose-400 group-hover:scale-110 transition transform" />
        </div>
        <div className="text-xl font-bold text-rose-400 font-mono">
          {metrics ? metrics.refunds_processed : '—'}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">Audited reversals</p>
      </div>

      {/* Consent Gate Pending */}
      <div 
        onClick={() => onSelectTab('approvals')}
        className={`glass-card p-3.5 rounded-xl cursor-pointer transition group border ${
          pendingCount > 0 
            ? 'border-amber-500/60 bg-amber-500/10 hover:border-amber-400' 
            : 'hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className={`text-xs font-medium ${pendingCount > 0 ? 'text-amber-300 font-semibold' : ''}`}>
            Gate Approvals
          </span>
          <AlertTriangle className={`h-4 w-4 ${pendingCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xl font-bold font-mono ${pendingCount > 0 ? 'text-amber-300' : 'text-white'}`}>
            {pendingCount}
          </span>
          {pendingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
              Review
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">Consent queue</p>
      </div>
    </div>
  );
};
