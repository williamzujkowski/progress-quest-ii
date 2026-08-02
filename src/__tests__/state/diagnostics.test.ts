// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DiagnosticRecorder, installBrowserDiagnosticHandlers } from '../../state/diagnostics';

const diagnostic = (error: unknown = new Error('failure')) => ({
  code: 'unhandled_rejection' as const,
  severity: 'error' as const,
  subsystem: 'browser' as const,
  operation: 'promise' as const,
  outcome: 'failed' as const,
  source: 'unhandled-rejection' as const,
  error,
});

describe('runtime diagnostics', () => {
  it('keeps only the newest 100 privacy-safe events', () => {
    let now = 0;
    const recorder = new DiagnosticRecorder({
      buildId: 'build-123',
      interactionId: 'interaction-456',
      now: () => new Date(now++).toISOString(),
    });

    for (let index = 0; index < 102; index += 1) {
      recorder.record(diagnostic(new Error(`Krg token=secret /home/william/save.pqw?auth=${index}`)));
    }

    const events = recorder.snapshot();
    const report = recorder.exportReport();
    expect(events).toHaveLength(100);
    expect(events[0]?.id).toBe('interaction-456:3');
    expect(events.at(-1)?.id).toBe('interaction-456:102');
    expect(report).toContain('build-123');
    expect(report).not.toMatch(/Krg|secret|william|save\.pqw|auth=/i);
  });

  it('deduplicates the same Error object across capture channels', () => {
    const recorder = new DiagnosticRecorder({ buildId: 'test', interactionId: 'same-error' });
    const error = new TypeError('private details');

    expect(recorder.record(diagnostic(error))).not.toBeNull();
    expect(recorder.record(diagnostic(error))).toBeNull();
    expect(recorder.snapshot()).toHaveLength(1);
    expect(recorder.snapshot()[0]?.details).toEqual({ errorType: 'TypeError' });
  });

  it('captures browser errors and unhandled rejections without suppressing them', () => {
    const recorder = new DiagnosticRecorder({ buildId: 'test', interactionId: 'browser-events' });
    const removeHandlers = installBrowserDiagnosticHandlers(window, recorder);
    const browserError = new Error('private browser detail');
    const rejection = new Event('unhandledrejection');
    Object.defineProperty(rejection, 'reason', { value: new RangeError('private promise detail') });

    try {
      const errorEvent = new ErrorEvent('error', { error: browserError });
      expect(window.dispatchEvent(errorEvent)).toBe(true);
      expect(window.dispatchEvent(rejection)).toBe(true);
      expect(recorder.snapshot().map((event) => event.code)).toEqual(['window_error', 'unhandled_rejection']);
    } finally {
      removeHandlers();
    }
  });
});
