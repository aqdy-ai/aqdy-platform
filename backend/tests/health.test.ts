/**
 * Health Check Integration Test
 * Path: backend/tests/health.test.ts
 */
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
// Ensure the path to app.js is correct and includes the extension
import app from '../src/index.js'; 

describe('Backend Health Check', () => {
  test('it should respond with 200 OK', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
    expect(response.body.environment).toBeDefined();
  });
});