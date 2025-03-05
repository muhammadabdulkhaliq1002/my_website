import { logger } from './logger'

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.shouldReset()) {
      this.reset();
    }

    if (this.state === CircuitState.OPEN) {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldReset(): boolean {
    if (this.state === CircuitState.OPEN &&
        Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
      return true;
    }
    return false;
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = CircuitState.HALF_OPEN;
    logger.info('Circuit breaker reset to HALF_OPEN state');
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      logger.info('Circuit breaker restored to CLOSED state');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker opened due to failures', {
        failures: this.failureCount,
        lastFailure: new Date(this.lastFailureTime).toISOString()
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

class ConnectionManager {
  private static instance: ConnectionManager;
  private circuitBreaker: CircuitBreaker;

  private constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000 // 30 seconds
    });
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async executeQuery<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}

export const connectionManager = ConnectionManager.getInstance();
export { CircuitState };