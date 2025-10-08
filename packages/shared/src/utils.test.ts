import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSuccessResponse, createErrorResponse, validateEnvVars, formatJson, createLogger } from './utils.js';

describe('utils', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with text content', () => {
      const result = createSuccessResponse('Hello, world!');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Hello, world!',
          },
        ],
      });
    });

    it('should handle empty string', () => {
      const result = createSuccessResponse('');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '',
          },
        ],
      });
    });

    it('should handle multi-line text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = createSuccessResponse(text);

      expect(result.content[0].text).toBe(text);
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response from Error object', () => {
      const error = new Error('Something went wrong');
      const result = createErrorResponse(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Something went wrong',
          },
        ],
        isError: true,
      });
    });

    it('should create an error response from string', () => {
      const result = createErrorResponse('Invalid input');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Invalid input',
          },
        ],
        isError: true,
      });
    });

    it('should handle empty string error', () => {
      const result = createErrorResponse('');

      expect(result.content[0].text).toBe('Error: ');
      expect(result.isError).toBe(true);
    });

    it('should extract message from Error object', () => {
      const error = new TypeError('Type mismatch');
      const result = createErrorResponse(error);

      expect(result.content[0].text).toBe('Error: Type mismatch');
    });
  });

  describe('validateEnvVars', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should not throw when all required vars are present', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';

      expect(() => validateEnvVars(['VAR1', 'VAR2'])).not.toThrow();
    });

    it('should throw when a required var is missing', () => {
      process.env.VAR1 = 'value1';

      expect(() => validateEnvVars(['VAR1', 'VAR2'])).toThrow(
        'Missing required environment variables: VAR2'
      );
    });

    it('should throw when multiple vars are missing', () => {
      process.env.VAR1 = 'value1';

      expect(() => validateEnvVars(['VAR1', 'VAR2', 'VAR3'])).toThrow(
        'Missing required environment variables: VAR2, VAR3'
      );
    });

    it('should not throw when validating empty array', () => {
      expect(() => validateEnvVars([])).not.toThrow();
    });

    it('should treat undefined as missing', () => {
      process.env.VAR1 = undefined;

      expect(() => validateEnvVars(['VAR1'])).toThrow(
        'Missing required environment variables: VAR1'
      );
    });

    it('should treat empty string as missing', () => {
      process.env.VAR1 = '';

      expect(() => validateEnvVars(['VAR1'])).toThrow(
        'Missing required environment variables: VAR1'
      );
    });
  });

  describe('formatJson', () => {
    it('should format object as indented JSON', () => {
      const data = { name: 'John', age: 30 };
      const result = formatJson(data);

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
    });

    it('should format array as indented JSON', () => {
      const data = [1, 2, 3];
      const result = formatJson(data);

      expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'Alice',
          roles: ['admin', 'user'],
        },
      };
      const result = formatJson(data);

      expect(result).toContain('"user"');
      expect(result).toContain('"name": "Alice"');
      expect(result).toContain('"roles"');
    });

    it('should handle null', () => {
      const result = formatJson(null);
      expect(result).toBe('null');
    });

    it('should handle boolean', () => {
      expect(formatJson(true)).toBe('true');
      expect(formatJson(false)).toBe('false');
    });

    it('should handle number', () => {
      expect(formatJson(42)).toBe('42');
      expect(formatJson(3.14)).toBe('3.14');
    });

    it('should handle string', () => {
      const result = formatJson('hello');
      expect(result).toBe('"hello"');
    });

    it('should use 2-space indentation', () => {
      const data = { a: { b: 'c' } };
      const result = formatJson(data);

      expect(result).toContain('  "a"');
      expect(result).toContain('    "b"');
    });
  });

  describe('createLogger', () => {
    const originalLogLevel = process.env.LOG_LEVEL;

    beforeEach(() => {
      process.env.LOG_LEVEL = 'info';
    });

    afterEach(() => {
      if (originalLogLevel === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = originalLogLevel;
      }
    });

    it('should create logger with name', () => {
      const logger = createLogger('test-logger');

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('should have all logging methods', () => {
      const logger = createLogger('test');

      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should not throw when calling logging methods', () => {
      const logger = createLogger('test');

      expect(() => logger.debug('debug message')).not.toThrow();
      expect(() => logger.info('info message')).not.toThrow();
      expect(() => logger.warn('warn message')).not.toThrow();
      expect(() => logger.error('error message')).not.toThrow();
    });

    it('should accept additional arguments in logging methods', () => {
      const logger = createLogger('test');

      expect(() => logger.debug('message', { data: 'value' })).not.toThrow();
      expect(() => logger.info('message', 1, 2, 3)).not.toThrow();
    });

    it('should handle error objects in error method', () => {
      const logger = createLogger('test');
      const error = new Error('test error');

      expect(() => logger.error('Failed', error)).not.toThrow();
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'error';

      const logger = createLogger('test');
      expect(logger).toBeDefined();
    });

    it('should use default log level when not specified', () => {
      delete process.env.LOG_LEVEL;

      const logger = createLogger('test');
      expect(logger).toBeDefined();
    });

    it('should create different loggers for different names', () => {
      const logger1 = createLogger('logger1');
      const logger2 = createLogger('logger2');

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
      expect(logger1).not.toBe(logger2);
    });
  });
});
