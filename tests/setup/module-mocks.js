/**
 * Module Mocks Setup
 * Automatically mocks commonly used modules in tests
 */

import { jest } from '@jest/globals'
import React from 'react'

// Mock all shadcn/ui component imports
jest.mock('@/components/ui/button', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/card', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/input', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/label', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/switch', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/tabs', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/select', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/use-toast', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/alert', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/textarea', () => require('../mocks/ui-components'))
jest.mock('@/components/ui/badge', () => require('../mocks/ui-components'))

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const mockIcon = (props) => React.createElement('svg', {
    ...props,
    'data-icon': 'mock-icon'
  })

  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === '__esModule') return true
      if (prop === 'default') return {}
      return mockIcon
    }
  })
})

// Export for explicit use if needed
export {}
