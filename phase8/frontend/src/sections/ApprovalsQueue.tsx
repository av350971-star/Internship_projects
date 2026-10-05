import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, Clock, Check, Plus, Loader2 } from 'lucide-react';
import { api, type Approval } from '../lib/api';

interface ApprovalsQueueProps {
  approvals: Approval[];
  onRefreshAll: () => void;
  onRequestRefundModal: () => void;
}

export const ApprovalsQueue: React.FC<ApprovalsQueueProps> = ({
  approvals,
  onRefreshAll,
  onRequestRefundModal,
}) => {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const displayedApprovals = filter === 'pending' ? pendingApprovals : approvals;

  const handleApprove = async (approvalId: string) => {
    setProcessingId(approvalId);
    setFeedback(null);
    try {
      const note = notes[approvalId] || 'Approved by operator';
      const outcome = await api.approveApproval(approvalId, note);
      setFeedback({
        id: approvalId,
        success: true,
        msg: `Approved & Executed: ₹${outcome.result.amount} refunded successfully (Refund ID: ${outcome.result.id})`,
      });
      onRefreshAll();
    } catch (err: any) {
      setFeedback({
        id: approvalId,
        success: false,
        msg: `Approval execution error: ${err.message}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    setProcessingId(approvalId);
    setFeedback(null);
    try {
      const note = notes[approvalId] || 'Rejected by operator';
      await api.rejectApproval(approvalId, note);
      setFeedback({
        id: approvalId,
        success: true,
        msg: `Approval ${approvalId} rejected. Operation was blocked.`,
      });
      onRefreshAll();
    } catch (err: any) {
      setFeedback({
        id: approvalId,
        success: false,
        msg: `Rejection error: ${err.message}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Consent Gate */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <span>Human-in-the-Loop Consent Gate (Security Layer)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                Single-Use Token Guard
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Any state-mutating tool like <code className="text-amber-300 font-mono">process_refund</code> cannot be executed directly by the LLM. 
              The agent creates a staged approval request which must be signed by a human operator before the tool unlocks.
            </p>
          </div>
        </div>

        <button
          onClick={onRequestRefundModal}
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 whitespace-nowrap transition"
        >
          <Plus className="h-4 w-4" />
          <span>Stage New Refund</span>
        </button>
      </div>

      {/* Filter Tabs & Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Review ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Audit Records ({approvals.length})
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Showing {displayedApprovals.length} item(s)
        </span>
      </div>

      {/* Approvals List */}
      {displayedApprovals.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80">
          <ShieldCheck className="h-12 w-12 text-emerald-400/60 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-white">No Pending Approvals</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            All side-effecting operations have been resolved. When the AI or user prepares a refund, it will appear here for verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedApprovals.map((approval) => {
            const isPending = approval.status === 'pending';
            const isProcessing = processingId === approval.approval_id;

            return (
              <div
                key={approval.approval_id}
                className={`glass-panel rounded-xl p-5 border transition relative ${
                  isPending
                    ? 'border-amber-500/50 bg-slate-900/90 shadow-lg shadow-amber-500/5'
                    : 'border-slate-800/80 bg-slate-950/60'
                }`}
              >
                {/* Header status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        approval.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : approval.status === 'approved' || approval.status === 'used'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {approval.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {approval.approval_id}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{approval.created_at}</span>
                  </span>
                </div>

                {/* Summary */}
                <p className="text-sm font-medium text-slate-200 mb-3 leading-snug">
                  {approval.summary}
                </p>

                {/* Parameters Table */}
                <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800 text-xs space-y-1.5 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Action:</span>
                    <span className="text-indigo-400 font-semibold">{approval.action}</span>
                  </div>
                  {approval.params.order_id && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Order ID:</span>
                      <span className="text-white">{approval.params.order_id}</span>
                    </div>
                  )}
                  {approval.params.amount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-emerald-400 font-semibold">₹{approval.params.amount}</span>
                    </div>
                  )}
                  {approval.params.reason && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reason:</span>
                      <span className="text-slate-300">{approval.params.reason}</span>
                    </div>
                  )}
                  {approval.note && (
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-500">Reviewer Note:</span>
                      <span className="text-amber-300">{approval.note}</span>
                    </div>
                  )}
                </div>

                {/* Feedback banner if just resolved */}
                {feedback && feedback.id === approval.approval_id && (
                  <div
                    className={`p-2.5 rounded-lg mb-3 text-xs flex items-center space-x-2 ${
                      feedback.success
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {feedback.success ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{feedback.msg}</span>
                  </div>
                )}

                {/* Actions if pending */}
                {isPending && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Add an audit note for the decision..."
                      value={notes[approval.approval_id] || ''}
                      onChange={(e) =>
                        setNotes({ ...notes, [approval.approval_id]: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex space-x-2">
                      <button
                        disabled={isProcessing}
                        onClick={() => handleApprove(approval.approval_id)}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        <span>Approve & Authorize</span>
                      </button>

                      <button
                        disabled={isProcessing}
                        onClick={() => handleReject(approval.approval_id)}
                        className="py-2 px-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-medium text-xs flex items-center justify-center space-x-1 shadow-md transition disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
