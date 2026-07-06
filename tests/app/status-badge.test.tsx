import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/StatusBadge';
import type { TestRunStatus } from '@/types';

describe('StatusBadge Component', () => {
  it('renders pending status with correct styling', () => {
    render(<StatusBadge status="pending" />);

    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('renders running status with correct styling', () => {
    render(<StatusBadge status="running" />);

    const badge = screen.getByText('Running');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('renders completed status with correct styling', () => {
    render(<StatusBadge status="completed" />);

    const badge = screen.getByText('Completed');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('renders error status with correct styling', () => {
    render(<StatusBadge status="error" />);

    const badge = screen.getByText('Error');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('applies correct base classes to all statuses', () => {
    const statuses: TestRunStatus[] = ['pending', 'running', 'completed', 'error'];

    for (const status of statuses) {
      const { unmount } = render(<StatusBadge status={status} />);

      const badge = screen.getByRole('img', { hidden: true })?.parentElement || screen.getByText(/Pending|Running|Completed|Error/);
      expect(badge).toHaveClass('inline-flex', 'items-center', 'px-2.5', 'py-0.5', 'rounded-full', 'text-xs', 'font-medium');

      unmount();
    }
  });
});
