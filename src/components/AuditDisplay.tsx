export default function AuditDisplay({ auditResult }: { auditResult: any }) {
  if (!auditResult) {
    return <p className="text-gray-500">No audit data available</p>;
  }

  // Group checklist_items by category
  const grouped: Record<string, any[]> = {};
  for (const item of auditResult.checklist_items ?? []) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-4xl font-bold text-gray-900">{auditResult.score_pct}%</p>
        <p className="text-gray-600 text-sm">Overall Audit Score</p>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">{category}</h4>
          <ul className="space-y-2">
            {items.map((check: any) => (
              <li key={check.id} className="flex items-start gap-3">
                <span className={`font-bold ${check.passed ? 'text-green-500' : 'text-red-500'}`}>
                  {check.passed ? '✓' : '✗'}
                </span>
                <div>
                  <p className="text-sm text-gray-900">{check.label}</p>
                  {check.notes && (
                    <p className="text-xs text-gray-500">{check.notes}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
