import React, { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { api, type Order } from '../lib/api';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  preselectedOrder?: Order;
  onSuccess: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  orders,
  preselectedOrder,
  onSuccess,
}) => {
  const [orderId, setOrderId] = useState<string>(preselectedOrder?.id || (orders[0]?.id ?? ''));
  const [amount, setAmount] = useState<string>(preselectedOrder ? String(preselectedOrder.amount) : '');
  const [reason, setReason] = useState<string>('Item defective / customer requested refund');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedOrder = orders.find((o) => o.id === orderId) || preselectedOrder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (selectedOrder && numAmount > selectedOrder.amount) {
      setError(`Amount cannot exceed order maximum of ₹${selectedOrder.amount}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createApproval({
        order_id: orderId,
        amount: numAmount,
        reason,
        action: 'process_refund',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit refund request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Stage Refund via Consent Gate</h3>
              <p className="text-xs text-slate-400">Requires human review before funds are moved</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1 rounded-lg">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Target Order</label>
            <select
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                const ord = orders.find((o) => o.id === e.target.value);
                if (ord) setAmount(String(ord.amount));
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} — {o.item} (₹{o.amount}) [{o.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Refund Amount (INR ₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount in INR"
                max={selectedOrder?.amount}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            {selectedOrder && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Max refundable for this order: ₹{selectedOrder.amount}
              </span>
            )}
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Reason for Refund</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this refund being processed?"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center space-x-1.5 shadow-lg shadow-amber-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              <span>Submit to Consent Queue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
