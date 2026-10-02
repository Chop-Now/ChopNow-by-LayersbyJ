/**
 * L9 - when the structured logger itself throws, errorHandler's fallback
 * must still redact sensitive fields before dumping to console.error,
 * instead of printing err.stack (and any custom properties on err) raw.
 */
const logger = require('../utils/logger');
const { errorHandler } = require('../middleware/errorHandler');

describe('errorHandler fallback redaction (L9)', () => {
  let loggerSpy;
  let consoleSpy;

  beforeEach(() => {
    loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => {
      throw new Error('logger transport down');
    });
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  const res = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  it('redacts a sensitive property attached to the error before console.error', () => {
    const err = new Error('boom');
    err.password = 'super-secret-value';

    errorHandler(err, { originalUrl: '/x', method: 'POST', id: 'req1' }, res(), () => {});

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logged = consoleSpy.mock.calls[0][0];
    expect(JSON.stringify(logged)).not.toContain('super-secret-value');
    expect(logged.password).toBe('[REDACTED]');
  });

  it('still responds normally even when the fallback path is used', () => {
    const err = new Error('boom');
    const response = res();

    errorHandler(err, { originalUrl: '/x', method: 'POST', id: 'req1' }, response, () => {});

    expect(response.status).toHaveBeenCalledWith(500);
  });
});
