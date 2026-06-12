import { logger } from "../utils/logger.js";
import * as langfuseConfig from "../config/langfuse.config.js";

// ── Types ─────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AgentCallMetrics {
  agentName: "extractor" | "riskClassifier" | "redline";
  contractId: string;
  userId: string;
  tokenUsage: TokenUsage;
  estimatedCostUSD: number;
  latencyMs: number;
  model: string;
  usedFallback: boolean;
  success: boolean;
  error?: string;
}

export interface AnalysisMetrics {
  contractId: string;
  userId: string;
  totalTokens: TokenUsage;
  totalCostUSD: number;
  totalLatencyMs: number;
  agentCalls: AgentCallMetrics[];
  clauseCount: number;
  success: boolean;
}

// ── Model Pricing (per 1M tokens) ─────────────────
const MODEL_PRICING = {
  "gpt-4o": {
    inputPer1M: 2.50,
    outputPer1M: 10.00,
  },
  "gemini-3.5-flash": {
    inputPer1M: 0.075,
    outputPer1M: 0.3,
  },
  "gemini-3.1-flash-lite": {
    inputPer1M: 0.0375,
    outputPer1M: 0.15,
  },
};

// ── In-Memory Metrics Store ───────────────────────
interface MetricsSnapshot {
  timestamp: Date;
  contractId: string;
  totalTokens: number;
  totalCostUSD: number;
  latencyMs: number;
  success: boolean;
}

const metricsHistory: MetricsSnapshot[] = [];
const HISTORY_LIMIT = 1000;

// ── Alert Thresholds ──────────────────────────────
const ALERT_THRESHOLDS = {
  tokenSpikeMultiplier: 3, // 3x rolling average
  errorRatePercent: 5, // 5% error rate
  latencyMs: 5000, // 5 seconds
  windowMinutes: 5, // 5-minute window
};

// ── MetricsService ────────────────────────────────

