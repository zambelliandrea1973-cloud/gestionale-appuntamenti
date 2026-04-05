import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger', () => {
  const originalEnv = process.env.LOG_LEVEL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.LOG_LEVEL = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
  });

  it('always logs errors regardless of level', async () => {
    process.env.LOG_LEVEL = 'error';
    const { logger } = await import('../server/utils/logger');
    logger.error('critical error');
    expect(console.error).toHaveBeenCalledWith('critical error');
  });

  it('error logger works at warn level', async () => {
    process.env.LOG_LEVEL = 'warn';
    const { logger } = await import('../server/utils/logger');
    logger.error('test error');
    expect(console.error).toHaveBeenCalledWith('test error');
  });
});
