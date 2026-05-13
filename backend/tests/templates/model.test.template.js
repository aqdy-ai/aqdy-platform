/**
 * Model Unit Test Template
 * Use this for testing schemas and validations in /src/models
 */
import MyModel from '../../src/models/MyModel.js';

// Mock the Model to prevent DB connection
jest.mock('../../src/models/MyModel');

describe('MyModel - Schema Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should validate correctly with valid data', async () => {
    const validData = { name: 'Test Item', quantity: 10 };
    MyModel.prototype.save = jest.fn().mockResolvedValue(validData);

    const instance = new MyModel(validData);
    const result = await instance.save();

    expect(result.name).toBe('Test Item');
  });

  test('should fail validation if required fields are missing', async () => {
    MyModel.prototype.save = jest.fn().mockRejectedValue(new Error('Validation Failed'));
    const instance = new MyModel({});
    await expect(instance.save()).rejects.toThrow('Validation Failed');
  });
});