export class MetricsService {
  // Calculate estimated cost
  calculateCost(model: string, tokenUsage: TokenUsage): number {
    const pricing =
      MODEL_PRICING[model as keyof typeof MODEL_PRICING] ??
      MODEL_PRICING["gemini-3.1-flash-lite"];

    const inputCost = (tokenUsage.inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost =
      (tokenUsage.outputTokens / 1_000_000) * pricing.outputPer1M;

    return Math.round((inputCost + outputCost) * 100000) / 100000;
  }

  // Estimate token count from text
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Track agent call metrics
  trackAgentCall(metrics: AgentCallMetrics): void {
    const langfuse = langfuseConfig.getLangfuseClient();
    if (langfuse) {
      langfuse.trace({
        id: `metrics-${metrics.contractId}-${metrics.agentName}-${Date.now()}`,
        name: `agent-metrics-${metrics.agentName}`,
        userId: metrics.userId,
        metadata: {
          agentName: metrics.agentName,
          contractId: metrics.contractId,
          tokenUsage: metrics.tokenUsage,
          estimatedCostUSD: metrics.estimatedCostUSD,
          latencyMs: metrics.latencyMs,
          model: metrics.model,
          usedFallback: metrics.usedFallback,
          success: metrics.success,
          error: metrics.error,
        },
      });
    }

    logger.info("📊 Agent call tracked", {
      agent: metrics.agentName,
      tokens: metrics.tokenUsage.totalTokens,
      cost: `$${metrics.estimatedCostUSD}`,
      latency: `${metrics.latencyMs}ms`,
    });
  }

  // Track full analysis metrics
  trackAnalysis(metrics: AnalysisMetrics): void {
    // Store in history
    metricsHistory.push({
      timestamp: new Date(),
      contractId: metrics.contractId,
      totalTokens: metrics.totalTokens.totalTokens,
      totalCostUSD: metrics.totalCostUSD,
      latencyMs: metrics.totalLatencyMs,
      success: metrics.success,
    });

    // Keep history within limit
    if (metricsHistory.length > HISTORY_LIMIT) {
      metricsHistory.shift();
    }

    // Check for anomalies
    this.checkAnomalies(metrics);

    logger.info("📊 Analysis metrics tracked", {
      contractId: metrics.contractId,
      totalTokens: metrics.totalTokens.totalTokens,
      totalCost: `$${metrics.totalCostUSD}`,
      latency: `${metrics.totalLatencyMs}ms`,
      clauses: metrics.clauseCount,
    });
  }

  // Check for anomalies
  checkAnomalies(metrics: AnalysisMetrics): void {
    // 1. Token spike detection
    const rollingAvg = this.getRollingAverageTokens();
    if (
      rollingAvg > 0 &&
      metrics.totalTokens.totalTokens >
        rollingAvg * ALERT_THRESHOLDS.tokenSpikeMultiplier
    ) {
      logger.warn("🚨 ALERT: Token usage spike detected!", {
        contractId: metrics.contractId,
        currentTokens: metrics.totalTokens.totalTokens,
        rollingAverage: rollingAvg,
        threshold: rollingAvg * ALERT_THRESHOLDS.tokenSpikeMultiplier,
      });
    }

    // 2. Latency alert
    if (metrics.totalLatencyMs > ALERT_THRESHOLDS.latencyMs) {
      logger.warn("🚨 ALERT: High latency detected!", {
        contractId: metrics.contractId,
        latencyMs: metrics.totalLatencyMs,
        thresholdMs: ALERT_THRESHOLDS.latencyMs,
      });
    }

    // 3. Error rate check
    const errorRate = this.getErrorRateInWindow();
    if (errorRate > ALERT_THRESHOLDS.errorRatePercent) {
      logger.warn("🚨 ALERT: High error rate detected!", {
        errorRate: `${errorRate.toFixed(1)}%`,
        threshold: `${ALERT_THRESHOLDS.errorRatePercent}%`,
        windowMinutes: ALERT_THRESHOLDS.windowMinutes,
      });
    }
  }

  // Get rolling average tokens (last 10 analyses)
  getRollingAverageTokens(): number {
    const recent = metricsHistory.slice(-10);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, m) => sum + m.totalTokens, 0) / recent.length;
  }

  // Get error rate in last 5 minutes
  getErrorRateInWindow(): number {
    const windowMs = ALERT_THRESHOLDS.windowMinutes * 60 * 1000;
    const cutoff = new Date(Date.now() - windowMs);
    const recent = metricsHistory.filter((m) => m.timestamp >= cutoff);

    if (recent.length === 0) return 0;

    const errors = recent.filter((m) => !m.success).length;
    return (errors / recent.length) * 100;
  }

  // Get dashboard summary
  getDashboardSummary(): object {
    const now = new Date();
    const todayCutoff = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayMetrics = metricsHistory.filter(
      (m) => m.timestamp >= todayCutoff,
    );
    const weekMetrics = metricsHistory.filter((m) => m.timestamp >= weekCutoff);
    const monthMetrics = metricsHistory.filter(
      (m) => m.timestamp >= monthCutoff,
    );

    const avgLatency =
      metricsHistory.length > 0
        ? metricsHistory.reduce((sum, m) => sum + m.latencyMs, 0) /
          metricsHistory.length
        : 0;

    const totalCost = metricsHistory.reduce(
      (sum, m) => sum + m.totalCostUSD,
      0,
    );
    const totalTokens = metricsHistory.reduce(
      (sum, m) => sum + m.totalTokens,
      0,
    );

    return {
      analyses: {
        today: todayMetrics.length,
        week: weekMetrics.length,
        month: monthMetrics.length,
        total: metricsHistory.length,
      },
      performance: {
        avgLatencyMs: Math.round(avgLatency),
        errorRate: `${this.getErrorRateInWindow().toFixed(1)}%`,
      },
      costs: {
        totalTokens,
        estimatedCostUSD: Math.round(totalCost * 100) / 100,
      },
      alerts: {
        tokenSpikeThreshold: `${ALERT_THRESHOLDS.tokenSpikeMultiplier}x rolling average`,
        errorRateThreshold: `${ALERT_THRESHOLDS.errorRatePercent}%`,
        latencyThreshold: `${ALERT_THRESHOLDS.latencyMs}ms`,
      },
    };
  }
}

export const metricsService = new MetricsService();
