import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SiteCard from '@/components/SiteCard';

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('SiteCard Component', () => {
  const mockSite = {
    id: 'site-1',
    name: 'Test Store',
    url: 'https://example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();
  });

  it('renders site name and URL', () => {
    render(<SiteCard site={mockSite} />);

    expect(screen.getByText(mockSite.name)).toBeInTheDocument();
    expect(screen.getByText(mockSite.url)).toBeInTheDocument();
  });

  it('renders View Results link that navigates to site details page', () => {
    render(<SiteCard site={mockSite} />);

    const viewResultsLink = screen.getByRole('link', { name: /View Results/i });
    expect(viewResultsLink).toHaveAttribute('href', `/dashboard/${mockSite.id}`);
  });

  it('renders Analyze button', () => {
    render(<SiteCard site={mockSite} />);

    const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
    expect(analyzeButton).toBeInTheDocument();
  });

  it('displays "Analyzing..." text when analyze is in progress', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          // Simulate slow API call
          setTimeout(() => resolve({ ok: true }), 100);
        })
    );

    render(<SiteCard site={mockSite} />);
    const analyzeButton = screen.getByRole('button', { name: /Analyze/i });

    fireEvent.click(analyzeButton);

    // The button should show "Analyzing..." while the fetch is pending
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Analyzing\.\.\./ })).toBeInTheDocument();
    });
  });

  it('sends analyze request to correct API endpoint with site ID', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    render(<SiteCard site={mockSite} />);
    const analyzeButton = screen.getByRole('button', { name: /Analyze/i });

    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analyze-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: mockSite.id }),
      });
    });
  });

  it('navigates to site dashboard after analyze completes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    render(<SiteCard site={mockSite} />);
    const analyzeButton = screen.getByRole('button', { name: /Analyze/i });

    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/dashboard/${mockSite.id}`);
    });
  });

  it('disables Analyze button during analysis', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true }), 100);
        })
    );

    render(<SiteCard site={mockSite} />);
    const analyzeButton = screen.getByRole('button', { name: /Analyze/i });

    fireEvent.click(analyzeButton);

    // Button should be disabled while analyzing
    await waitFor(() => {
      expect(analyzeButton).toBeDisabled();
    });
  });

  it('re-enables Analyze button after analysis completes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    render(<SiteCard site={mockSite} />);
    const analyzeButton = screen.getByRole('button', { name: /Analyze/i });

    fireEvent.click(analyzeButton);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(analyzeButton).not.toBeDisabled();
    });
  });

  it('handles API errors gracefully and re-enables button', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<SiteCard site={mockSite} />);
    const analyzeButton = screen.getByRole('button', { name: /Analyze/i });

    fireEvent.click(analyzeButton);

    // Button should be re-enabled after error
    await waitFor(() => {
      expect(analyzeButton).not.toBeDisabled();
    });
  });
});
