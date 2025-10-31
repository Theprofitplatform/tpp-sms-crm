/**
 * Test Fixtures and Mock Data
 * 
 * Shared test data for unit and integration tests
 */

export const testUsers = {
  client: {
    clientId: 'test-client-fixture',
    email: 'client@fixture.com',
    password: 'ClientPass123!',
    firstName: 'Test',
    lastName: 'Client',
    role: 'client'
  },
  admin: {
    clientId: 'admin-client',
    email: 'admin@fixture.com',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  }
};

export const testClients = {
  active: {
    id: 'active-client',
    name: 'Active Client',
    domain: 'activeclient.com',
    status: 'active'
  },
  inactive: {
    id: 'inactive-client',
    name: 'Inactive Client',
    domain: 'inactiveclient.com',
    status: 'inactive'
  }
};

export const testCampaigns = {
  seo: {
    clientId: 'test-client',
    name: 'SEO Campaign',
    type: 'seo',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    budget: 5000
  },
  ppc: {
    clientId: 'test-client',
    name: 'PPC Campaign',
    type: 'ppc',
    startDate: '2025-01-01',
    budget: 3000
  }
};

export const testGoals = {
  traffic: {
    clientId: 'test-client',
    metric: 'traffic',
    target: 10000,
    deadline: '2025-12-31',
    priority: 'high'
  },
  rankings: {
    clientId: 'test-client',
    metric: 'rankings',
    target: 50,
    deadline: '2025-06-30',
    priority: 'medium'
  }
};

export const testKeywords = {
  primary: {
    keyword: 'seo services',
    domain: 'test.com',
    location: 'United States',
    language: 'en',
    device: 'desktop'
  },
  secondary: {
    keyword: 'local seo',
    domain: 'test.com',
    location: 'New York',
    language: 'en',
    device: 'mobile'
  }
};

export const testPages = {
  homepage: {
    url: 'https://test.com',
    title: 'Home Page',
    content: '<h1>Welcome</h1><p>Test content</p>',
    meta: {
      description: 'Test meta description',
      keywords: 'test, seo'
    }
  },
  about: {
    url: 'https://test.com/about',
    title: 'About Us',
    content: '<h1>About</h1><p>About content</p>',
    meta: {
      description: 'About page description'
    }
  }
};

export const mockWordPressPost = {
  id: 1,
  date: '2025-10-30T12:00:00',
  modified: '2025-10-30T12:00:00',
  slug: 'test-post',
  status: 'publish',
  type: 'post',
  link: 'https://test.com/test-post',
  title: {
    rendered: 'Test Post'
  },
  content: {
    rendered: '<p>Test content</p>'
  },
  excerpt: {
    rendered: '<p>Test excerpt</p>'
  }
};

export const mockGSCData = {
  rows: [
    {
      keys: ['test keyword'],
      clicks: 100,
      impressions: 1000,
      ctr: 0.1,
      position: 5.5
    },
    {
      keys: ['another keyword'],
      clicks: 50,
      impressions: 500,
      ctr: 0.1,
      position: 8.2
    }
  ]
};

export const mockAuditResults = {
  technical: {
    score: 85,
    issues: [
      {
        type: 'warning',
        message: 'Missing H1 tag',
        url: '/page-1'
      }
    ]
  },
  onPage: {
    score: 90,
    issues: []
  },
  performance: {
    score: 75,
    metrics: {
      loadTime: 2.5,
      ttfb: 0.5
    }
  }
};

export const invalidTestData = {
  invalidEmail: 'not-an-email',
  invalidDomain: 'not-a-domain',
  invalidId: 'Invalid ID!',
  xssAttempt: '<script>alert("XSS")</script>',
  sqlInjection: "'; DROP TABLE users; --",
  shortPassword: 'pass',
  longString: 'a'.repeat(10000)
};

// Helper functions for test data generation
export function generateRandomEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

export function generateRandomClientId() {
  return `test-client-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

export function generateRandomKeyword() {
  const keywords = ['seo', 'marketing', 'optimization', 'analytics', 'strategy'];
  return keywords[Math.floor(Math.random() * keywords.length)];
}

// Mock responses for external APIs
export const mockAPIResponses = {
  wordpress: {
    success: {
      status: 200,
      data: mockWordPressPost
    },
    error: {
      status: 401,
      data: {
        code: 'rest_forbidden',
        message: 'Sorry, you are not allowed to do that.'
      }
    }
  },
  gsc: {
    success: {
      status: 200,
      data: mockGSCData
    },
    error: {
      status: 403,
      data: {
        error: 'Forbidden'
      }
    }
  }
};

export default {
  testUsers,
  testClients,
  testCampaigns,
  testGoals,
  testKeywords,
  testPages,
  mockWordPressPost,
  mockGSCData,
  mockAuditResults,
  invalidTestData,
  mockAPIResponses,
  generateRandomEmail,
  generateRandomClientId,
  generateRandomKeyword
};
