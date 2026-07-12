import { listSites } from '@/lib/db';
import SiteCard from '@/components/SiteCard';
import ConnectStoreForm from '@/components/ConnectStoreForm';

export const dynamic = 'force-dynamic';

const BANNERS: Record<string, { kind: 'error' | 'success'; text: string }> = {
  invalid_shop_domain: {
    kind: 'error',
    text: 'That doesn’t look like a Shopify admin domain. Enter the store’s myshopify handle (e.g. "your-store" or "your-store.myshopify.com") — the custom storefront domain (like stiffpour.co) won’t work for OAuth.',
  },
  store_added: { kind: 'success', text: 'Store connected successfully.' },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const banner = BANNERS[params.error ?? params.success ?? ''];
  const sites = await listSites();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600 mt-2">View and analyze your Shopify stores</p>

      {banner && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            banner.kind === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      <ConnectStoreForm />

      {sites.length === 0 ? (
        <div className="mt-12 text-center text-gray-500">
          No sites connected yet — connect your first Shopify store above
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={{
                id: site.id,
                name: site.name,
                url: site.url,
                ga4Connected: Boolean(site.ga4_property_id),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
