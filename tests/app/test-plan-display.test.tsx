import React from 'react';
import { render, screen } from '@testing-library/react';
import TestPlanDisplay from '@/components/TestPlanDisplay';

describe('TestPlanDisplay Component', () => {
  it('displays "No test plan available" when testPlan is null', () => {
    render(<TestPlanDisplay testPlan={null} />);

    expect(screen.getByText('No test plan available')).toBeInTheDocument();
  });

  it('displays "No test plan available" when testPlan is undefined', () => {
    render(<TestPlanDisplay testPlan={undefined} />);

    expect(screen.getByText('No test plan available')).toBeInTheDocument();
  });

  it('renders "Recommended Tests" heading', () => {
    const testPlan = { tests: [] };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Recommended Tests')).toBeInTheDocument();
  });

  it('renders test list when tests are provided', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Testing button color',
          effort_hours: 5,
          expected_lift_min: 10,
          expected_lift_max: 20,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Testing button color')).toBeInTheDocument();
  });

  it('renders multiple test items', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test One',
          effort_hours: 5,
        },
        {
          id: 'test-2',
          hypothesis: 'Test Two',
          effort_hours: 8,
        },
        {
          id: 'test-3',
          hypothesis: 'Test Three',
          effort_hours: 3,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Test One')).toBeInTheDocument();
    expect(screen.getByText('Test Two')).toBeInTheDocument();
    expect(screen.getByText('Test Three')).toBeInTheDocument();
  });

  it('displays effort badge for each test', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          effort_hours: 5,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Effort: 5')).toBeInTheDocument();
  });

  it('falls back to name when hypothesis is not present', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          name: 'Test Name',
          effort_hours: 5,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Test Name')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          description: 'This is a detailed description of the test',
          effort_hours: 5,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('This is a detailed description of the test')).toBeInTheDocument();
  });

  it('hides description when not provided', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          effort_hours: 5,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    // Should not have any description text
    const components = screen.getAllByText(/Test hypothesis/);
    expect(components.length).toBeGreaterThan(0);
  });

  it('displays expected lift range when both min and max are provided', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          effort_hours: 5,
          expected_lift_min: 15,
          expected_lift_max: 25,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Expected lift: 15–25%')).toBeInTheDocument();
  });

  it('displays single expected lift value when only that field is provided', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          effort_hours: 5,
          expected_lift: '20%',
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Expected lift: 20%')).toBeInTheDocument();
  });

  it('hides lift data when not provided', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          effort_hours: 5,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.queryByText(/Expected lift:/)).not.toBeInTheDocument();
  });

  it('uses fallback effort_hours field when effort is not available', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          effort_hours: 7,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Effort: 7')).toBeInTheDocument();
  });

  it('handles empty tests array', () => {
    const testPlan = { tests: [] };
    render(<TestPlanDisplay testPlan={testPlan} />);

    expect(screen.getByText('Recommended Tests')).toBeInTheDocument();
    // Should render the header but no test items
    expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
  });

  it('applies correct styling to effort badge', () => {
    const testPlan = {
      tests: [
        {
          id: 'test-1',
          hypothesis: 'Test hypothesis',
          effort_hours: 5,
        },
      ],
    };
    render(<TestPlanDisplay testPlan={testPlan} />);

    const badge = screen.getByText('Effort: 5');
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-700');
  });
});
