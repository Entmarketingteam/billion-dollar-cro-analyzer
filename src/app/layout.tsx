import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRO Analyzer",
  description: "Billion-dollar CRO framework analyzer for Shopify stores",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">
                  CRO Analyzer
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Beta
                </span>
              </div>
              <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
                <a href="/" className="hover:text-gray-900 transition-colors">
                  Home
                </a>
                <a
                  href="/dashboard"
                  className="hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
