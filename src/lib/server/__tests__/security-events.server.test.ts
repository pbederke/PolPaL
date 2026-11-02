import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(),
  trace: vi.fn(), fatal: vi.fn(), child: vi.fn().mockReturnThis(),
}));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger }));

import { logSecurityEvent } from '../security-events.server';

describe('security-events.server', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('logs a security event at warn level', () => {
    logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.1' });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { securityEvent: 'AUTH_FAILURE', ip: '10.0.0.1' },
      '[SECURITY] AUTH_FAILURE',
    );
  });

  it('does not trigger alert below threshold', () => {
    for (let i = 0; i < 9; i++) {
      logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.2' });
    }

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('triggers alert at threshold (10 AUTH_FAILURE)', () => {
    for (let i = 0; i < 10; i++) {
      logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.3' });
    }

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ securityEvent: 'SECURITY_ALERT', triggeredBy: 'AUTH_FAILURE' }),
      expect.stringContaining('SECURITY ALERT'),
    );
  });

  it('tracks per-IP separately', () => {
    for (let i = 0; i < 10; i++) {
      logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.4' });
    }

    expect(mockLogger.error).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 10; i++) {
      logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.5' });
    }

    expect(mockLogger.error).toHaveBeenCalledTimes(2);
  });

  it('tracks different event types separately', () => {
    for (let i = 0; i < 5; i++) {
      logSecurityEvent('RATE_LIMIT_HIT', { ip: '10.0.0.6' });
    }

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('excess events beyond threshold also trigger alerts', () => {
    for (let i = 0; i < 15; i++) {
      logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.7' });
    }

    expect(mockLogger.error).toHaveBeenCalledTimes(6);
  });

  it('window expires and resets', () => {
    for (let i = 0; i < 9; i++) {
      logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.8' });
    }

    vi.advanceTimersByTime(61_000);

    logSecurityEvent('AUTH_FAILURE', { ip: '10.0.0.8' });
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
