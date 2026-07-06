/**
 * Integration test for the results page behavior
 * Tests the client-side logic without async server component Suspense complexity
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { TestRun } from '@/types';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Site Results Page - Integration Tests', () => {
  const mockTestRun: TestRun = {
    id: 'run-1',
    site_id: 'site-123',
    status: 'completed',
    started_at: '2024-01-01T10:00:00Z',
    completed_at: '2024-01-01T10:15:00Z',
    error_message: null,
    results: {
      test_plan: {
        tests: [
          {
            id: 'test-1',
            hypothesis: 'Button color improves CTR',
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
          {
            id: 'item-2',
            category: 'Mobile',
            label: 'Touch targets',
            passed: false,
            notes: 'Buttons are too small',
            screenshot_url: null,
          },
        ],
        score_pct: 75,
      },
      verification: {
        verified: true,
        confidence: 82,
        issues: [],
        verifiedAt: '2024-01-01T10:10:00Z',
      },
    },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:15:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StatusBadge component', () => {
    it('displays correct colors for different statuses', async () => {
      // Import StatusBadge directly to test in isolation
      const { StatusBadge } = await import('@/components/StatusBadge');

      const { rerender } = render(<StatusBadge status="completed" />);
      let badge = screen.getByText('Completed');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');

      rerender(<StatusBadge status="pending" />);
      badge = screen.getByText('Pending');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');

      rerender(<StatusBadge status="running" />);
      badge = screen.getByText('Running');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');

      rerender(<StatusBadge status="error" />);
      badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('AuditDisplay component', () => {
    it('groups audit items by category', async () => {
      const { AuditDisplay } = await import('@/components/AuditDisplay');

      render(<AuditDisplay auditResult={mockTestRun.results?.audit_result} />);

      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('shows pass/fail indicators correctly', async () => {
      const { AuditDisplay } = await import('@/components/AuditDisplay');

      render(<AuditDisplay auditResult={mockTestRun.results?.audit_result} />);

      const checkmarks = screen.getAllByText('✓');
      const xmarks = screen.getAllByText('✗');

      expect(checkmarks.length).toBeGreaterThan(0);
      expect(xmarks.length).toBeGreaterThan(0);
    });
  });

  describe('TestPlanDisplay component', () => {
    it('displays test plan with effort and expected lift', async () => {
      const { TestPlanDisplay } = await import('@/components/TestPlanDisplay');

      render(<TestPlanDisplay testPlan={mockTestRun.results?.test_plan} />);

      expect(screen.getByText('Button color improves CTR')).toBeInTheDocument();
      expect(screen.getByText('Effort: 5')).toBeInTheDocument();
      expect(screen.getByText('Expected lift: 10–20%')).toBeInTheDocument();
    });
  });

  describe('SiteCard component', () => {
    it('renders analyze button and link to results', () => {
      // SiteCard is a client component
      const { default: SiteCard } = require('@/components/SiteCard');

      const mockSite = {
        id: 'site-1',
        name: 'Test Store',
        url: 'https://example.com',
      };

      render(<SiteCard site={mockSite} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      const viewLink = screen.getByRole('link', { name: /View Results/i });

      expect(analyzeButton).toBeInTheDocument();
      expect(viewLink).toHaveAttribute('href', '/dashboard/site-1');
    });

    it('shows loading state when analyzing', async () => {
      const { default: SiteCard } = require('@/components/SiteCard');

      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true }), 100);
        })
      );

      const mockSite = {
        id: 'site-1',
        name: 'Test Store',
        url: 'https://example.com',
      };

      render(<SiteCard site={mockSite} />);
      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });

      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Analyzing/ })).toBeInTheDocument();
      });
    });
  });
});
