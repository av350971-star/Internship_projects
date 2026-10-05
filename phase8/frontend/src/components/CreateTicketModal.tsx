import React, { useState } from 'react';
import { LifeBuoy, Loader2 } from 'lucide-react';
import { api, type Customer } from '../lib/api';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSuccess: () => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSuccess,
}) => {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please provide a ticket subject.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call create_support_ticket via MCP JSON-RPC
      const res = await api.callMcp('tools/call', {
        name: 'create_support_ticket',
        arguments: {
          customer_id: customerId || customers[0]?.id,
          subject,
          description: description || 'No further description.',
          priority,
        },
      });

      if (res.result?.isError) {
        throw new Error(res.result.content?.[0]?.text || 'Ticket creation failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Support Ticket</h3>
              <p className="text-xs text-slate-400">Directly dispatches create_support_ticket MCP tool</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Target Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id}) — {c.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`py-1.5 px-3 rounded-xl border text-xs capitalize font-semibold transition ${
                    priority === p
                      ? p === 'high'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : p === 'medium'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short title of the customer issue..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
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
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />}
              <span>Create Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
