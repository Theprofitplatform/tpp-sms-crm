/**
 * BULK OPERATIONS MANAGER
 * 
 * Handles batch processing of Local SEO audits across multiple clients
 * Provides progress tracking and result aggregation
 */

import EventEmitter from 'events';

export class BulkOperationsManager extends EventEmitter {
  constructor() {
    super();
    this.operations = new Map();
  }

  /**
   * Start a bulk audit operation
   */
  async startBulkAudit(clientIds, orchestratorFactory, options = {}) {
    const operationId = `bulk_${Date.now()}`;
    
    const operation = {
      id: operationId,
      type: 'audit',
      advanced: options.advanced || false,
      totalClients: clientIds.length,
      completed: 0,
      successful: 0,
      failed: 0,
      results: [],
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running'
    };

    this.operations.set(operationId, operation);
    this.emit('started', operation);

    console.log(`\n📦 BULK AUDIT OPERATION: ${operationId}`);
    console.log(`   Clients: ${clientIds.length}`);
    console.log(`   Mode: ${options.advanced ? 'Advanced' : 'Basic'}`);
    console.log('='.repeat(70));

    // Process sequentially to avoid overwhelming the system
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      
      try {
        console.log(`\n[${i + 1}/${clientIds.length}] Processing ${clientId}...`);
        
        const orchestrator = await orchestratorFactory(clientId);
        const results = options.advanced ? 
          await orchestrator.runAdvancedAudit(options) :
          await orchestrator.runCompleteAudit();

        operation.results.push({
          clientId,
          success: true,
          score: this.extractScore(results),
          timestamp: new Date().toISOString()
        });

        operation.successful++;
        console.log(`   ✅ Success (Score: ${this.extractScore(results)})`);
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        
        operation.results.push({
          clientId,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        operation.failed++;
      }

      operation.completed++;
      operation.progress = Math.round((operation.completed / operation.totalClients) * 100);
      
      this.emit('progress', {
        operationId,
        clientId,
        completed: operation.completed,
        total: operation.totalClients,
        progress: operation.progress
      });

      // Small delay between clients
      if (i < clientIds.length - 1) {
        await this.delay(1000);
      }
    }

    operation.status = 'completed';
    operation.endTime = new Date().toISOString();
    operation.duration = this.calculateDuration(operation.startTime, operation.endTime);

    console.log('\n' + '='.repeat(70));
    console.log('📊 BULK AUDIT SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Total Clients: ${operation.totalClients}`);
    console.log(`   ✅ Successful: ${operation.successful}`);
    console.log(`   ❌ Failed: ${operation.failed}`);
    console.log(`   Duration: ${operation.duration}`);
    console.log(`   Avg Score: ${this.calculateAverage(operation.results)}`);

    this.emit('completed', operation);

    // Clean up old operations (keep last 10)
    if (this.operations.size > 10) {
      const oldestKey = Array.from(this.operations.keys())[0];
      this.operations.delete(oldestKey);
    }

    return operation;
  }

  /**
   * Get operation status
   */
  getOperationStatus(operationId) {
    const operation = this.operations.get(operationId);
    
    if (!operation) {
      return {
        found: false,
        message: 'Operation not found or expired'
      };
    }

    return {
      found: true,
      ...operation,
      // Don't include full results if still running
      results: operation.status === 'completed' ? operation.results : []
    };
  }

  /**
   * Get all recent operations
   */
  getRecentOperations(limit = 10) {
    return Array.from(this.operations.values())
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, limit)
      .map(op => ({
        id: op.id,
        type: op.type,
        totalClients: op.totalClients,
        completed: op.completed,
        successful: op.successful,
        failed: op.failed,
        progress: op.progress,
        status: op.status,
        startTime: op.startTime,
        endTime: op.endTime,
        duration: op.duration
      }));
  }

  /**
   * Extract score from results
   */
  extractScore(results) {
    const napScore = results.tasks?.napConsistency?.score || 0;
    const schemaScore = results.tasks?.schema?.hasSchema ? 100 : 0;
    
    if (results.advanced) {
      const citationScore = results.advanced?.citations?.analysis?.score || 0;
      const reviewScore = results.advanced?.reviews?.summary?.reputationScore || 0;
      return Math.round((napScore * 0.25) + (schemaScore * 0.20) + (citationScore * 0.30) + (reviewScore * 0.25));
    }
    
    return Math.round((napScore + schemaScore) / 2);
  }

  /**
   * Calculate average score
   */
  calculateAverage(results) {
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) return 0;
    
    const sum = successful.reduce((acc, r) => acc + r.score, 0);
    return Math.round(sum / successful.length);
  }

  /**
   * Calculate duration
   */
  calculateDuration(start, end) {
    const ms = new Date(end) - new Date(start);
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Utility delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const bulkOpsManager = new BulkOperationsManager();
export default bulkOpsManager;
