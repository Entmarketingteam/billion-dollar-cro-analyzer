# Testing Infrastructure for CRO Analyzer

This directory contains the test suite for the CRO Analyzer SaaS application. The project uses Jest and React Testing Library for comprehensive testing coverage.

## Overview

- **Test Framework:** Jest 29
- **Component Testing:** React Testing Library 14
- **Test Environment:** jsdom
- **TypeScript Support:** ts-jest

## Directory Structure

```
tests/
├── README.md                    # This file
├── lib/                         # Unit tests for library functions
│   ├── shopify.test.ts         # Tests for Shopify API helpers
│   ├── ga4.test.ts             # Tests for GA4 API helpers
│   └── [other].test.ts         # Other utility tests
├── components/                  # Component tests (planned)
│   └── [component].test.tsx    # React component tests
└── api/                         # API route tests (planned)
    └── [route].test.ts         # Next.js API endpoint tests
```

## Running Tests

### Run all tests
```bash
npm test
```

### Watch mode (re-run tests on file changes)
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

The coverage report will be generated in `coverage/` directory. Open `coverage/lcov-report/index.html` in your browser for a visual report.

## Writing Tests

### Unit Tests (Library Functions)

Place tests in `tests/lib/` directory with `.test.ts` extension.

**Example: Testing a utility function**

```typescript
// src/lib/utils.ts
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`
}

// tests/lib/utils.test.ts
import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
  it('should format a number as currency', () => {
    expect(formatCurrency(1000)).toBe('$1000.00')
    expect(formatCurrency(99.5)).toBe('$99.50')
  })

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
})
```

### Component Tests

Place tests in `tests/components/` directory with `.test.tsx` extension.

**Example: Testing a React component**

```typescript
// src/components/Button.tsx
export const Button = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick}>{label}</button>
)

// tests/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/Button'

describe('Button', () => {
  it('should render the button with label', () => {
    render(<Button label="Click me" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn()
    render(<Button label="Click me" onClick={handleClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Tests

Place tests in `tests/api/` directory with `.test.ts` extension.

**Example: Testing a Next.js API route**

```typescript
// src/app/api/analyze/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  return Response.json({ success: true, siteId: body.siteId })
}

// tests/api/analyze.test.ts
import { POST } from '@/app/api/analyze/route'

describe('/api/analyze', () => {
  it('should return success response', async () => {
    const mockReq = new Request('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ siteId: 'test-123' }),
    })

    const response = await POST(mockReq)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.siteId).toBe('test-123')
  })
})
```

## Testing Best Practices

### 1. Write Descriptive Test Names
```typescript
// Good
it('should format currency with two decimal places', () => {})

// Avoid
it('works', () => {})
```

### 2. Test Behavior, Not Implementation
```typescript
// Good: Testing behavior
expect(screen.getByRole('button')).toBeInTheDocument()

// Avoid: Testing implementation details
expect(component.state.isVisible).toBe(true)
```

### 3. Use Arrange-Act-Assert Pattern
```typescript
describe('UserForm', () => {
  it('should submit user data', () => {
    // Arrange
    const handleSubmit = jest.fn()
    render(<UserForm onSubmit={handleSubmit} />)

    // Act
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    // Assert
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'John' }))
  })
})
```

### 4. Mock External Dependencies
```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}))
```

### 5. Test Both Success and Error Cases
```typescript
describe('fetchMetrics', () => {
  it('should return metrics on success', async () => {
    // Test successful case
  })

  it('should handle API errors gracefully', async () => {
    // Test error handling
  })

  it('should handle network timeout', async () => {
    // Test timeout scenario
  })
})
```

## Common Testing Patterns

### Testing Async Functions
```typescript
it('should fetch data', async () => {
  const data = await fetchData()
  expect(data).toEqual(expectedData)
})
```

### Testing Components with Props
```typescript
it('should render with different props', () => {
  const { rerender } = render(<Component prop="value1" />)
  expect(screen.getByText('value1')).toBeInTheDocument()

  rerender(<Component prop="value2" />)
  expect(screen.getByText('value2')).toBeInTheDocument()
})
```

### Testing User Interactions
```typescript
import userEvent from '@testing-library/user-event'

it('should handle user input', async () => {
  const user = userEvent.setup()
  render(<Input />)

  await user.type(screen.getByRole('textbox'), 'test input')
  expect(screen.getByRole('textbox')).toHaveValue('test input')
})
```

## Debugging Tests

### Run tests in debug mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open Chrome DevTools at `chrome://inspect` to debug.

### Use console.log in tests
```typescript
it('should debug', () => {
  const result = someFunction()
  console.log('Result:', result) // This will print in test output
  expect(result).toBeDefined()
})
```

### Focus on a single test
```typescript
it.only('should test only this', () => {
  // Only this test will run
})
```

### Skip a test
```typescript
it.skip('should skip this test', () => {
  // This test will be skipped
})
```

## Coverage Thresholds

The project is configured to track test coverage. Current configuration:

- `collectCoverageFrom`: All source files except `.d.ts` files and test files
- Requires `coverage/` directory to be generated after running `npm run test:coverage`

View coverage reports:
```bash
open coverage/lcov-report/index.html
```

## Next Steps

1. Add `@testing-library/user-event` for advanced user interaction testing
2. Create test fixtures for common data scenarios
3. Set up GitHub Actions CI to run tests on every PR
4. Establish coverage thresholds (e.g., >80% for critical paths)
5. Create E2E tests using Playwright

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
