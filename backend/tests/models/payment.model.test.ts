import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Payment from '../../src/models/payment.model.js';
import { beforeAll, afterAll, afterEach, describe, test, expect } from '@jest/globals';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe('Payment Model Test', () => {
  test('Test 1: Validate that a correct payment record is successfully saved and retrieved with all fields populated', async () => {
    const userId = new mongoose.Types.ObjectId();
    const subscriptionId = new mongoose.Types.ObjectId();

    const validPaymentData = {
      userId,
      subscriptionId,
      amount: 150,
      currency: 'usd ', // Should be trimmed and uppercase
      status: 'succeeded',
      provider: 'Stripe',
      providerTxId: '  tx_123456789  ', // Should be trimmed
      description: 'Monthly subscription',
    };

    const payment = new Payment(validPaymentData);
    const savedPayment = await payment.save();

    expect(savedPayment._id).toBeDefined();
    expect(savedPayment.userId.toString()).toBe(userId.toString());
    expect(savedPayment.subscriptionId.toString()).toBe(subscriptionId.toString());
    expect(savedPayment.amount).toBe(150);
    expect(savedPayment.currency).toBe('USD');
    expect(savedPayment.status).toBe('succeeded');
    expect(savedPayment.provider).toBe('Stripe');
    expect(savedPayment.providerTxId).toBe('tx_123456789');
    expect(savedPayment.description).toBe('Monthly subscription');
    expect(savedPayment.createdAt).toBeDefined();
    expect(savedPayment.updatedAt).toBeDefined();
    
    const retrievedPayment = await Payment.findById(savedPayment._id);
    expect(retrievedPayment).toBeDefined();
    expect(retrievedPayment?.providerTxId).toBe('tx_123456789');
  });

  test('Test 2: Validate that required fields throw validation errors when missing', async () => {
    const payment = new Payment({});

    let err: unknown;
    try {
      await payment.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    const validationError = err as mongoose.Error.ValidationError;
    expect(validationError.errors.userId).toBeDefined();
    expect(validationError.errors.subscriptionId).toBeDefined();
    expect(validationError.errors.amount).toBeDefined();
    expect(validationError.errors.currency).toBeDefined();
    expect(validationError.errors.provider).toBeDefined();
    expect(validationError.errors.providerTxId).toBeDefined();
  });

  test('Test 3: Validate that the status field strictly rejects any string value outside the enum', async () => {
    const paymentData = {
      userId: new mongoose.Types.ObjectId(),
      subscriptionId: new mongoose.Types.ObjectId(),
      amount: 100,
      currency: 'EGP',
      status: 'invalid_status', // Invalid enum
      provider: 'Paymob',
      providerTxId: 'tx_987654',
    };

    const payment = new Payment(paymentData);

    let err: unknown;
    try {
      await payment.validate();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    const validationError = err as mongoose.Error.ValidationError;
    expect(validationError.errors.status).toBeDefined();
    expect(validationError.errors.status.message).toContain('is not a valid enum value');
  });

  test('Test 4: Assert that the indexes are successfully defined on the compiled model', async () => {
    await Payment.init(); // Wait for indexes to build
    const indexes = await Payment.listIndexes();
    
    // Default _id index
    const hasIdIndex = indexes.some((index) => index.key._id === 1);
    
    // Compound index
    const hasCompoundIndex = indexes.some(
      (index) => index.key.userId === 1 && index.key.createdAt === -1
    );

    // ProviderTxId index
    const hasProviderTxIdIndex = indexes.some(
      (index) => index.key.providerTxId === 1 && index.unique === true
    );

    expect(hasIdIndex).toBe(true);
    expect(hasCompoundIndex).toBe(true);
    expect(hasProviderTxIdIndex).toBe(true);
  });
});
