module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: { '\\.(css|less|scss)$': '<rootDir>/test/styleMock.cjs' },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  clearMocks: true,
};
