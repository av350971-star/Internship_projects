import React, { useState } from 'react';
import { Terminal, Play, Code2, ShieldAlert } from 'lucide-react';
import { api, type McpTool, type McpResource, type McpPrompt } from '../lib/api';

interface McpInspectorProps {
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
}

export const McpInspector: React.FC<McpInspectorProps> = ({
  tools,
  resources,
  prompts,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tools' | 'resources' | 'prompts' | 'jsonrpc'>('tools');
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(tools[0] || null);
  
  // JSON-RPC Playground state
  const [rpcMethod, setRpcMethod] = useState('tools/list');
  const [rpcParams, setRpcParams] = useState('{}');
  const [rpcOutput, setRpcOutput] = useState<string>('// Run a JSON-RPC 2.0 command to view response');
  const [isExecutingRpc, setIsExecutingRpc] = useState(false);

  // Resource viewer state
  const [resourceOutput, setResourceOutput] = useState<{ [uri: string]: string }>({});

  const handleRunRpc = async () => {
    setIsExecutingRpc(true);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(rpcParams);
      } catch (e: any) {
        setRpcOutput(JSON.stringify({ error: `Invalid JSON in parameters: ${e.message}` }, null, 2));
        setIsExecutingRpc(false);
        return;
      }

      const res = await api.callMcp(rpcMethod, parsedParams);
      setRpcOutput(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setRpcOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsExecutingRpc(false);
    }
  };

  const handleReadResource = async (uri: string) => {
    try {
      const res = await api.callMcp('resources/read', { uri });
      const content = res.result?.contents?.[0]?.text || JSON.stringify(res, null, 2);
      setResourceOutput((prev) => ({ ...prev, [uri]: content }));
    } catch (err: any) {
      setResourceOutput((prev) => ({ ...prev, [uri]: `Error reading resource: ${err.message}` }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Protocol Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Model Context Protocol (MCP) Server 2024-11-05</h3>
            <p className="text-xs text-slate-400">
              Live inspection of exposed tools, schemas, resources, and reusable agent prompts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('tools')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeSubTab === 'tools' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tools ({tools.length})
          </button>
          <button
            onClick={() => setActiveSubTab('resources')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeSubTab === 'resources' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Resources ({resources.length})
          </button>
          <button
            onClick={() => setActiveSubTab('prompts')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeSubTab === 'prompts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Prompts ({prompts.length})
          </button>
          <button
            onClick={() => setActiveSubTab('jsonrpc')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeSubTab === 'jsonrpc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            JSON-RPC Runner
          </button>
        </div>
      </div>

      {/* Subtab 1: Tools */}
      {activeSubTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tool list */}
          <div className="space-y-2">
            {tools.map((tool) => {
              const isSelected = selectedTool?.name === tool.name;
              const isSideEffect = tool.name === 'process_refund';

              return (
                <div
                  key={tool.name}
                  onClick={() => setSelectedTool(tool)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-md'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-white">{tool.name}</span>
                    {isSideEffect ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                        Side Effect (Gated)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        Read Only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{tool.description}</p>
                </div>
              );
            })}
          </div>

          {/* Tool Details / Schema */}
          <div className="md:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            {selectedTool ? (
              <>
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white font-mono">{selectedTool.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{selectedTool.description}</p>
                  </div>
                  {selectedTool.name === 'process_refund' && (
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Approval Required</span>
                    </div>
                  )}
                </div>

                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Input Schema (JSON Schema)
                  </h5>
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-80">
                    {JSON.stringify(selectedTool.inputSchema, null, 2)}
                  </pre>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Required fields: {selectedTool.inputSchema.required?.join(', ') || 'None'}
                  </span>
                  <button
                    onClick={() => {
                      setRpcMethod('tools/call');
                      setRpcParams(
                        JSON.stringify(
                          {
                            name: selectedTool.name,
                            arguments: selectedTool.name === 'search_customers' ? { query: 'Priya' } : {},
                          },
                          null,
                          2
                        )
                      );
                      setActiveSubTab('jsonrpc');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition"
                  >
                    Load into JSON-RPC Runner →
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 text-center py-10">Select a tool to view schema</div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Resources */}
      {activeSubTab === 'resources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((res) => (
              <div key={res.uri} className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400">{res.uri}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {res.mimeType}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white">{res.name}</h4>
                <p className="text-xs text-slate-400">{res.description}</p>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => handleReadResource(res.uri)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition"
                  >
                    Read Resource
                  </button>
                </div>

                {resourceOutput[res.uri] && (
                  <pre className="mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {resourceOutput[res.uri]}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 3: Prompts */}
      {activeSubTab === 'prompts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((p) => (
            <div key={p.name} className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-violet-400">{p.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold">
                  Prompt Template
                </span>
              </div>
              <p className="text-xs text-slate-300">{p.description}</p>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Arguments:
                </span>
                <div className="space-y-1">
                  {p.arguments.map((arg) => (
                    <div key={arg.name} className="text-xs font-mono flex items-center space-x-2 text-slate-300">
                      <span className="text-indigo-400">{arg.name}</span>
                      <span className="text-slate-500">— {arg.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtab 4: JSON-RPC Runner */}
      {activeSubTab === 'jsonrpc' && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Code2 className="h-4 w-4 text-indigo-400" />
              <span>Direct MCP JSON-RPC 2.0 Runner</span>
            </h4>
            <div className="flex items-center space-x-1.5">
              {['initialize', 'tools/list', 'resources/list', 'prompts/list'].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setRpcMethod(m);
                    setRpcParams('{}');
                  }}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-800 transition"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Method</label>
                <input
                  type="text"
                  value={rpcMethod}
                  onChange={(e) => setRpcMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Params (JSON)</label>
                <textarea
                  rows={8}
                  value={rpcParams}
                  onChange={(e) => setRpcParams(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleRunRpc}
                disabled={isExecutingRpc}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Execute JSON-RPC Call</span>
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">JSON-RPC 2.0 Response</label>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-auto h-[290px]">
                {rpcOutput}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
