'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SiteCardProps {
  site: {
    id: string;
    name: string;
    url: string;
  };
}

export default function SiteCard({ site }: SiteCardProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await fetch('/api/analyze-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id }),
      });
      router.push(`/dashboard/${site.id}`);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div data-testid="site-card" data-site-id={site.id} className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-gray-900">{site.name}</h3>
      <p className="text-sm text-gray-500 truncate mt-1">{site.url}</p>
      <div className="flex gap-2 mt-4">
        <Link
          href={`/dashboard/${site.id}`}
          className="flex-1 text-center text-sm bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 transition-colors"
        >
          View Results
        </Link>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex-1 text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
    </div>
  );
}
