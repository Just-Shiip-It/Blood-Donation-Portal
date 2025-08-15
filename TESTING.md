# Blood Donation Portal - Testing Documentation

This document provides comprehensive information about the testing strategy, test suites, and how to run tests for the Blood Donation Portal.

## Testing Strategy

Our testing approach follows the testing pyramid with:
- **70% Unit Tests**: Fast, isolated tests for business logic
- **20% Integration Tests**: API endpoints and database operations
- **10% End-to-End Tests**: Complete user journeys

## Test Suites Overview

### 1. Unit Tests
Located in `src/test/` with individual component/service test files.

**Coverage:**
- Service layer business logic
- Utility functions
- Component behavior
- Validation schemas

**Run Command:**
```bash
npm run test:run -- src/test/appointment-service.test.ts
npm run test:run -- src/test/mobile-pwa.test.ts
```

### 2. Integration Tests
Located in `src/test/integration/`

#### Authentication API Tests (`auth.api.test.ts`)
- User registration (donor, facility, admin)
- Login/logout flows
- Profile management
- Email verification
- Password reset
- Role-based access control

#### Appointments API Tests (`appointments.api.test.ts`)
- Appointment creation and validation
- Eligibility checking
- Availability queries
- Appointment management (update, cancel)
- Location-based filtering
- Reminder system

#### Blood Requests API Tests (`blood-requests.api.test.ts`)
- Request creation (routine, urgent, emergency)
- Request fulfillment workflow
- Inventory management
- Notification triggers
- Status tracking
- Access control

#### Database Integration Tests (`database.test.ts`)
- CRUD operations across all entities
- Complex joins and relationships
- Transaction handling
- Data integrity constraints
- Performance with large datasets

**Run Commands:**
```bash
npm run test:integration
# or individual files
npm run test:run -- src/test/integration/auth.api.test.ts
```

### 3. End-to-End Tests
Located in `src/test/e2e/`

#### Donor Journey Tests (`donor-journey.test.ts`)
- Complete donor registration flow
- First-time appointment booking
- Returning donor scenarios
- Eligibility validation
- Appointment management
- Donation history tracking

#### Facility Journey Tests (`facility-journey.test.ts`)
- Healthcare facility registration
- Blood request creation
- Request tracking and management
- Emergency request handling
- Inventory checking
- Multi-facility scenarios

**Run Commands:**
```bash
npm run test:e2e
# or individual files
npm run test:run -- src/test/e2e/donor-journey.test.ts
```

### 4. API Documentation Tests
Located in `src/test/api-docs/`

#### API Contract Tests (`api-documentation.test.ts`)
- Response format validation
- Status code verification
- Error response consistency
- Pagination structure
- Header validation
- API versioning

**Run Commands:**
```bash
npm run test:api-docs
```

### 5. Performance Tests
Located in `src/test/performance/`

#### API Performance Tests (`api-performance.test.ts`)
- Response time benchmarks
- Concurrent request handling
- Large dataset performance
- Memory usage patterns
- Database query efficiency

**Run Commands:**
```bash
npm run test:performance
```

## Test Environment Setup

### Prerequisites
1. Node.js 20+
2. PostgreSQL 15+
3. Supabase test instance
4. Environment variables configured

### Environment Variables
Create a `.env.test` file with:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/blood_donation_test
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_test_service_key
NEXTAUTH_SECRET=your_test_secret
NODE_ENV=test
```

### Database Setup
```bash
# Create test database
npm run db:push

# Seed test data
npm run db:seed

# Reset database (clear and reseed)
npm run db:reset
```

## Running Tests

### Quick Test Commands
```bash
# Run all tests with comprehensive reporting
npm run test:all

# Run specific test suites
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:api-docs

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm test

# Run with UI
npm run test:ui
```

### Comprehensive Test Runner
The `test:all` command runs our custom test runner that:
1. Sets up the test environment
2. Runs all test suites in order
3. Generates detailed reports
4. Provides performance metrics
5. Creates HTML and JSON reports

```bash
npm run test:all
```

Reports are generated in `test-reports/`:
- `test-results.json` - Machine-readable results
- `test-results.html` - Human-readable report

## Test Data Management

### Test Data Helper (`src/test/helpers/test-db.ts`)
Provides utilities for:
- Creating test users and profiles
- Setting up test data relationships
- Cleaning up after tests
- Managing authentication headers
- Creating mock requests

### Usage Example
```typescript
import { TestDataManager, getAuthHeaders } from '../helpers/test-db'

