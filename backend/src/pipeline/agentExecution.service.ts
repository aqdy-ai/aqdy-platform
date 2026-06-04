import { logger } from "../utils/logger.js";
import { metrics } from "../utils/metrics.js";

export interface AgentJobPayload {
  contractId: string;
  userId: string;
  text: string;
  language: "ar" | "en";
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

interface AgentJob<T> {
  id: string;
  payload: T;
  attempt: number;
  maxAttempts: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

type AgentWorker<T> = (payload: T) => Promise<void>;
type AgentFinalFailureHook<T> = (payload: T, error: Error) => Promise<void>;

export class AgentExecutionService<TPayload> {
  private queue: AgentJob<TPayload>[] = [];
  private isProcessing = false;

  constructor(
    private readonly worker: AgentWorker<TPayload>,
    private readonly maxAttempts = 3,
    private readonly retryDelayMs = 2000,
    private readonly onFinalFailure?: AgentFinalFailureHook<TPayload>,
  ) {}

  public enqueue(payload: TPayload, maxAttempts?: number): Promise<void> {
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return new Promise<void>((resolve, reject) => {
      const job: AgentJob<TPayload> = {
        id: jobId,
        payload,
        attempt: 1,
        maxAttempts: maxAttempts ?? this.maxAttempts,
        resolve,
        reject,
      };

      this.queue.push(job);
      metrics.increment("agent_jobs_queued");
      logger.info("AgentExecutionService: queued job", {
        jobId,
        queueLength: this.queue.length,
        maxAttempts: job.maxAttempts,
      });

      void this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await this.processJob(job);
    }

    this.isProcessing = false;
  }

  private async processJob(job: AgentJob<TPayload>): Promise<void> {
    try {
      await this.worker(job.payload);
      metrics.increment("agent_jobs_completed");
      logger.info("AgentExecutionService: job completed", {
        jobId: job.id,
        attempts: job.attempt,
      });
      job.resolve();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isFinalAttempt = job.attempt >= job.maxAttempts;

      logger.warn("AgentExecutionService: job failed", {
        jobId: job.id,
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
        error: errorMessage,
        isFinalAttempt,
      });

      metrics.increment("agent_jobs_failed");

      if (isFinalAttempt) {
        if (this.onFinalFailure) {
          try {
            await this.onFinalFailure(
              job.payload,
              error instanceof Error ? error : new Error(errorMessage),
            );
          } catch (auditError) {
            logger.error("AgentExecutionService: final failure hook failed", {
              jobId: job.id,
              error:
                auditError instanceof Error
                  ? auditError.message
                  : String(auditError),
            });
          }
        }
        job.reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      job.attempt += 1;
      const delayMs = this.retryDelayMs * job.attempt;
      logger.info("AgentExecutionService: retrying job after delay", {
        jobId: job.id,
        nextAttempt: job.attempt,
        delayMs,
      });
      await this.delay(delayMs);
      await this.processJob(job);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
