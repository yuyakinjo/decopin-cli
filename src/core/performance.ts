export interface PerformanceMetrics {
  startupTime: number;
  moduleLoadTime: {
    [module: string]: number;
  };
  memoryUsage: {
    initial: number;
    peak: number;
  };
  commandExecutionTime: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    startupTime: 0,
    moduleLoadTime: {},
    memoryUsage: {
      initial: process.memoryUsage().heapUsed / 1024 / 1024,
      peak: 0
    },
    commandExecutionTime: 0
  };

  private startTime = performance.now();

  measureModuleLoad<T>(moduleName: string, loader: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return loader().then(result => {
      this.metrics.moduleLoadTime[moduleName] = performance.now() - start;
      this.updatePeakMemory();
      return result;
    });
  }

  recordStartupComplete() {
    this.metrics.startupTime = performance.now() - this.startTime;
  }

  recordCommandExecution(duration: number) {
    this.metrics.commandExecutionTime = duration;
  }

  private updatePeakMemory() {
    const current = process.memoryUsage().heapUsed / 1024 / 1024;
    if (current > this.metrics.memoryUsage.peak) {
      this.metrics.memoryUsage.peak = current;
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  printSummary() {
    console.log('\n=== Performance Summary ===');
    console.log(`Startup time: ${this.metrics.startupTime.toFixed(2)}ms`);
    console.log(`Initial memory: ${this.metrics.memoryUsage.initial.toFixed(2)}MB`);
    console.log(`Peak memory: ${this.metrics.memoryUsage.peak.toFixed(2)}MB`);
    
    if (Object.keys(this.metrics.moduleLoadTime).length > 0) {
      console.log('\nModule load times:');
      for (const [module, time] of Object.entries(this.metrics.moduleLoadTime)) {
        console.log(`  ${module}: ${time.toFixed(2)}ms`);
      }
    }
    
    if (this.metrics.commandExecutionTime > 0) {
      console.log(`\nCommand execution: ${this.metrics.commandExecutionTime.toFixed(2)}ms`);
    }
  }
}