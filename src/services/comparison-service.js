/**
 * CLIENT COMPARISON SERVICE
 * 
 * Compare Local SEO performance across multiple clients
 * Generate benchmarking reports and identify best/worst performers
 */

export class ComparisonService {
  constructor(clientData) {
    this.clients = clientData || [];
  }

  /**
   * Compare multiple clients
   */
  compareClients(clientIds = null) {
    let clientsToCompare = this.clients;

    if (clientIds && clientIds.length > 0) {
      clientsToCompare = this.clients.filter(c => clientIds.includes(c.id));
    }

    if (clientsToCompare.length === 0) {
      return {
        error: 'No clients to compare',
        clients: []
      };
    }

    const comparison = {
      totalClients: clientsToCompare.length,
      timestamp: new Date().toISOString(),
      clients: clientsToCompare.map(client => this.getClientMetrics(client)),
      rankings: this.calculateRankings(clientsToCompare),
      averages: this.calculateAverages(clientsToCompare),
      insights: []
    };

    comparison.insights = this.generateInsights(comparison);

    return comparison;
  }

  /**
   * Get standardized metrics for a client
   */
  getClientMetrics(client) {
    return {
      id: client.id,
      name: client.name || client.id,
      overallScore: client.score || 0,
      napScore: client.fullResults?.tasks?.napConsistency?.score || 0,
      schemaScore: client.fullResults?.tasks?.schema?.hasSchema ? 100 : 0,
      citationScore: client.fullResults?.advanced?.citations?.analysis?.score || null,
      reputationScore: client.fullResults?.advanced?.reviews?.summary?.reputationScore || null,
      competitivePosition: client.fullResults?.advanced?.competitors?.comparison?.position || null,
      lastAudit: client.lastRun || null,
      hasAdvancedData: !!client.fullResults?.advanced
    };
  }

