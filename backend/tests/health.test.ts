/**
 * Health Check Integration Test
 * Path: backend/tests/health.test.ts
 */
import {jest, describe, test, expect ,afterAll} from '@jest/globals';
import request from 'supertest';
// Ensure the path to app.js is correct and includes the extension
import app from '../src/index.js'; 

jest.spyOn(app, "listen").mockImplementation(() => {
  return {} as any;
});
describe('Backend Health Check', () => {
  test('it should respond with 200 OK', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.timestamp).toBeDefined();
  });

});
  afterAll(() => {
  jest.clearAllMocks();
});

