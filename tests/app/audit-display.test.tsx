import React from 'react';
import { render, screen } from '@testing-library/react';
import AuditDisplay from '@/components/AuditDisplay';

describe('AuditDisplay Component', () => {
  it('displays "No audit data available" when auditResult is null', () => {
    render(<AuditDisplay auditResult={null} />);

    expect(screen.getByText('No audit data available')).toBeInTheDocument();
  });

  it('displays "No audit data available" when auditResult is undefined', () => {
    render(<AuditDisplay auditResult={undefined} />);

    expect(screen.getByText('No audit data available')).toBeInTheDocument();
  });

  it('renders overall audit score percentage', () => {
    const auditResult = {
      score_pct: 85,
      checklist_items: [],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Overall Audit Score')).toBeInTheDocument();
  });

  it('renders audit items grouped by category', () => {
    const auditResult = {
      score_pct: 75,
      checklist_items: [
        {
          id: '1',
          category: 'Performance',
          label: 'Page load time',
          passed: true,
          notes: null,
        },
        {
          id: '2',
          category: 'Performance',
          label: 'Image optimization',
          passed: false,
          notes: 'Images are not compressed',
        },
        {
          id: '3',
          category: 'Security',
          label: 'SSL certificate',
          passed: true,
          notes: null,
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('displays checkmark icon for passed items', () => {
    const auditResult = {
      score_pct: 80,
      checklist_items: [
        {
          id: '1',
          category: 'Performance',
          label: 'Page load time',
          passed: true,
          notes: null,
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    const checkmark = screen.getByText('✓');
    expect(checkmark).toBeInTheDocument();
    expect(checkmark).toHaveClass('text-green-500');
  });

  it('displays X icon for failed items', () => {
    const auditResult = {
      score_pct: 60,
      checklist_items: [
        {
          id: '1',
          category: 'Performance',
          label: 'Image optimization',
          passed: false,
          notes: null,
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    const xmark = screen.getByText('✗');
    expect(xmark).toBeInTheDocument();
    expect(xmark).toHaveClass('text-red-500');
  });

  it('renders both passed and failed items in same category', () => {
    const auditResult = {
      score_pct: 70,
      checklist_items: [
        {
          id: '1',
          category: 'Mobile',
          label: 'Responsive design',
          passed: true,
          notes: null,
        },
        {
          id: '2',
          category: 'Mobile',
          label: 'Touch targets',
          passed: false,
          notes: 'Buttons too small on mobile',
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    expect(screen.getByText('Responsive design')).toBeInTheDocument();
    expect(screen.getByText('Touch targets')).toBeInTheDocument();

    const checkmarks = screen.getAllByText('✓');
    const xmarks = screen.getAllByText('✗');

    expect(checkmarks.length).toBeGreaterThan(0);
    expect(xmarks.length).toBeGreaterThan(0);
  });

  it('displays notes when provided', () => {
    const auditResult = {
      score_pct: 75,
      checklist_items: [
        {
          id: '1',
          category: 'UX',
          label: 'Navigation clarity',
          passed: false,
          notes: 'Main navigation menu not clearly visible on mobile',
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    expect(screen.getByText('Main navigation menu not clearly visible on mobile')).toBeInTheDocument();
  });

  it('hides notes when not provided', () => {
    const auditResult = {
      score_pct: 85,
      checklist_items: [
        {
          id: '1',
          category: 'UX',
          label: 'Navigation clarity',
          passed: true,
          notes: null,
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    expect(screen.getByText('Navigation clarity')).toBeInTheDocument();
    expect(screen.queryByText(/notes/i)).not.toBeInTheDocument();
  });

  it('handles empty checklist items', () => {
    const auditResult = {
      score_pct: 50,
      checklist_items: [],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Overall Audit Score')).toBeInTheDocument();
  });

  it('handles undefined checklist items', () => {
    const auditResult = {
      score_pct: 65,
    };
    render(<AuditDisplay auditResult={auditResult} />);

    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders multiple categories in separate sections', () => {
    const auditResult = {
      score_pct: 72,
      checklist_items: [
        { id: '1', category: 'Homepage', label: 'Hero section', passed: true, notes: null },
        { id: '2', category: 'Product Pages', label: 'Product images', passed: false, notes: 'Too small' },
        { id: '3', category: 'Checkout', label: 'Checkout steps', passed: true, notes: null },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    const categoryHeadings = screen.getAllByRole('heading', { level: 4 });
    expect(categoryHeadings.length).toBeGreaterThanOrEqual(3);
  });

  it('applies correct styling to score percentage', () => {
    const auditResult = {
      score_pct: 95,
      checklist_items: [],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    const score = screen.getByText('95%');
    expect(score).toHaveClass('text-4xl', 'font-bold', 'text-gray-900');
  });

  it('applies correct styling to category sections', () => {
    const auditResult = {
      score_pct: 80,
      checklist_items: [
        {
          id: '1',
          category: 'Performance',
          label: 'Test',
          passed: true,
          notes: null,
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    const categorySection = screen.getByText('Performance').closest('div');
    expect(categorySection).toHaveClass('p-4', 'rounded-lg', 'border', 'border-gray-200');
  });

  it('applies correct styling to check/cross marks', () => {
    const auditResult = {
      score_pct: 70,
      checklist_items: [
        {
          id: '1',
          category: 'Cat',
          label: 'Passed item',
          passed: true,
          notes: null,
        },
        {
          id: '2',
          category: 'Cat',
          label: 'Failed item',
          passed: false,
          notes: null,
        },
      ],
    };
    render(<AuditDisplay auditResult={auditResult} />);

    const checkmark = screen.getByText('✓');
    const xmark = screen.getByText('✗');

    expect(checkmark).toHaveClass('font-bold', 'text-green-500');
    expect(xmark).toHaveClass('font-bold', 'text-red-500');
  });
});
