import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ShieldAlert, CheckCircle, XCircle, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { api, type Approval } from '../lib/api';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  type?: 'message' | 'approval_required';
  approval?: Approval;
  isExecutingApproval?: boolean;
  approvalOutcome?: {
    status: 'approved' | 'rejected';
    message: string;
    result?: any;
  };
}

interface ChatCopilotProps {
  onRefreshAll: () => void;
  onNavigateToTab: (tab: string) => void;
}

const QUICK_PROMPTS = [
  "🔍 Find customer Priya",
  "📦 Show orders of Rohan",
  "🎫 Create ticket for Sneha about damaged package, priority high",
  "💳 Refund ₹499 for ORD-1008 because HDMI cable was defective",
  "📊 What are our store metrics?",
];

export const ChatCopilot: React.FC<ChatCopilotProps> = ({ onRefreshAll, onNavigateToTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am **BusinessOps Copilot**, powered by the Model Context Protocol (MCP).\n\nI can look up customers, retrieve order records, draft support tickets, and submit refund requests through the secure **Human Consent Gate**.\n\nTry one of the suggested prompts below or ask me anything!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [approvalNote, setApprovalNote] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsSending(true);

    try {
      const resp = await api.sendChat(messageText);
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: resp.text,
        type: resp.type,
        approval: resp.approval,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (resp.type === 'approval_required') {
        onRefreshAll();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Error communicating with MCP Assistant**: ${err.message || 'Check server connection and API Key.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleApprove = async (msgId: string, approvalId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isExecutingApproval: true } : m))
    );
    try {
      const note = approvalNote[approvalId] || 'Approved via chat consent card';
      const outcome = await api.approveApproval(approvalId, note);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isExecutingApproval: false,
                approvalOutcome: {
                  status: 'approved',
                  message: `Refund of ₹${outcome.result.amount} executed successfully! Refund ID: ${outcome.result.id}`,
                  result: outcome.result,
                },
              }
            : m
        )
      );
      onRefreshAll();
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isExecutingApproval: false,
                approvalOutcome: {
                  status: 'rejected',
                  message: `Execution failed: ${err.message}`,
                },
              }
            : m
        )
      );
    }
  };

  const handleReject = async (msgId: string, approvalId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isExecutingApproval: true } : m))
    );
    try {
      const note = approvalNote[approvalId] || 'Rejected by human reviewer';
      await api.rejectApproval(approvalId, note);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isExecutingApproval: false,
                approvalOutcome: {
                  status: 'rejected',
                  message: `Refund request ${approvalId} was declined. No funds were transferred.`,
                },
              }
            : m
        )
      );
      onRefreshAll();
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isExecutingApproval: false,
                approvalOutcome: {
                  status: 'rejected',
                  message: `Rejection error: ${err.message}`,
                },
              }
            : m
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-[700px] glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Copilot Header */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-white">Operations Copilot</h2>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Tools Enabled
              </span>
            </div>
            <p className="text-xs text-slate-400">Natural language dispatcher for customer & transaction tools</p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('mcp')}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
        >
          <span>View Registered Tools</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-sm shadow-md'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Inline Human Consent Gate Card */}
                  {msg.type === 'approval_required' && msg.approval && (
                    <div className="mt-3.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200 space-y-3">
                      <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                        <ShieldAlert className="h-4 w-4 animate-pulse" />
                        <span>Consent Gate Triggered: Side-Effect Operation</span>
                      </div>

                      <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Action:</span>
                          <span className="text-indigo-400 font-semibold">{msg.approval.action}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Order ID:</span>
                          <span className="text-white">{msg.approval.params.order_id || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Refund Amount:</span>
                          <span className="text-emerald-400 font-semibold">₹{msg.approval.params.amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Reason:</span>
                          <span className="text-slate-300">{msg.approval.params.reason || 'Requested by customer'}</span>
                        </div>
                        <div className="flex justify-between text-[11px] pt-1 border-t border-slate-800">
                          <span className="text-slate-500">Approval ID:</span>
                          <span className="text-amber-400">{msg.approval.approval_id}</span>
                        </div>
                      </div>

                      {/* Execution outcome or buttons */}
                      {msg.approvalOutcome ? (
                        <div
                          className={`p-2.5 rounded-lg flex items-center space-x-2 text-xs font-medium ${
                            msg.approvalOutcome.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {msg.approvalOutcome.status === 'approved' ? (
                            <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                          )}
                          <span>{msg.approvalOutcome.message}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Optional reviewer note..."
                            value={approvalNote[msg.approval.approval_id] || ''}
                            onChange={(e) =>
                              setApprovalNote({
                                ...approvalNote,
                                [msg.approval!.approval_id]: e.target.value,
                              })
                            }
                            className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                          <div className="flex space-x-2">
                            <button
                              disabled={msg.isExecutingApproval}
                              onClick={() => handleApprove(msg.id, msg.approval!.approval_id)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50 transition"
                            >
                              {msg.isExecutingApproval ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                              <span>Approve & Execute (Single-Use)</span>
                            </button>
                            <button
                              disabled={msg.isExecutingApproval}
                              onClick={() => handleReject(msg.id, msg.approval!.approval_id)}
                              className="py-1.5 px-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-medium text-xs flex items-center justify-center space-x-1 shadow-md disabled:opacity-50 transition"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 rounded-tl-sm flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span className="text-xs text-slate-400">Consulting MCP Tools & Assistant...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto text-xs">
        <Sparkles className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
        <span className="text-slate-400 text-[11px] whitespace-nowrap">Try:</span>
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt.replace(/^[^\w]+/, ''))}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-slate-700 text-slate-300 text-[11px] whitespace-nowrap transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder="Ask BusinessOps (e.g. 'Show orders of Rohan' or 'Refund ₹500 for ORD-1008')..."
          className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || isSending}
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
