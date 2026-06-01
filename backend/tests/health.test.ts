/**
 * Health Check Integration Test
 * Path: backend/tests/health.test.ts
 */
import "dotenv/config";
import {jest, describe, test, expect ,afterAll, beforeAll} from '@jest/globals';
import request from 'supertest';

let app: any;

describe('Backend Health Check', () => {
  beforeAll(async () => {
    const imported = await import('../src/index.js');
    app = imported.default;
    jest.spyOn(app, 'listen').mockImplementation(() => ({} as any));
  });

  test('it should respond with 200 OK', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.timestamp).toBeDefined();
  });

});

afterAll(() => {
  jest.clearAllMocks();
});

