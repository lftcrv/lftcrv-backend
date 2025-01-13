import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

type LogType = 'info' | 'error' | 'success' | 'warn';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private loggedRequests = new Set<string>();

  private log(
    event: string,
    details: Record<string, any>,
    type: LogType = 'info',
  ) {
    const logKey = JSON.stringify({ event, details });

    if (!this.loggedRequests.has(logKey)) {
      const timestamp = new Date().toISOString();
      const color =
        type === 'error'
          ? colors.red
          : type === 'success'
            ? colors.green
            : type === 'warn'
              ? colors.yellow
              : colors.blue;

      const icon =
        type === 'error'
          ? '❌'
          : type === 'success'
            ? '✅'
            : type === 'warn'
              ? '⚠️'
              : 'ℹ️';

      const formattedDetails = Object.entries(details)
        .map(
          ([key, value]) =>
            `${colors.cyan}${key}${colors.reset}=${colors.yellow}${value}${colors.reset}`,
        )
        .join(' | ');

      console.log(
        `${color}${icon} [${timestamp}] ${event}${colors.reset} ${formattedDetails}`,
      );

      this.loggedRequests.add(logKey);
      setTimeout(() => this.loggedRequests.delete(logKey), 5000);
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const clientIp = req.headers['x-forwarded-for'] || 'unknown';

    this.log('REQUEST', {
      method,
      url,
      ip: clientIp.substring(0, 6),
    });

    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: (data) => {
          this.log(
            'RESPONSE',
            {
              method,
              url,
              duration: `${Date.now() - now}ms`,
              status: data?.status || 'success',
            },
            data?.status === 'error' ? 'error' : 'success',
          );
        },
        error: (error) => {
          this.log(
            'ERROR',
            {
              method,
              url,
              duration: `${Date.now() - now}ms`,
              message: error.message,
            },
            'error',
          );
        },
      }),
    );
  }
}
