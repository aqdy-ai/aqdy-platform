import { jest } from '@jest/globals';

export const getDocument = jest.fn().mockReturnValue({
  promise: Promise.resolve({
    numPages: 1,
    getPage: jest.fn().mockResolvedValue({
      getTextContent: jest.fn().mockResolvedValue({
        items: [{ str: 'Mock PDF text content for testing' }]
      })
    }),
    destroy: jest.fn().mockResolvedValue(undefined)
  })
});

export const GlobalWorkerOptions = { workerSrc: '' };
