/**
 * Simple, focused logging system for essential operations
 * Only logs key financial operations and errors
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class FinanceLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Keep only last 100 logs

  private log(level: LogLevel, category: string, message: string, data?: any) {
    // Only process logs in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // COMPLETELY SILENT - no console output
  }

  // Financial operations logging
  transaction(operation: string, count?: number, amount?: number) {
    this.log('info', 'TRANSACTION', `${operation}${count ? ` (${count} items)` : ''}${amount ? ` - $${amount.toLocaleString()}` : ''}`);
  }

  reimbursement(month: string, income: number, reimbursements: number, processed: number, total: number) {
    this.log('info', 'REIMBURSEMENT', `${month}: ${processed}/${total} procesadas | Ingresos: $${income.toLocaleString()} | Reembolsos: $${reimbursements.toLocaleString()}`);
  }

  score(score: number, details?: { balance: number; assets: number; liabilities: number }) {
    this.log('info', 'SCORE', `Score financiero: ${score}`, details);
  }

  // Error logging
  error(category: string, message: string, error?: any) {
    this.log('error', category.toUpperCase(), message, error);
  }

  // Get recent logs for debugging
  getRecentLogs(category?: string): LogEntry[] {
    if (category) {
      return this.logs.filter(log => log.category === category.toUpperCase()).slice(-20);
    }
    return this.logs.slice(-20);
  }

  // Clear logs
  clear() {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new FinanceLogger();
