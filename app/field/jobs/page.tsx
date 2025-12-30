'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSupabaseQuery } from '@/lib/offline/swr';
import { 
  MapPin, 
  Calendar, 
  ChevronRight, 
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Job {
  id: string;
  name: string;
  job_address_street: string;
  job_address_city: string;
  scheduled_date: string;
  scheduled_time_start: string;
  stage: {
    name: string;
    color: string;
  };
  customer: {
    name: string;
    company: string;
  };
  photos_required_before: boolean;
  photos_required_after: boolean;
  checklists: {
    id: string;
    items: { is_checked: boolean }[];
  }[];
}

export default function FieldJobsPage() {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch assigned jobs for field users
  const { data: jobs, error, isLoading, mutate } = useSupabaseQuery<Job[]>(
    'field-jobs',
    async (supabase) => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          name,
          job_address_street,
          job_address_city,
          scheduled_date,
          scheduled_time_start,
          photos_required_before,
          photos_required_after,
          stage:job_stages(name, color),
          customer:customers(name, company),
          checklists:job_checklists(
            id,
            items:job_checklist_items(is_checked)
          )
        `)
        .eq('stage.is_field_visible', true)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as Job[];
    }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  };

  const getChecklistProgress = (job: Job) => {
    const allItems = job.checklists?.flatMap(c => c.items) || [];
    const checked = allItems.filter(i => i.is_checked).length;
    return { checked, total: allItems.length };
  };

  // Group jobs by date
  const groupedJobs = jobs?.reduce((acc, job) => {
    const date = job.scheduled_date || 'Unscheduled';
    if (!acc[date]) acc[date] = [];
    acc[date].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Jobs</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-icon"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/60">Failed to load jobs</p>
          <button onClick={handleRefresh} className="btn-secondary mt-4">
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {jobs?.length === 0 && (
        <div className="card p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
          <p className="text-white/60">No jobs assigned to you right now.</p>
        </div>
      )}

      {/* Jobs list grouped by date */}
      {groupedJobs && Object.entries(groupedJobs).map(([date, dateJobs]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {date === 'Unscheduled' 
              ? 'Unscheduled' 
              : format(new Date(date), 'EEEE, MMMM d')}
          </h3>

          {dateJobs.map((job) => {
            const progress = getChecklistProgress(job);
            
            return (
              <Link
                key={job.id}
                href={`/field/jobs/${job.id}`}
                className="card-interactive block p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-lg truncate">
                      {job.name}
                    </h4>
                    <p className="text-white/60 text-sm">
                      {job.customer?.company || job.customer?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="badge"
                      style={{ 
                        backgroundColor: `${job.stage?.color}20`,
                        color: job.stage?.color 
                      }}
                    >
                      {job.stage?.name}
                    </span>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {job.job_address_street}, {job.job_address_city}
                  </span>
                </div>

                {/* Time & Progress */}
                <div className="flex items-center justify-between">
                  {job.scheduled_time_start && (
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{job.scheduled_time_start}</span>
                    </div>
                  )}
                  
                  {progress.total > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-dark-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${(progress.checked / progress.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/60">
                        {progress.checked}/{progress.total}
                      </span>
                    </div>
                  )}
                </div>

                {/* Photo requirements */}
                {(job.photos_required_before || job.photos_required_after) && (
                  <div className="mt-3 pt-3 border-t border-dark-border flex gap-2">
                    {job.photos_required_before && (
                      <span className="badge badge-pending text-xs">
                        📷 Before photos required
                      </span>
                    )}
                    {job.photos_required_after && (
                      <span className="badge badge-pending text-xs">
                        📷 After photos required
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
