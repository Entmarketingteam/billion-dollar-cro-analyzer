'use client';

import type { FixPack } from '@/types';

const IMPACT_STYLES: Record<FixPack['impact'], string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function FixPackDisplay({ fixPacks }: { fixPacks: FixPack[] }) {
  if (!fixPacks || fixPacks.length === 0) return null;

  return (
    <div data-testid="fix-packs" className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Recommended Fixes
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Implementation-ready — ordered by expected impact
      </p>
      <div className="space-y-4">
        {fixPacks.map((fix) => (
          <div key={fix.id} className="border rounded-lg p-5 bg-white">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-gray-900">{fix.finding}</p>
              <span
                className={`shrink-0 text-xs font-semibold uppercase px-2 py-1 rounded ${IMPACT_STYLES[fix.impact]}`}
              >
                {fix.impact}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{fix.why}</p>

            {fix.steps.length > 0 && (
              <ol className="mt-3 space-y-1 text-sm text-gray-800 list-decimal list-inside">
                {fix.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}

            {fix.copy_example && (
              <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-gray-800">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                  Ready-to-use copy
                </p>
                <p className="whitespace-pre-wrap">{fix.copy_example}</p>
              </div>
            )}

            {fix.snippet && (
              <pre className="mt-3 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                <code>{fix.snippet}</code>
              </pre>
            )}

            {fix.shopify_apps.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Suggested apps: {fix.shopify_apps.join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
