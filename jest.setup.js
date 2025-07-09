// jest.setup.js
import '@testing-library/jest-dom'

// Mock do Supabase
jest.mock('@/app/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }))
    }))
  }
}))

// Mock do crypto (usado para generateUUID)
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-1234-1234-123456789012'
  }
})

// Setup global para testes
global.console = {
  ...console,
  // Silenciar logs durante testes
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} 