import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
          Billion-Dollar CRO Analyzer
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl">
          Apply billion-dollar brand conversion frameworks to your Shopify store.
          Get a prioritized test plan backed by real data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Dashboard
        </Link>
        <a
          href="https://github.com/Entmarketingteam/billion-dollar-cro-analyzer"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          View on GitHub
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 text-left max-w-3xl w-full">
        {[
          {
            title: "Audit",
            desc: "Playwright-powered checklist audit of your store against 50+ CRO criteria",
          },
          {
            title: "Analyze",
            desc: "Claude identifies the highest-ROI tests from the billion-dollar playbook",
          },
          {
            title: "Execute",
            desc: "Prioritized test plan with effort estimates and expected conversion lift",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
