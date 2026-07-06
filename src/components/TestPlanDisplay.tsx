export default function TestPlanDisplay({ testPlan }: { testPlan: any }) {
  if (!testPlan) {
    return <p className="text-gray-500">No test plan available</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Recommended Tests</h3>
      {testPlan.tests?.map((test: any, i: number) => (
        <div key={test.id ?? i} className="p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium">{test.hypothesis ?? test.name}</h4>
            <span className="text-sm bg-purple-100 text-purple-700 rounded px-2 py-0.5">
              Effort: {test.effort ?? test.effort_hours}
            </span>
          </div>
          {test.description && (
            <p className="text-sm text-gray-600">{test.description}</p>
          )}
          {(test.expected_lift_min != null || test.expected_lift != null) && (
            <p className="text-sm text-green-600 font-medium">
              Expected lift:{' '}
              {test.expected_lift_min != null
                ? `${test.expected_lift_min}–${test.expected_lift_max}%`
                : test.expected_lift}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
