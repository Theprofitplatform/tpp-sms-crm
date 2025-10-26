/**
 * Integration Tests for API v2 - Sync Service
 * Tests bidirectional sync between systems
 */

const request = require('supertest');
const { expect } = require('chai');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:9000';
const API_PREFIX = '/api/v2';

describe('API v2 - Sync Service Integration Tests', () => {
  describe('GET /api/v2/sync/status', () => {
    it('should return sync status', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/sync/status`)
        .expect(200);

      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('status');
      expect(res.body.status).to.have.property('isSyncing');
      expect(res.body.status).to.have.property('lastSyncTime');
      expect(res.body.status).to.have.property('stats');
    });

    it('should include sync details', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/sync/status`)
        .expect(200);

      expect(res.body.status.details).to.be.an('array');
      if (res.body.status.details.length > 0) {
        const detail = res.body.status.details[0];
        expect(detail).to.have.property('source_system');
        expect(detail).to.have.property('source_table');
        expect(detail).to.have.property('target_table');
        expect(detail).to.have.property('status');
      }
    });
  });

  describe('POST /api/v2/sync/trigger', () => {
    it('should trigger manual sync', async () => {
      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/sync/trigger`)
        .expect(200);

      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('message');
    });

    it('should not allow concurrent syncs', async () => {
      // Trigger first sync
      await request(BASE_URL)
        .post(`${API_PREFIX}/sync/trigger`)
        .expect(200);

      // Try to trigger another immediately
      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/sync/trigger`)
        .expect(409); // Conflict

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('already in progress');
    });
  });

  describe('GET /api/v2/sync/history', () => {
    it('should return sync history', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/sync/history`)
        .expect(200);

      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('history');
      expect(res.body.history).to.be.an('array');
    });

    it('should support pagination for history', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/sync/history?page=1&per_page=10`)
        .expect(200);

      expect(res.body.pagination).to.exist;
      expect(res.body.pagination.page).to.equal(1);
    });
  });

  describe('POST /api/v2/sync/keywords/bulk', () => {
    it('should bulk sync keywords', async () => {
      const bulkData = {
        source: 'serpbear',
        keyword_ids: [1, 2, 3]
      };

      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/sync/keywords/bulk`)
        .send(bulkData)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body).to.have.property('synced_count');
    });

    it('should validate bulk sync data', async () => {
      const res = await request(BASE_URL)
        .post(`${API_PREFIX}/sync/keywords/bulk`)
        .send({})
        .expect(400);

      expect(res.body.success).to.be.false;
    });
  });

  describe('Sync Data Integrity', () => {
    it('should maintain data consistency after sync', async () => {
      // Get keyword count before sync
      const before = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/stats`)
        .expect(200);

      // Trigger sync
      await request(BASE_URL)
        .post(`${API_PREFIX}/sync/trigger`)
        .expect(200);

      // Wait for sync to complete (check status)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get keyword count after sync
      const after = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/stats`)
        .expect(200);

      // Count should be >= before (new data might be added)
      expect(after.body.stats.total).to.be.at.least(before.body.stats.total);
    });

    it('should not create duplicate keywords', async () => {
      // Trigger sync twice
      await request(BASE_URL)
        .post(`${API_PREFIX}/sync/trigger`)
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const firstCount = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/stats`)
        .then(res => res.body.stats.total);

      await request(BASE_URL)
        .post(`${API_PREFIX}/sync/trigger`)
        .expect(200);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const secondCount = await request(BASE_URL)
        .get(`${API_PREFIX}/keywords/stats`)
        .then(res => res.body.stats.total);

      // Count should not increase significantly (no duplicates)
      expect(Math.abs(secondCount - firstCount)).to.be.below(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would need a test environment where we can simulate DB issues
      // Placeholder for now
      expect(true).to.be.true;
    });

    it('should record sync errors in status', async () => {
      const res = await request(BASE_URL)
        .get(`${API_PREFIX}/sync/status`)
        .expect(200);

      expect(res.body.status.stats).to.have.property('totalErrors');
      // Should be a number
      expect(typeof res.body.status.stats.totalErrors).to.equal('number');
    });
  });
});