describe('My Test Suite', () => {
    let testManager: TestDataManager

    beforeEach(() => {
        testManager = new TestDataManager()
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    it('should test something', async () => {
        const { user } = await testManager.createTestUser({
            email: 'test@example.com',
            password: 'SecurePass123!',
            role: 'donor'
        })

        const headers = await getAuthHeaders('test@example.com', 'SecurePass123!')
        // Use headers in API requests
    })
})
```

## Continuous Integration

### GitHub Actions Workflow
Located in `.github/workflows/test-integration.yml`

**Test Jobs:**
1. **Unit Tests** - Fast feedback on core logic
2. **Integration Tests** - API and database validation
3. **E2E Tests** - Complete user journey validation
4. **Performance Tests** - Response time and efficiency
5. **Database Tests** - Data integrity and operations
6. **Security Tests** - Vulnerability scanning

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Test Parallelization
Tests run in parallel jobs with:
- Isolated PostgreSQL instances
- Separate test databases
- Independent environment variables
- Concurrent execution where possible

## Test Coverage

### Coverage Targets
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 80%+ API endpoint coverage
- **E2E Tests**: 100% critical user journey coverage

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

### Coverage Exclusions
- Configuration files
- Build artifacts
- Test files themselves
- Generated code (Drizzle schemas)

## Performance Benchmarks

### Response Time Targets
- **Authentication**: < 1000ms
- **Simple Queries**: < 500ms
- **Complex Queries**: < 1200ms
- **Concurrent Requests**: < 800ms average

### Load Testing Scenarios
- 10 concurrent users (normal load)
- 50 concurrent users (peak load)
- Large dataset queries (100+ records)
- Memory usage monitoring

## Debugging Tests

### Common Issues and Solutions

#### Database Connection Errors
```bash
# Check database is running
pg_isready -h localhost -p 5432

# Reset database
npm run db:reset
```

#### Authentication Failures
```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Check Supabase connection
npm run test:run -- src/test/integration/auth.api.test.ts --reporter=verbose
```

#### Test Timeouts
```bash
# Run with increased timeout
npm run test:run -- --testTimeout=30000

# Run specific test with debugging
npm run test:run -- src/test/integration/appointments.api.test.ts --reporter=verbose
```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm run test:run

# Run with Node.js inspector
node --inspect-brk ./node_modules/.bin/vitest run
```

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert** pattern
2. **Descriptive test names** that explain the scenario
3. **Independent tests** that don't rely on each other
4. **Proper cleanup** in afterEach hooks
5. **Realistic test data** that matches production scenarios

### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach/afterEach** for setup/cleanup
3. **Mock external dependencies** appropriately
4. **Test both success and failure scenarios**
5. **Include edge cases** and boundary conditions

### Performance Considerations
1. **Minimize database operations** in unit tests
2. **Use transactions** for test isolation
3. **Clean up test data** to prevent interference
4. **Parallel test execution** where possible
5. **Monitor test execution time**

## Contributing to Tests

### Adding New Tests
1. Follow existing test structure and naming conventions
2. Add tests for new features in appropriate test suites
3. Update this documentation for new test categories
4. Ensure tests pass in CI environment
5. Include both positive and negative test cases

### Test Review Checklist
- [ ] Tests cover all code paths
- [ ] Error scenarios are tested
- [ ] Test data is properly cleaned up
- [ ] Tests are deterministic and repeatable
- [ ] Performance implications are considered
- [ ] Documentation is updated

## Troubleshooting

### Common Test Failures

#### "Database connection failed"
- Ensure PostgreSQL is running
- Check DATABASE_URL environment variable
- Verify database exists and is accessible

#### "Supabase authentication failed"
- Check SUPABASE_URL and SERVICE_ROLE_KEY
- Verify test Supabase project is active
- Ensure API keys have correct permissions

#### "Test timeout exceeded"
- Increase timeout for slow operations
- Check for infinite loops or hanging promises
- Verify database queries are optimized

#### "Port already in use"
- Kill existing processes on test ports
- Use different ports for parallel test runs
- Check for zombie processes

### Getting Help
1. Check test logs for specific error messages
2. Run tests with verbose output for debugging
3. Verify environment setup matches requirements
4. Review recent changes that might affect tests
5. Consult team members for complex issues

## Metrics and Monitoring

### Test Metrics Tracked
- Test execution time
- Coverage percentages
- Failure rates
- Performance benchmarks
- Memory usage patterns

### Reporting
- Automated reports generated after each test run
- Coverage reports uploaded to CI
- Performance metrics tracked over time
- Failure notifications sent to team

This comprehensive testing strategy ensures the Blood Donation Portal maintains high quality, reliability, and performance standards throughout development and deployment.