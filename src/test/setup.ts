import '@testing-library/jest-dom'

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    // Uncomment to ignore specific console methods in tests
    // log: vi.fn(),
    // debug: vi.fn(),
    // info: vi.fn(),
    // warn: vi.fn(),
    // error: vi.fn(),
}