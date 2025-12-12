# LAYANAN Feature Testing Guide

## Overview
This directory contains tests for the LAYANAN feature using Jest and Supertest.

## Test Structure

```
__tests__/
├── setup.js                      # Global test setup and utilities
├── C_Layanan.test.js            # Integration tests (Routes + Controllers)
└── C_Layanan.service.test.js    # Unit tests (Service layer)

__mocks__/
├── middleware.js                 # Mock auth/role middleware
├── multer.wrapper.js            # Mock file upload middleware
└── validate.joi.js              # Mock validation middleware
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run with coverage
```bash
npm run test:coverage
```

### Run in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npm run test:layanan        # Integration tests
npm run test:service        # Unit tests
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

## Test Types

### 1. Integration Tests (`C_Layanan.test.js`)
Tests the entire request-response cycle through Express routes.

**What it tests:**
- HTTP endpoints (GET, POST, PUT)
- Route middleware (auth, validation, file upload)
- Response status codes and JSON structure
- Role-based access control

**Example:**
```javascript
it('should allow admin to accept pengajuan', async () => {
  const res = await request(app)
    .put('/api/v1/layanan/1/accept-pengajuan')
    .set('x-user-role', 'admin');
  
  expect(res.statusCode).toBe(200);
});
```

### 2. Unit Tests (`C_Layanan.service.test.js`)
Tests individual service functions in isolation.

**What it tests:**
- Service layer business logic
- Data validation and transformation
- Error handling
- Repository interactions

**Example:**
```javascript
it('should return all layanan for admin', async () => {
  layananRepository.findAll.mockResolvedValue([mockLayanan]);
  
  const result = await layananService.getAll(mockAdmin, {});
  
  expect(result).toHaveLength(1);
});
```

## Mock Strategy

### Middleware Mocks
All middleware is mocked to pass through requests:
- `authMiddleware` - Sets req.user based on x-user-role header
- `roleMiddleware` - Checks role and returns 403 if unauthorized
- `upload/uploadFile` - Passes through without file processing
- `validate` - Passes through without validation

### Service Mocks
Services are mocked at the boundary to test routes independently:
```javascript
jest.mock('../src/layanan/C_Layanan.service.js', () => ({
  layananService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    // ...
  },
}));
```

### Repository Mocks
Repositories are mocked to avoid database calls:
```javascript
jest.mock('../src/layanan/C_Layanan.repository.js');
```

## Test Data

Mock data is defined at the top of test files:
- `mockUser` - Admin user
- `mockCustomer` - Customer user
- `mockLayanan` - Sample layanan record
- `mockJenisLayanan` - Sample jenis layanan
- `mockStatusKode` - Sample status code

## Coverage Goals

Target coverage:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Writing New Tests

### 1. Integration Test Template
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should [expected behavior]', async () => {
    // Arrange
    serviceMethod.mockResolvedValue(mockData);

    // Act
    const res = await request(app)
      .get('/api/v1/endpoint')
      .set('x-user-role', 'admin');

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});
```

### 2. Unit Test Template
```javascript
describe('serviceName.methodName', () => {
  it('should [expected behavior]', async () => {
    // Arrange
    repository.findAll.mockResolvedValue(mockData);

    // Act
    const result = await service.methodName(params);

    // Assert
    expect(result).toBeDefined();
    expect(repository.findAll).toHaveBeenCalledWith(expectedArgs);
  });

  it('should throw error when [error condition]', async () => {
    // Arrange
    repository.findAll.mockResolvedValue(null);

    // Act & Assert
    await expect(service.methodName(params)).rejects.toThrow(ApiError);
  });
});
```

## Common Issues & Solutions

### Issue: "Route.put() requires a callback function"
**Solution**: Ensure all middleware and controllers are properly mocked before requiring routes.

### Issue: Tests timing out
**Solution**: 
1. Check for unmocked async operations
2. Increase timeout: `jest.setTimeout(10000)`
3. Ensure all promises are resolved/rejected

### Issue: Mock not being called
**Solution**: 
1. Clear mocks between tests: `jest.clearAllMocks()`
2. Check mock import order
3. Verify mock is required before actual module

### Issue: Cannot read property of undefined
**Solution**: 
1. Ensure all mock data has required nested properties
2. Use optional chaining in mocks: `data?.property`
3. Initialize empty objects/arrays in mocks

## Best Practices

1. **Arrange-Act-Assert Pattern**: Structure tests clearly
2. **One Assertion Per Test**: Keep tests focused
3. **Descriptive Test Names**: Use "should [expected behavior]" format
4. **Mock External Dependencies**: Database, APIs, file system
5. **Test Edge Cases**: Error conditions, empty data, invalid input
6. **Clean Up**: Clear mocks between tests
7. **Isolate Tests**: Each test should be independent

## Debugging Tests

### Enable verbose output
```bash
npm run test:verbose
```

### Run single test
```bash
npm test -- -t "should allow admin to accept"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

## CI/CD Integration

For continuous integration:
```bash
npm run test:ci
```

This runs tests with:
- CI mode enabled
- Coverage collection
- Limited workers for stability

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)