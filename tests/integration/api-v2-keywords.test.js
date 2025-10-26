/**
 * Integration Tests for API v2 - Keywords Endpoints
 * Tests the unified keyword management API
 */

const request = require('supertest');
const { expect } = require('chai');

// Test configuration
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:9000';
const API_PREFIX = '/api/v2';

describe('API v2 - Keywords Integration Tests', () => {
  let testKeywordId;
  let testProjectId;

  // Setup: Create test data
  before(async () => {
    console.log('Setting up test environment...');
  });

  // Teardown: Clean up test data
  after(async () => {
    console.log('Cleaning up test data...');
  });

  describe('GET /api/v2/keywords', () => {
    it('should return list of keywords', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords`)
        .expect(200);

      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('keywords');
      expect(res.body.keywords).to.be.an('array');
    });

    it('should support pagination', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords?page=1&per_page=10`)
        .expect(200);

      expect(res.body).to.have.property('pagination');
      expect(res.body.pagination).to.have.property('page', 1);
      expect(res.body.pagination).to.have.property('per_page', 10);
    });

    it('should filter by domain', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords?domain=example.com`)
        .expect(200);

      expect(res.body.keywords).to.be.an('array');
      if (res.body.keywords.length > 0) {
        expect(res.body.keywords[0].domain).to.equal('example.com');
      }
    });

    it('should filter by intent', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords?intent=informational`)
        .expect(200);

      expect(res.body.keywords).to.be.an('array');
      if (res.body.keywords.length > 0) {
        expect(res.body.keywords[0].intent).to.equal('informational');
      }
    });

    it('should filter by opportunity score', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords?opportunity_score_min=70`)
        .expect(200);

      expect(res.body.keywords).to.be.an('array');
      res.body.keywords.forEach(kw => {
        if (kw.opportunity_score) {
          expect(kw.opportunity_score).to.be.at.least(70);
        }
      });
    });

    it('should sort by opportunity score descending', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords?sort_by=opportunity_score&sort_order=desc`)
        .expect(200);

      expect(res.body.keywords).to.be.an('array');
      if (res.body.keywords.length > 1) {
        const scores = res.body.keywords.map(k => k.opportunity_score || 0);
        const sortedScores = [...scores].sort((a, b) => b - a);
        expect(scores).to.deep.equal(sortedScores);
      }
    });
  });

  describe('POST /api/v2/keywords', () => {
    it('should create a new keyword', async () => {
      const newKeyword = {
        keyword: 'test keyword integration',
        domain: 'example.com',
        device: 'desktop',
        country: 'US'
      };

      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/keywords`)
        .send(newKeyword)
        .expect(201);

      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('keyword');
      expect(res.body.keyword).to.have.property('id');
      expect(res.body.keyword.keyword).to.equal(newKeyword.keyword);

      testKeywordId = res.body.keyword.id;
    });

    it('should validate required fields', async () => {
      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/keywords`)
        .send({})
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body).to.have.property('error');
    });

    it('should reject invalid device type', async () => {
      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/keywords`)
        .send({
          keyword: 'test',
          device: 'invalid-device'
        })
        .expect(400);

      expect(res.body.success).to.be.false;
    });
  });

  describe('GET /api/v2/keywords/:id', () => {
    it('should get keyword details', async () => {
      if (!testKeywordId) {
        return this.skip();
      }

      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/${testKeywordId}`)
        .expect(200);

      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('keyword');
      expect(res.body.keyword.id).to.equal(testKeywordId);
    });

    it('should return 404 for non-existent keyword', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/99999999`)
        .expect(404);

      expect(res.body.success).to.be.false;
    });
  });

  describe('PUT /api/v2/keywords/:id', () => {
    it('should update keyword fields', async () => {
      if (!testKeywordId) {
        return this.skip();
      }

      const updates = {
        sticky: true,
        tags: ['important', 'test']
      };

      const res = await request(BASE_URL)
        .put(`${API_PREFIX}/keywords/${testKeywordId}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.keyword.sticky).to.be.true;
    });
  });

  describe('POST /api/v2/keywords/:id/track', () => {
    it('should add keyword to tracking', async () => {
      if (!testKeywordId) {
        return this.skip();
      }

      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/keywords/${testKeywordId}/track`)
        .send({ domain: 'example.com' })
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.keyword.is_tracking).to.be.true;
    });
  });

  describe('POST /api/v2/keywords/:id/enrich', () => {
    it('should fetch research data for keyword', async () => {
      if (!testKeywordId) {
        return this.skip();
      }

      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/keywords/${testKeywordId}/enrich`)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body).to.have.property('enrichment_data');
    });
  });

  describe('GET /api/v2/keywords/stats', () => {
    it('should return keyword statistics', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/stats`)
        .expect(200);

      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('stats');
      expect(res.body.stats).to.have.property('total');
      expect(res.body.stats).to.have.property('tracking');
      expect(res.body.stats).to.have.property('research');
    });
  });

  describe('DELETE /api/v2/keywords/:id', () => {
    it('should delete keyword', async () => {
      if (!testKeywordId) {
        return this.skip();
      }

      const res = await request(BASE_URL)
        .delete(`${API_PREFIX}/keywords/${testKeywordId}`)
        .expect(200);

      expect(res.body.success).to.be.true;

      // Verify deletion
      await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/${testKeywordId}`)
        .expect(404);
    });
  });

  describe('Performance Tests', () => {
    it('should respond within 500ms for list endpoint', async () => {
      const start = Date.now();

      await request(BASE_URL)
        .get(`${API_PREFIX}/keywords?per_page=50`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).to.be.below(500);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(BASE_URL)
          .get(`${API_PREFIX}/keywords?per_page=10`)
          .expect(200)
      );

      const responses = await Promise.all(requests);
      responses.forEach(res => {
        expect(res.body.success).to.be.true;
      });
    });
  });
});
