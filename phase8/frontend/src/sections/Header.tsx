import React from 'react';
import { ShieldCheck, Terminal, Key, RefreshCw } from 'lucide-react';

interface HeaderProps {
  serverStatus: 'online' | 'offline' | 'checking';
  apiKey: string;
  onOpenApiKeyModal: () => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  serverStatus,
  apiKey,
  onOpenApiKeyModal,
  onRefreshAll,
  isRefreshing,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Terminal className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                BusinessOps AI
              </h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                MCP Protocol
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Enterprise Agentic Gateway & Human-in-the-Loop Consent Gate
            </p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* MCP Server Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                serverStatus === 'online'
                  ? 'bg-emerald-400 animate-pulse'
                  : serverStatus === 'checking'
                  ? 'bg-amber-400 animate-bounce'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {serverStatus === 'online' ? 'MCP Online' : serverStatus === 'checking' ? 'Connecting...' : 'Offline'}
            </span>
          </div>

          {/* Consent Shield Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-medium">Consent Gate: Armed</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            title="Refresh System Data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* API Key Modal Button */}
          <button
            onClick={onOpenApiKeyModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
          >
            <Key className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-mono">{apiKey ? `${apiKey.slice(0, 7)}...` : 'API Key'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
