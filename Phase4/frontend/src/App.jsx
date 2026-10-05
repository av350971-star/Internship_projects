import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Chat from './components/Chat';
import ExecutionLog from './components/ExecutionLog';
import ToolPanel from './components/ToolPanel';
import ApprovalModal from './components/ApprovalModal';
import DatabaseViewer from './components/DatabaseViewer';

export default function App() {
  const [role, setRole] = useState('customer');
  const [customerId, setCustomerId] = useState('CUST-1001');
  const [activeTab, setActiveTab] = useState('logs');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false); // Collapsed by default for a clean, user-friendly demo

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '👋 Welcome to the **Tool-Calling Operations Assistant**!\n\n' +
        'This assistant demonstrates how to safely connect an LLM to real operational tools:\n' +
        '• 🔒 **Pydantic Validation**: Checks input formats & numbers before any tool runs.\n' +
        '• 🛡️ **RBAC Authorization**: Ensures customers can only see their own account and cannot send emails.\n' +
        '• ⚠️ **Side-Effect Approval**: Creating tickets or sending emails strictly waits for your confirmation.\n' +
        '• ⏱️ **Audit Log**: Records every execution attempt, decision, and elapsed time.\n\n' +
        '💡 *Tip: The Technical Inspector (Audit Logs, Tools Registry, Live DB) is tucked away in the top-right button so this chat stays clean during demos!*\n\n' +
        'Try clicking any sample prompt below or type your request!',
      tool_calls: [],
      pending_approval: null,
      structured_output: null
    }
  ]);

  const [executionLogs, setExecutionLogs] = useState([]);
  const [tools, setTools] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch initial data
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/executions');
      if (res.ok) {
        const data = await res.json();
        setExecutionLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch execution logs', e);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const data = await res.json();
        setTools(data);
      }
    } catch (e) {
      console.error('Failed to fetch tools', e);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/approvals?status=pending');
      if (res.ok) {
        const data = await res.json();
        setPendingApprovals(data);
      }
    } catch (e) {
      console.error('Failed to fetch approvals', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchTools();
    fetchApprovals();
  }, []);

  // Send message
  const handleSendMessage = async (text) => {
    const userMsg = {
      role: 'user',
      content: text,
      senderRole: role,
      customerId: customerId
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/operations/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          role: role,
          customer_id: customerId,
          session_id: `session_${customerId}`
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `❌ Error: ${errJson.error?.message || 'Server request failed.'}`,
            tool_calls: [],
            pending_approval: null,
            structured_output: null
          }
        ]);
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            tool_calls: data.tool_calls || [],
            pending_approval: data.pending_approval,
            structured_output: data.structured_output
          }
        ]);

        if (data.pending_approval) {
          fetchApprovals();
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Network connection failure: ${e.message}`,
          tool_calls: [],
          pending_approval: null
        }
      ]);
    } finally {
      setIsLoading(false);
      fetchLogs();
    }
  };

  // Approve side-effect action
  const handleApprove = async (approvalId, reason) => {
    setIsProcessingApproval(true);
    try {
      const res = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Approved via dashboard' })
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `✅ **Action Approved & Executed!**\n\nApproval ID: \`${approvalId}\`\nTool: \`${data.execution_result?.tool}\`\nResult: ${JSON.stringify(data.execution_result?.result || {})}`,
            tool_calls: [],
            pending_approval: null
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `❌ Approval execution failed: ${data.message}`,
            tool_calls: [],
            pending_approval: null
          }
        ]);
      }
    } catch (e) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setIsProcessingApproval(false);
      fetchLogs();
      fetchApprovals();
    }
  };

  // Reject side-effect action
  const handleReject = async (approvalId, reason) => {
    setIsProcessingApproval(true);
    try {
      const res = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Rejected by operator' })
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `🛑 **Action Rejected by Operator.**\n\nApproval ID: \`${approvalId}\`\nStatus: \`rejected\`\nThe underlying tool was NOT executed.`,
          tool_calls: [],
          pending_approval: null
        }
      ]);
    } catch (e) {
      alert(`Rejection error: ${e.message}`);
    } finally {
      setIsProcessingApproval(false);
      fetchLogs();
      fetchApprovals();
    }
  };

  // Reset entire assistant state
  const handleReset = async () => {
    if (!confirm('Reset all conversational history, approvals, execution logs, and database records?')) {
      return;
    }
    setIsResetting(true);
    try {
      await fetch('/api/operations/reset', { method: 'POST' });
      setMessages([
        {
          role: 'assistant',
          content: '🔄 System state has been reset to defaults. Database restored and memory cleared.',
          tool_calls: [],
          pending_approval: null,
          structured_output: null
        }
      ]);
      fetchLogs();
      fetchApprovals();
    } catch (e) {
      alert(`Reset error: ${e.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation & Role Bar */}
      <Header
        role={role}
        setRole={setRole}
        customerId={customerId}
        setCustomerId={setCustomerId}
        onReset={handleReset}
        isResetting={isResetting}
        isInspectorOpen={isInspectorOpen}
        setIsInspectorOpen={setIsInspectorOpen}
        executionCount={executionLogs.length}
      />

      {/* Main Grid: Left Chat is primary / Right Inspection Panel is collapsible */}
      <main className={`main-layout ${isInspectorOpen ? '' : 'collapsed'}`}>
        {/* Left Column: Chat Conversation (Takes full width when inspector is collapsed) */}
        <Chat
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onApprove={handleApprove}
          onReject={handleReject}
          isProcessingApproval={isProcessingApproval}
          role={role}
          customerId={customerId}
        />

        {/* Right Column: Technical Audit Panel with Tabs (only shown when toggled on) */}
        {isInspectorOpen && (
          <aside className="panel-section">
          <div className="panel-tabs">
            <button
              type="button"
              id="tab-btn-logs"
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <span>Audit Log</span>
              <span className="tab-badge">{executionLogs.length}</span>
            </button>

            <button
              type="button"
              id="tab-btn-tools"
              className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              <span>Tools Registry</span>
              <span className="tab-badge">{tools.length}</span>
            </button>

            <button
              type="button"
              id="tab-btn-approvals"
              className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              <span>Approvals</span>
              {pendingApprovals.length > 0 && (
                <span className="tab-badge" style={{ background: '#f59e0b', color: '#78350f' }}>
                  {pendingApprovals.length}
                </span>
              )}
            </button>

            <button
              type="button"
              id="tab-btn-db"
              className={`tab-btn ${activeTab === 'db' ? 'active' : ''}`}
              onClick={() => setActiveTab('db')}
            >
              <span>Live DB / Mail</span>
            </button>
          </div>

          {activeTab === 'logs' && (
            <ExecutionLog logs={executionLogs} onRefresh={fetchLogs} />
          )}

          {activeTab === 'tools' && (
            <ToolPanel tools={tools} />
          )}

          {activeTab === 'approvals' && (
            <div className="tab-content" id="approvals-queue-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Pending Approval Queue ({pendingApprovals.length})
                </span>
                <button
                  type="button"
                  onClick={fetchApprovals}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px' }}
                >
                  ↺ Refresh
                </button>
              </div>

              {pendingApprovals.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
                  No pending approvals. Any side-effect tool requests will appear here for review.
                </div>
              ) : (
                pendingApprovals.map((appr) => (
                  <ApprovalModal
                    key={appr.approval_id}
                    approval={appr}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={isProcessingApproval}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'db' && (
            <DatabaseViewer />
          )}
        </aside>
        )}
      </main>
    </div>
  );
}
