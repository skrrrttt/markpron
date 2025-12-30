'use client';

import { useState } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import Link from 'next/link';
import { 
  Plus, Search, Filter, FileText, DollarSign,
  Clock, CheckCircle, AlertCircle, Send
} from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  total: number;
  amount_paid: number;
  issue_date: string;
  due_date: string;
  customer: { id: string; name: string; company: string };
  job: { id: string; name: string };
}

const statusConfig = {
  draft: { label: 'Draft', color: '#94a3b8', icon: FileText },
  sent: { label: 'Sent', color: '#3b82f6', icon: Send },
  viewed: { label: 'Viewed', color: '#8b5cf6', icon: FileText },
  paid: { label: 'Paid', color: '#22c55e', icon: CheckCircle },
  overdue: { label: 'Overdue', color: '#ef4444', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: '#64748b', icon: FileText },
};

export default function AdminInvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch invoices
  const { data: invoices } = useSupabaseQuery<Invoice[]>(
    'admin-invoices',
    async (supabase) => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, company),
          job:jobs(id, name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    }
  );

  // Filter invoices
  const filteredInvoices = invoices?.filter(inv => {
    const matchesSearch = !searchQuery || 
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate totals
  const totals = {
    outstanding: filteredInvoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((sum, i) => sum + (i.total - i.amount_paid), 0),
    overdue: filteredInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.total - i.amount_paid), 0),
    paid: filteredInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount_paid, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-white/60 mt-1">{invoices?.length || 0} total invoices</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Outstanding</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">${totals.outstanding.toLocaleString()}</p>
        </div>
        <div className="card p-5 border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Overdue</span>
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">${totals.overdue.toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Collected (YTD)</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">${totals.paid.toLocaleString()}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`btn text-sm ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`}
          >
            All
          </button>
          {Object.entries(statusConfig).slice(0, 4).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className={`btn text-sm ${statusFilter === key ? '' : 'btn-secondary'}`}
              style={{
                backgroundColor: statusFilter === key ? `${config.color}30` : undefined,
                color: statusFilter === key ? config.color : undefined,
              }}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-bg">
            <tr>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Invoice</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Customer</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Job</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Status</th>
              <th className="text-left p-4 text-white/60 font-medium text-sm">Due Date</th>
              <th className="text-right p-4 text-white/60 font-medium text-sm">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {filteredInvoices.map((invoice) => {
              const config = statusConfig[invoice.status];
              return (
                <tr key={invoice.id} className="hover:bg-dark-card-hover transition-colors">
                  <td className="p-4">
                    <Link 
                      href={`/admin/invoices/${invoice.id}`}
                      className="font-medium text-white hover:text-brand-500"
                    >
                      {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                    </Link>
                    <p className="text-xs text-white/40 mt-0.5">
                      {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-white">{invoice.customer?.name}</p>
                    {invoice.customer?.company && (
                      <p className="text-sm text-white/40">{invoice.customer.company}</p>
                    )}
                  </td>
                  <td className="p-4 text-white/60">
                    {invoice.job?.name || '—'}
                  </td>
                  <td className="p-4">
                    <span 
                      className="badge"
                      style={{ 
                        backgroundColor: `${config.color}20`,
                        color: config.color 
                      }}
                    >
                      {config.label}
                    </span>
                  </td>
                  <td className="p-4 text-white/60">
                    {invoice.due_date 
                      ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <p className="font-semibold text-white">
                      ${invoice.total.toLocaleString()}
                    </p>
                    {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total && (
                      <p className="text-xs text-green-400">
                        ${invoice.amount_paid.toLocaleString()} paid
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12 text-white/40">
            No invoices found
          </div>
        )}
      </div>

      {/* Integration notice */}
      <div className="card p-5 border-blue-500/30 bg-blue-500/5">
        <h3 className="font-semibold text-white mb-2">💡 Payment Integration Coming Soon</h3>
        <p className="text-white/60 text-sm">
          Stripe payment processing and Microsoft Outlook email integration will be available in a future update.
          For now, you can manually track invoice status and record payments.
        </p>
      </div>
    </div>
  );
}
