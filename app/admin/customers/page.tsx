'use client';

import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/lib/offline/swr';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Phone, Mail, MapPin, 
  Building2, Tag, ChevronRight, Briefcase
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address_city: string;
  address_state: string;
  notes: string;
  created_at: string;
  tags: { tag: { id: string; name: string; color: string } }[];
  jobs: { id: string }[];
}

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Fetch customers with their tags and job count
  const { data: customers, mutate } = useSupabaseQuery<Customer[]>(
    'admin-customers',
    async (supabase) => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          tags:customer_tags_junction(tag:custom_tags(*)),
          jobs(id)
        `)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Customer[];
    }
  );

  // Fetch available tags
  const { data: tags } = useSupabaseQuery(
    'customer-tags',
    async (supabase) => {
      const { data } = await supabase
        .from('custom_tags')
        .select('*')
        .eq('category', 'customer')
        .order('name');
      return data || [];
    }
  );

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter(customer => {
      const matchesSearch = !searchQuery || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery);
      
      const matchesTag = !selectedTag || 
        customer.tags.some(t => t.tag.id === selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [customers, searchQuery, selectedTag]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-white/60 mt-1">{customers?.length || 0} total customers</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Tag filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`btn text-sm ${!selectedTag ? 'btn-primary' : 'btn-secondary'}`}
          >
            All
          </button>
          {tags?.map((tag: any) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id === selectedTag ? null : tag.id)}
              className="btn text-sm"
              style={{
                backgroundColor: tag.id === selectedTag ? `${tag.color}30` : undefined,
                borderColor: tag.id === selectedTag ? tag.color : undefined,
                color: tag.id === selectedTag ? tag.color : undefined,
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Customers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Link
            key={customer.id}
            href={`/admin/customers/${customer.id}`}
            className="card-interactive p-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-dark-bg flex items-center justify-center">
                  {customer.company ? (
                    <Building2 className="w-6 h-6 text-white/40" />
                  ) : (
                    <span className="text-lg font-bold text-white/60">
                      {customer.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{customer.name}</h3>
                  {customer.company && (
                    <p className="text-sm text-white/60 truncate">{customer.company}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
            </div>

            {/* Contact info */}
            <div className="space-y-2 text-sm text-white/60 mb-4">
              {customer.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </p>
              )}
              {customer.email && (
                <p className="flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  {customer.email}
                </p>
              )}
              {customer.address_city && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {customer.address_city}, {customer.address_state}
                </p>
              )}
            </div>

            {/* Tags & job count */}
            <div className="flex items-center justify-between pt-3 border-t border-dark-border">
              <div className="flex flex-wrap gap-1">
                {customer.tags.slice(0, 2).map((t) => (
                  <span
                    key={t.tag.id}
                    className="tag"
                    style={{
                      backgroundColor: `${t.tag.color}20`,
                      color: t.tag.color,
                    }}
                  >
                    {t.tag.name}
                  </span>
                ))}
                {customer.tags.length > 2 && (
                  <span className="tag bg-dark-bg text-white/40">
                    +{customer.tags.length - 2}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Briefcase className="w-3 h-3" />
                {customer.jobs?.length || 0} jobs
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {filteredCustomers.length === 0 && (
        <div className="card p-12 text-center">
          <Building2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
          <p className="text-white/60 mb-4">
            {searchQuery 
              ? 'Try a different search term'
              : 'Add your first customer to get started'}
          </p>
          {!searchQuery && (
            <button className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
