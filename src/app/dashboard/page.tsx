import { listSites } from '@/lib/db';
import SiteCard from '@/components/SiteCard';

export default async function DashboardPage() {
  const sites = await listSites();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600 mt-2">View and analyze your Shopify stores</p>

      {sites.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">No sites connected yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {sites.map((site) => (
            <SiteCard key={site.id} site={{ id: site.id, name: site.name, url: site.url }} />
          ))}
        </div>
      )}
    </div>
  );
}
