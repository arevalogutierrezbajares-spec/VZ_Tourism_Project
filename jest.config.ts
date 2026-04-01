import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/__tests__/**/*.spec.{ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Stub CSS imports (e.g. mapbox-gl/dist/mapbox-gl.css)
    '\\.css$': '<rootDir>/__tests__/mocks/style-mock.ts',
    // Mock uuid to avoid ESM issues
    '^uuid$': '<rootDir>/__tests__/mocks/uuid.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: { jsx: 'react-jsx' },
    }],
    // Ensure uuid (ESM) is transformed by ts-jest too
    '^.+\\.m?js$': ['ts-jest', {
      tsconfig: { jsx: 'react-jsx' },
      diagnostics: false,
    }],
  },
  // Allow uuid and other ESM-only node_modules to be transformed
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|@anthropic-ai)/).*',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
};

export default createJestConfig(config);
