'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GA4Property {
  propertyId: string;
  displayName: string;
  accountName: string;
}

export default function GA4SetupPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = use(params);
  const router = useRouter();
  const [properties, setProperties] = useState<GA4Property[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ga4/properties?siteId=${siteId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Fetch failed');
        return res.json();
      })
      .then((data) => setProperties(data.properties))
      .catch((e) => setError(e.message));
  }, [siteId]);

  async function selectProperty(propertyId: string) {
    setSaving(propertyId);
    try {
      const res = await fetch('/api/ga4/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, propertyId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      router.push(`/dashboard/${siteId}?ga4=connected`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Select GA4 Property</h1>
      <p className="text-gray-600 mt-2">
        Pick the Google Analytics property for this store. Metrics will be
        pulled from it on every analysis.
      </p>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!properties && !error && (
        <div className="mt-8 text-gray-500">Loading properties…</div>
      )}

      {properties && properties.length === 0 && (
        <div className="mt-8 text-gray-500">
          No GA4 properties found on this Google account.
        </div>
      )}

      {properties && properties.length > 0 && (
        <ul className="mt-6 divide-y border rounded-lg bg-white">
          {properties.map((p) => (
            <li key={p.propertyId}>
              <button
                onClick={() => selectProperty(p.propertyId)}
                disabled={saving !== null}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <span className="font-medium text-gray-900">
                  {p.displayName}
                </span>
                <span className="block text-sm text-gray-500">
                  {p.accountName} · property {p.propertyId}
                </span>
                {saving === p.propertyId && (
                  <span className="text-sm text-blue-600">Saving…</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
