/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: '.coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '*.d.ts',
  ],
  coverageProvider: 'v8',
  coverageThreshold: {
    'global': {
      'branches': 90,
      'functions': 90,
      'lines': 90,
      'statements': 90,
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  preset: 'ts-jest',
  rootDir: '__tests__',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '.d.ts', '.js'],
  transformIgnorePatterns: ['/node_modules/'],
};
