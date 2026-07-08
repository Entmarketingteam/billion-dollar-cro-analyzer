import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the navigation before importing components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the database module
jest.mock('@/lib/db', () => ({
  listSites: jest.fn(),
}));

import DashboardPage from '@/app/dashboard/page';
import { listSites } from '@/lib/db';

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock)?.mockClear();
  });

  it('renders dashboard title and description', async () => {
    (listSites as jest.Mock).mockResolvedValue([]);
    const component = await DashboardPage();
    render(component);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('View and analyze your Shopify stores')).toBeInTheDocument();
  });

  it('displays "No sites connected yet" when there are no sites', async () => {
    (listSites as jest.Mock).mockResolvedValue([]);
    const component = await DashboardPage();
    render(component);

    expect(screen.getByText(/No sites connected yet/)).toBeInTheDocument();
  });

  it('renders site names and URLs when sites are present', async () => {
    const mockSites = [
      { id: '1', name: 'Store One', url: 'https://store1.com' },
      { id: '2', name: 'Store Two', url: 'https://store2.com' },
      { id: '3', name: 'Store Three', url: 'https://store3.com' },
    ];
    (listSites as jest.Mock).mockResolvedValue(mockSites);
    const component = await DashboardPage();
    render(component);

    // All site names should be visible
    for (const site of mockSites) {
      expect(screen.getByText(site.name)).toBeInTheDocument();
    }

    // All site URLs should be visible
    for (const site of mockSites) {
      expect(screen.getByText(site.url)).toBeInTheDocument();
    }
  });

  it('renders View Results link for each site', async () => {
    const mockSites = [
      { id: '1', name: 'Store One', url: 'https://store1.com' },
      { id: '2', name: 'Store Two', url: 'https://store2.com' },
    ];
    (listSites as jest.Mock).mockResolvedValue(mockSites);
    const component = await DashboardPage();
    render(component);

    // Each card should have a "View Results" link
    const viewResultsLinks = screen.getAllByRole('link', { name: /View Results/i });
    expect(viewResultsLinks).toHaveLength(mockSites.length);
  });
});
