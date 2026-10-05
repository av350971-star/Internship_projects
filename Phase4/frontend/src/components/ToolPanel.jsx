import React, { useState } from 'react';

export default function ToolPanel({ tools }) {
  const [expandedSchemas, setExpandedSchemas] = useState({});

  const toggleSchema = (name) => {
    setExpandedSchemas((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="tab-content" id="tools-registry-container">
      <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Central Tool Registry ({tools.length} Tools Registered)
      </div>

      {tools.map((tool) => {
        const isExpanded = !!expandedSchemas[tool.name];

        return (
          <div key={tool.name} className="tool-card" id={`tool-card-${tool.name}`}>
            <div className="tool-card-title">
              <span className="tool-name">🔧 {tool.name}</span>
              {tool.side_effect ? (
                <span
                  className="badge badge-warning"
                  title="Side Effect: Mutates system state (database/emails); strictly requires human confirmation before execution"
                >
                  ⚠️ SIDE EFFECT (APPROVAL REQ)
                </span>
              ) : (
                <span
                  className="badge badge-success"
                  title="Read-Only: Safe query that does not modify any system state"
                >
                  ✓ READ-ONLY
                </span>
              )}
            </div>

            <p className="tool-desc">{tool.description}</p>

            <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginBottom: '4px' }}>
              Authorized Roles:
            </div>
            <div className="tool-roles-list">
              {tool.allowed_roles.map((r) => (
                <span key={r} className="badge badge-neutral">
                  {r}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="log-details-toggle"
              onClick={() => toggleSchema(tool.name)}
            >
              <span>{isExpanded ? '▼ Hide JSON Schema' : '▶ Inspect Pydantic JSON Schema'}</span>
            </button>

            {isExpanded && (
              <pre className="log-details">
                {JSON.stringify(tool.input_schema, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
