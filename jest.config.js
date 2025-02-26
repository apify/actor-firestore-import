export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
    testMatch: ['**/test/**/*.test.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    extensionsToTreatAsEsm: ['.ts'],
};
