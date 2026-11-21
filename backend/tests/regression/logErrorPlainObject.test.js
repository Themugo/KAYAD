import { jest } from '@jest/globals';
import logger, { logError } from '../../infrastructure/logging/index.js';

// D-OBS-1: logError(msg, { error: err.message }) logged `err: {}` and lost the cause.
describe('logError with plain-object second argument', () => {
  let spy;
  beforeEach(() => { spy = jest.spyOn(logger, 'error').mockImplementation(() => {}); });
  afterEach(() => spy.mockRestore());
  test('plain object is logged as structured fields, not as an empty err', () => {
    logError('X', { error: 'boom', code: 'E1' }, { requestId: 'r1' });
    expect(spy).toHaveBeenCalledWith({ error: 'boom', code: 'E1', requestId: 'r1' }, 'X');
  });
  test('Error instances still use the err serializer slot', () => {
    const e = new Error('real');
    logError('Y', e, { requestId: 'r2' });
    expect(spy).toHaveBeenCalledWith({ requestId: 'r2', err: e }, 'Y');
  });
  test('null error is unchanged', () => {
    logError('Z');
    expect(spy).toHaveBeenCalledWith({ err: null }, 'Z');
  });
});
