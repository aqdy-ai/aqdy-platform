/**
 * Service Unit Test Template
 * Use this for testing business logic in /src/services
 */
import { myFunction } from '../../src/services/myService.js';
import dependencyService from '../../src/services/dependencyService.js';

// 1. Mock internal or external dependencies
jest.mock('../../src/services/dependencyService.js');

describe('MyService - Unit Tests', () => {
  
  // 2. Clear mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return processed data when dependency succeeds', async () => {
    // Arrange: Setup mock return values
    dependencyService.fetchData.mockResolvedValue({ id: 1, status: 'ok' });

    // Act: Call the function being tested
    const result = await myFunction(1);

    // Assert: Verify results and mock interactions
    expect(result).toEqual({ id: 1, status: 'processed' });
    expect(dependencyService.fetchData).toHaveBeenCalledWith(1);
  });

  test('should throw error when dependency fails', async () => {
    // Arrange
    dependencyService.fetchData.mockRejectedValue(new Error('Network Error'));

    // Act & Assert
    await expect(myFunction(1)).rejects.toThrow('Network Error');
  });
});