  /**
   * Calculate rankings
   */
  calculateRankings(clients) {
    const sortedByScore = [...clients].sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      byOverallScore: sortedByScore.slice(0, 10).map((c, i) => ({
        rank: i + 1,
        id: c.id,
        name: c.name || c.id,
        score: c.score || 0
      })),
      topPerformer: sortedByScore[0] ? {
        id: sortedByScore[0].id,
        name: sortedByScore[0].name || sortedByScore[0].id,
        score: sortedByScore[0].score || 0
      } : null,
      needsAttention: sortedByScore.filter(c => (c.score || 0) < 50).map(c => ({
        id: c.id,
        name: c.name || c.id,
        score: c.score || 0,
        priority: (c.score || 0) < 30 ? 'critical' : 'high'
      }))
    };
  }

  /**
   * Calculate averages across all clients
   */
  calculateAverages(clients) {
    const validClients = clients.filter(c => c.score !== undefined && c.score !== null);
    
    if (validClients.length === 0) {
      return {
        overallScore: 0,
        napScore: 0,
        schemaScore: 0,
        clientsWithData: 0
      };
    }

    const sum = validClients.reduce((acc, c) => {
      return {
        overallScore: acc.overallScore + (c.score || 0),
        napScore: acc.napScore + (c.fullResults?.tasks?.napConsistency?.score || 0),
        schemaScore: acc.schemaScore + (c.fullResults?.tasks?.schema?.hasSchema ? 100 : 0)
      };
    }, { overallScore: 0, napScore: 0, schemaScore: 0 });

    return {
      overallScore: Math.round(sum.overallScore / validClients.length),
      napScore: Math.round(sum.napScore / validClients.length),
      schemaScore: Math.round(sum.schemaScore / validClients.length),
      clientsWithData: validClients.length,
      totalClients: clients.length
    };
  }

  /**
   * Generate insights from comparison
   */
  generateInsights(comparison) {
    const insights = [];

    // Average score insight
    if (comparison.averages.overallScore < 60) {
      insights.push({
        type: 'warning',
        category: 'overall',
        message: `Portfolio average (${comparison.averages.overallScore}/100) is below target. Consider bulk optimization.`,
        priority: 'high'
      });
    } else if (comparison.averages.overallScore >= 80) {
      insights.push({
        type: 'success',
        category: 'overall',
        message: `Excellent portfolio average (${comparison.averages.overallScore}/100). Maintain current standards.`,
        priority: 'low'
      });
    }

    // Clients needing attention
    if (comparison.rankings.needsAttention.length > 0) {
      const criticalCount = comparison.rankings.needsAttention.filter(c => c.priority === 'critical').length;
      
      insights.push({
        type: 'alert',
        category: 'attention',
        message: `${comparison.rankings.needsAttention.length} client(s) need immediate attention (${criticalCount} critical).`,
        priority: 'high',
        clients: comparison.rankings.needsAttention
      });
    }

    // Schema implementation
    const schemaAvg = comparison.averages.schemaScore;
    if (schemaAvg < 50) {
      insights.push({
        type: 'opportunity',
        category: 'schema',
        message: `Only ${schemaAvg}% of clients have schema markup. Quick win opportunity.`,
        priority: 'medium'
      });
    }

    // NAP consistency
    const napAvg = comparison.averages.napScore;
    if (napAvg < 80) {
      insights.push({
        type: 'warning',
        category: 'nap',
        message: `Average NAP consistency (${napAvg}/100) needs improvement across portfolio.`,
        priority: 'medium'
      });
    }

    // Performance spread
    if (comparison.rankings.topPerformer && comparison.rankings.needsAttention.length > 0) {
      const spread = comparison.rankings.topPerformer.score - 
                     (comparison.rankings.needsAttention[0]?.score || 0);
      
      if (spread > 50) {
        insights.push({
          type: 'info',
          category: 'spread',
          message: `Large performance gap (${spread} points) between top and bottom performers. Consider standardizing processes.`,
          priority: 'low'
        });
      }
    }

    return insights;
  }

  /**
   * Compare two clients directly
   */
  compareTwoClients(clientId1, clientId2) {
    const client1 = this.clients.find(c => c.id === clientId1);
    const client2 = this.clients.find(c => c.id === clientId2);

    if (!client1 || !client2) {
      return {
        error: 'One or both clients not found',
        clientId1,
        clientId2
      };
    }

    const metrics1 = this.getClientMetrics(client1);
    const metrics2 = this.getClientMetrics(client2);

    return {
      client1: metrics1,
      client2: metrics2,
      comparison: {
        overallScore: {
          client1: metrics1.overallScore,
          client2: metrics2.overallScore,
          difference: metrics1.overallScore - metrics2.overallScore,
          winner: metrics1.overallScore > metrics2.overallScore ? clientId1 : clientId2
        },
        napScore: {
          client1: metrics1.napScore,
          client2: metrics2.napScore,
          difference: metrics1.napScore - metrics2.napScore,
          winner: metrics1.napScore > metrics2.napScore ? clientId1 : clientId2
        },
        schemaScore: {
          client1: metrics1.schemaScore,
          client2: metrics2.schemaScore,
          difference: metrics1.schemaScore - metrics2.schemaScore,
          winner: metrics1.schemaScore > metrics2.schemaScore ? clientId1 : clientId2
        }
      },
      recommendation: this.getComparisonRecommendation(metrics1, metrics2)
    };
  }

  /**
   * Get recommendation from comparison
   */
  getComparisonRecommendation(metrics1, metrics2) {
    const recommendations = [];

    // Overall score
    if (Math.abs(metrics1.overallScore - metrics2.overallScore) > 20) {
      const lower = metrics1.overallScore < metrics2.overallScore ? metrics1 : metrics2;
      recommendations.push({
        priority: 'high',
        message: `Focus on improving ${lower.name} - significant gap in overall performance.`
      });
    }

    // NAP
    if (metrics1.napScore < 80 || metrics2.napScore < 80) {
      recommendations.push({
        priority: 'medium',
        message: 'Both clients need NAP consistency improvements.'
      });
    }

    // Schema
    if (metrics1.schemaScore === 0 || metrics2.schemaScore === 0) {
      const missing = metrics1.schemaScore === 0 ? metrics1.name : metrics2.name;
      recommendations.push({
        priority: 'medium',
        message: `Add schema markup to ${missing} for quick SEO boost.`
      });
    }

    return recommendations;
  }

  /**
   * Get performance distribution
   */
  getPerformanceDistribution() {
    const distribution = {
      excellent: { range: '80-100', count: 0, clients: [] },
      good: { range: '60-79', count: 0, clients: [] },
      fair: { range: '40-59', count: 0, clients: [] },
      poor: { range: '0-39', count: 0, clients: [] }
    };

    this.clients.forEach(client => {
      const score = client.score || 0;
      const clientInfo = { id: client.id, name: client.name || client.id, score };

      if (score >= 80) {
        distribution.excellent.count++;
        distribution.excellent.clients.push(clientInfo);
      } else if (score >= 60) {
        distribution.good.count++;
        distribution.good.clients.push(clientInfo);
      } else if (score >= 40) {
        distribution.fair.count++;
        distribution.fair.clients.push(clientInfo);
      } else {
        distribution.poor.count++;
        distribution.poor.clients.push(clientInfo);
      }
    });

    return {
      distribution,
      total: this.clients.length,
      percentages: {
        excellent: Math.round((distribution.excellent.count / this.clients.length) * 100) || 0,
        good: Math.round((distribution.good.count / this.clients.length) * 100) || 0,
        fair: Math.round((distribution.fair.count / this.clients.length) * 100) || 0,
        poor: Math.round((distribution.poor.count / this.clients.length) * 100) || 0
      }
    };
  }

  /**
   * Identify improvement opportunities
   */
  identifyOpportunities() {
    const opportunities = [];

    this.clients.forEach(client => {
      const clientOpps = {
        id: client.id,
        name: client.name || client.id,
        score: client.score || 0,
        opportunities: []
      };

      // Schema opportunity
      if (!client.fullResults?.tasks?.schema?.hasSchema) {
        clientOpps.opportunities.push({
          type: 'schema',
          priority: 'high',
          impact: 'medium',
          effort: 'low',
          message: 'Add schema markup - quick win for +20 points'
        });
      }

      // NAP opportunity
      const napScore = client.fullResults?.tasks?.napConsistency?.score || 0;
      if (napScore < 80) {
        clientOpps.opportunities.push({
          type: 'nap',
          priority: 'high',
          impact: 'high',
          effort: 'medium',
          message: `Fix NAP inconsistencies - potential +${Math.round((100 - napScore) * 0.3)} points`
        });
      }

      // Citation opportunity
      const citationScore = client.fullResults?.advanced?.citations?.analysis?.score;
      if (citationScore !== null && citationScore < 70) {
        clientOpps.opportunities.push({
          type: 'citations',
          priority: 'medium',
          impact: 'medium',
          effort: 'high',
          message: 'Build more citations - improve local visibility'
        });
      }

      if (clientOpps.opportunities.length > 0) {
        opportunities.push(clientOpps);
      }
    });

    // Sort by score (lowest first - most need)
    opportunities.sort((a, b) => a.score - b.score);

    return {
      totalOpportunities: opportunities.reduce((sum, c) => sum + c.opportunities.length, 0),
      clientsWithOpportunities: opportunities.length,
      opportunities
    };
  }
}

export default ComparisonService;
