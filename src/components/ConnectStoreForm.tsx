'use client';

import { useState } from 'react';

export default function ConnectStoreForm() {
  const [shop, setShop] = useState('');

  function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!shop.trim()) return;
    window.location.href = `/api/shopify/authorize?shop=${encodeURIComponent(shop.trim())}`;
  }

  return (
    <form onSubmit={connect} className="flex gap-2 mt-6" data-testid="connect-store-form">
      <input
        type="text"
        value={shop}
        onChange={(e) => setShop(e.target.value)}
        placeholder="stiffpour.co or your-store.myshopify.com"
        className="flex-1 max-w-sm border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
      />
      <button
        type="submit"
        className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 transition-colors"
      >
        Connect Shopify Store
      </button>
    </form>
  );
}
