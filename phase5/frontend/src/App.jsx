import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import AssistantChat from './components/AssistantChat.jsx';
import DocumentManager from './components/DocumentManager.jsx';
import SearchComparison from './components/SearchComparison.jsx';
import EvaluationDashboard from './components/EvaluationDashboard.jsx';
import CitationModal from './components/CitationModal.jsx';

export default function App() {
  const [tenants, setTenants] = useState(['tenant_engineering', 'tenant_hr']);
  const [currentTenant, setCurrentTenant] = useState('tenant_engineering');
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedCitation, setSelectedCitation] = useState(null);

  useEffect(() => {
    fetch('/api/tenants')
      .then(res => res.json())
      .then(data => {
        if (data.tenants && data.tenants.length > 0) {
          setTenants(data.tenants);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="app-container">
      <Header 
        tenants={tenants}
        currentTenant={currentTenant}
        onSelectTenant={setCurrentTenant}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <main className="main-content">
        {activeTab === 'chat' && (
          <AssistantChat 
            currentTenant={currentTenant}
            onOpenCitation={setSelectedCitation}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentManager 
            currentTenant={currentTenant}
          />
        )}

        {activeTab === 'comparison' && (
          <SearchComparison 
            currentTenant={currentTenant}
            onOpenCitation={setSelectedCitation}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationDashboard />
        )}
      </main>

      {/* Verified Citation Modal */}
      {selectedCitation && (
        <CitationModal 
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}
