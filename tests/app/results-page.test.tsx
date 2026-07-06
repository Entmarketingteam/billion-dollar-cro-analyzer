import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SiteResultsPage from '@/app/dashboard/[siteId]/page';
import type { TestRun } from '@/types';

// Mock Next.js navigation - must be before any imports that use it
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Site Results Page', () => {
  const mockSiteId = 'site-123';
  const mockTestRun: TestRun = {
    id: 'run-1',
    site_id: mockSiteId,
    status: 'completed',
    started_at: '2024-01-01T10:00:00Z',
    completed_at: '2024-01-01T10:15:00Z',
    error_message: null,
    results: {
      test_plan: {
        tests: [
          {
            id: 'test-1',
            hypothesis: 'Test hypothesis 1',
            effort_hours: 5,
            expected_lift_min: 10,
            expected_lift_max: 20,
          },
        ],
        generated_at: '2024-01-01T10:05:00Z',
      },
      audit_result: {
        checklist_items: [
          {
            id: 'item-1',
            category: 'Performance',
            label: 'Page load time',
            passed: true,
            notes: null,
            screenshot_url: null,
          },
        ],
        score_pct: 85,
      },
      verification: {
        verified: true,
        confidence: 85,
        issues: [],
        verifiedAt: '2024-01-01T10:10:00Z',
      },
    },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:15:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders results page with test runs', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([mockTestRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    // Wait for Suspense to resolve
    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });
  });

  it('displays "No analyses yet" when no test runs exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText(/No analyses yet/i)).toBeInTheDocument();
    });
  });

  it('displays test run in sidebar', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([mockTestRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });
  });

  it('allows clicking a test run to view its details', async () => {
    const runs = [
      { ...mockTestRun, id: 'run-1', status: 'completed' as const },
      { ...mockTestRun, id: 'run-2', status: 'completed' as const },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(runs),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    // Click on first run to select it
    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    // Results panel should now show
    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
    });
  });

  it('displays Results header and status badge when a run is selected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([mockTestRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('displays verification badge when verified', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([mockTestRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Results Verified')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // confidence score
    });
  });

  it('displays unverified state with confidence percentage', async () => {
    const unverifiedRun = {
      ...mockTestRun,
      results: {
        ...mockTestRun.results,
        verification: {
          verified: false,
          confidence: 45,
          issues: ['Missing trust signals', 'Low mobile optimization'],
          verifiedAt: '2024-01-01T10:10:00Z',
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([unverifiedRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Verification Note')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  it('displays issues list when verification has issues', async () => {
    const runWithIssues = {
      ...mockTestRun,
      results: {
        ...mockTestRun.results,
        verification: {
          verified: false,
          confidence: 55,
          issues: ['Issue 1', 'Issue 2', 'Issue 3'],
          verifiedAt: '2024-01-01T10:10:00Z',
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([runWithIssues]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Issues Found:')).toBeInTheDocument();
      expect(screen.getByText('Issue 1')).toBeInTheDocument();
      expect(screen.getByText('Issue 2')).toBeInTheDocument();
      expect(screen.getByText('Issue 3')).toBeInTheDocument();
    });
  });

  it('displays audit and test plan when results exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([mockTestRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Recommended Tests')).toBeInTheDocument();
      expect(screen.getByText('Overall Audit Score')).toBeInTheDocument();
    });
  });

  it('displays error state when status is error', async () => {
    const errorRun = {
      ...mockTestRun,
      status: 'error' as const,
      error_message: 'Failed to connect to website',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([errorRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to connect to website')).toBeInTheDocument();
    });
  });

  it('displays loading spinner when run is pending', async () => {
    const pendingRun = {
      ...mockTestRun,
      status: 'pending' as const,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([pendingRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Analysis in progress...')).toBeInTheDocument();
    });
  });

  it('displays running status with spinner', async () => {
    const runningRun = {
      ...mockTestRun,
      status: 'running' as const,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([runningRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Analysis in progress...')).toBeInTheDocument();
    });
  });

  it('displays completed status with results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([mockTestRun]),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Overall Audit Score')).toBeInTheDocument();
    });
  });

  it('highlights selected run in sidebar', async () => {
    const runs = [
      { ...mockTestRun, id: 'run-1', status: 'completed' as const },
      { ...mockTestRun, id: 'run-2', status: 'completed' as const },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(runs),
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SiteResultsPage params={Promise.resolve({ siteId: mockSiteId })} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => {
      const selectedButton = buttons[0];
      expect(selectedButton).toHaveClass('border-blue-500', 'bg-blue-50');
    });
  });

});
