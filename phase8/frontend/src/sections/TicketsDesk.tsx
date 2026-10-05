import React, { useState } from 'react';
import { Plus, Clock, CheckCircle, Search } from 'lucide-react';
import type { Ticket } from '../lib/api';

interface TicketsDeskProps {
  tickets: Ticket[];
  onOpenCreateTicketModal: () => void;
}

export const TicketsDesk: React.FC<TicketsDeskProps> = ({
  tickets,
  onOpenCreateTicketModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return (
          <span className="flex items-center space-x-1 text-amber-400 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>Open</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center space-x-1 text-blue-400 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>In Progress</span>
          </span>
        );
      case 'closed':
        return (
          <span className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Closed</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ticket ID, customer or subject..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition ${
                  priorityFilter === p
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenCreateTicketModal}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-lg shadow-indigo-600/25 transition whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((t) => (
          <div
            key={t.id}
            className="glass-card rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2.5">
                <span className="text-xs font-mono font-bold text-indigo-400">{t.id}</span>
                <span className="text-xs text-slate-400 font-mono">({t.customer_id})</span>
                {getPriorityBadge(t.priority)}
              </div>

              <div className="flex items-center space-x-4">
                {getStatusBadge(t.status)}
                <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{t.created_at}</span>
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-1">{t.subject}</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-sans">
                {t.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
