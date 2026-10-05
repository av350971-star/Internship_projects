import React, { useState } from 'react';
import { Search, MapPin, Mail, Phone, ShoppingBag, MessageSquare, Award } from 'lucide-react';
import { api, type Customer, type Order } from '../lib/api';

interface CustomersHubProps {
  customers: Customer[];
  onSelectCustomerForChat: (customer: Customer) => void;
  onRefreshAll?: () => void;
}

export const CustomersHub: React.FC<CustomersHubProps> = ({
  customers,
  onSelectCustomerForChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.tier.toLowerCase().includes(q)
    );
  });

  const handleViewOrders = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsLoadingOrders(true);
    try {
      const orders = await api.getCustomerOrders(customer.id);
      setCustomerOrders(orders);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'gold':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
            <Award className="h-3 w-3" />
            <span>Gold VIP</span>
          </span>
        );
      case 'silver':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-300/20 text-slate-300 border border-slate-400/30 flex items-center space-x-1">
            <Award className="h-3 w-3" />
            <span>Silver</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Basic
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, city, tier or ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filteredCustomers.length}</span> of {customers.length} customers
        </div>
      </div>

      {/* Grid of Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="glass-card rounded-xl p-4 border border-slate-800 hover:border-indigo-500/40 transition group flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-indigo-400 font-medium">{cust.id}</span>
                {getTierBadge(cust.tier)}
              </div>

              {/* Name */}
              <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                {cust.name}
              </h4>

              {/* Details */}
              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center space-x-2 truncate">
                  <Mail className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{cust.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <span>{cust.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  <span>{cust.city}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center space-x-2">
              <button
                onClick={() => handleViewOrders(cust)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center space-x-1 transition"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-violet-400" />
                <span>Orders</span>
              </button>

              <button
                onClick={() => onSelectCustomerForChat(cust)}
                className="py-1.5 px-2.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-center space-x-1 transition"
                title="Ask Copilot about this customer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Ask AI</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Orders Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>{selectedCustomer.name}</span>
                  <span className="text-xs font-mono text-slate-400">({selectedCustomer.id})</span>
                </h3>
                <p className="text-xs text-slate-400">{selectedCustomer.email} • {selectedCustomer.city}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Orders list */}
            {isLoadingOrders ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading order history...</div>
            ) : customerOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No orders found for this customer.</div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {customerOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">{ord.id}</span>
                        <span className="text-xs text-slate-300 font-medium">{ord.item}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{ord.date}</span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-white font-mono">₹{ord.amount.toLocaleString('en-IN')}</div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : ord.status === 'refunded'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : ord.status === 'shipped'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
