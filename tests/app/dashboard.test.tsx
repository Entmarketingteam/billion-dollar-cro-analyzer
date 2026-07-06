import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

// Mock the database module
jest.mock('@/lib/db', () => ({
  listSites: jest.fn(),
}));

import { listSites } from '@/lib/db';

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(screen.getByText('No sites connected yet')).toBeInTheDocument();
  });

  it('renders a grid of SiteCard components when sites are present', async () => {
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

  it('renders one SiteCard for each site', async () => {
    const mockSites = [
      { id: '1', name: 'Store One', url: 'https://store1.com' },
      { id: '2', name: 'Store Two', url: 'https://store2.com' },
    ];
    (listSites as jest.Mock).mockResolvedValue(mockSites);
    const component = await DashboardPage();
    render(component);

    // Each card should have a "View Results" and "Analyze" button
    const viewResultsButtons = screen.getAllByRole('link', { name: /View Results/i });
    const analyzeButtons = screen.getAllByRole('button', { name: /Analyze/i });

    expect(viewResultsButtons).toHaveLength(mockSites.length);
    expect(analyzeButtons).toHaveLength(mockSites.length);
  });
});
