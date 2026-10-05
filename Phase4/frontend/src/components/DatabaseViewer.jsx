import React, { useState, useEffect } from 'react';

export default function DatabaseViewer() {
  const [data, setData] = useState({ customers: [], orders: [], tickets: [], mock_emails: [] });
  const [activeTable, setActiveTable] = useState('tickets');
  const [loading, setLoading] = useState(false);

  const fetchDb = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database/inspect');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to inspect database', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDb();
  }, []);

  return (
    <div className="tab-content" id="database-viewer-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`id-pill ${activeTable === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTable('tickets')}
          >
            Tickets ({data.tickets.length})
          </button>
          <button
            type="button"
            className={`id-pill ${activeTable === 'emails' ? 'active' : ''}`}
            onClick={() => setActiveTable('emails')}
          >
            Mock Emails ({data.mock_emails.length})
          </button>
          <button
            type="button"
            className={`id-pill ${activeTable === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTable('orders')}
          >
            Orders ({data.orders.length})
          </button>
          <button
            type="button"
            className={`id-pill ${activeTable === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTable('customers')}
          >
            Customers ({data.customers.length})
          </button>
        </div>

        <button
          type="button"
          onClick={fetchDb}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px' }}
        >
          {loading ? 'Refreshing...' : '↺ Refresh State'}
        </button>
      </div>

      {activeTable === 'tickets' && (
        <div className="db-section">
          <div className="db-table-title">
            <span>🎫</span>
            <span>SQLite Table: tickets (Updated upon approved create_ticket)</span>
          </div>
          {data.tickets.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '12px' }}>
              No tickets found in database.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.map((t) => (
                    <tr key={t.ticket_id}>
                      <td style={{ color: '#38bdf8' }}>{t.ticket_id}</td>
                      <td>{t.customer_id}</td>
                      <td>{t.subject}</td>
                      <td>
                        <span className={`badge ${t.priority === 'high' ? 'badge-error' : t.priority === 'medium' ? 'badge-warning' : 'badge-neutral'}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td><span className="badge badge-success">{t.status}</span></td>
                      <td style={{ color: 'var(--text-subtle)' }}>{t.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTable === 'emails' && (
        <div className="db-section">
          <div className="db-table-title">
            <span>✉️</span>
            <span>Mock Emails Store: data/mock_emails.json</span>
          </div>
          {data.mock_emails.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '12px' }}>
              No simulated emails dispatched yet.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email ID</th>
                    <th>Mode</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Dispatched At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mock_emails.map((m) => (
                    <tr key={m.email_id}>
                      <td style={{ color: '#a855f7' }}>{m.email_id}</td>
                      <td><span className="badge badge-warning">MOCK EMAIL</span></td>
                      <td>{m.to}</td>
                      <td>{m.subject}</td>
                      <td style={{ color: 'var(--text-subtle)' }}>{m.sent_at?.slice(0, 19)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTable === 'orders' && (
        <div className="db-section">
          <div className="db-table-title">
            <span>📦</span>
            <span>SQLite Table: orders</span>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Item</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.order_id}>
                    <td style={{ color: '#38bdf8' }}>{o.order_id}</td>
                    <td>{o.customer_id}</td>
                    <td style={{ color: 'var(--text-subtle)' }}>{o.order_date}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>{o.total_amount} {o.currency}</td>
                    <td><span className="badge badge-neutral">{o.status}</span></td>
                    <td>{o.items_summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTable === 'customers' && (
        <div className="db-section">
          <div className="db-table-title">
            <span>👤</span>
            <span>SQLite Table: customers</span>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.customer_id}>
                    <td style={{ color: '#38bdf8' }}>{c.customer_id}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.email}</td>
                    <td style={{ color: 'var(--text-subtle)' }}>{c.phone}</td>
                    <td><span className="badge badge-success">{c.membership_tier}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
