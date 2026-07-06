'use client';

import { useEffect, useRef, useState } from 'react';
import type { TestRun } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import AuditDisplay from '@/components/AuditDisplay';
import TestPlanDisplay from '@/components/TestPlanDisplay';

export default function SiteResultsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchRuns() {
    const res = await fetch(`/api/test-run?siteId=${siteId}`);
    const data: TestRun[] = await res.json();
    setRuns(data);
    // If a run is selected, update it in place from the fresh data
    if (selectedRun) {
      const updated = data.find((r) => r.id === selectedRun.id);
      if (updated) setSelectedRun(updated);
    }
    setLoading(false);
  }

  // Fetch on mount and when selectedRun.id changes
  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRun?.id]);

  // Poll every 2s while selected run is running
  useEffect(() => {
    if (selectedRun?.status !== 'running') return;
    const interval = setInterval(fetchRuns, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRun?.status, selectedRun?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No analyses yet</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 mb-6 lg:mb-0">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis History</h2>
          <div className="space-y-2">
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={`w-full text-left p-3 rounded border-2 transition-colors ${
                  selectedRun?.id === run.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">
                  {new Date(run.created_at).toLocaleString()}
                </p>
                <StatusBadge status={run.status} />
              </button>
            ))}
          </div>
        </div>

        {/* Main panel */}
        {selectedRun && (
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Results</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {new Date(selectedRun.created_at).toLocaleString()}
                  </span>
                  <StatusBadge status={selectedRun.status} />
                </div>
              </div>

              {/* Error state */}
              {selectedRun.status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                  {selectedRun.error_message ?? 'An error occurred during analysis.'}
                </div>
              )}

              {/* Completed state */}
              {selectedRun.status === 'completed' && selectedRun.results && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <AuditDisplay auditResult={selectedRun.results.audit_result} />
                  <TestPlanDisplay testPlan={selectedRun.results.test_plan} />
                </div>
              )}

              {/* Pending / running state */}
              {(selectedRun.status === 'pending' || selectedRun.status === 'running') && (
                <div className="flex flex-col items-center justify-center py-16">
                  <span className="inline-block animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mb-4" />
                  <p className="text-gray-600">Analysis in progress...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
