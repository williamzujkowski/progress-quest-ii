export type DiagnosticCode =
  | 'react_caught'
  | 'react_uncaught'
  | 'react_recoverable'
  | 'window_error'
  | 'unhandled_rejection'
  | 'clipboard_unavailable'
  | 'clipboard_denied'
  | 'clipboard_write_failed'
  | 'roster_read_failed'
  | 'roster_write_failed'
  | 'roster_delete_failed'
  | 'diagnostic_export_failed'
  | 'save_export_failed'
  | 'game_tick_failed'
  | 'audio_unsupported'
  | 'audio_initialize_failed'
  | 'audio_resume_failed'
  | 'audio_play_failed'
  | 'theme_read_failed'
  | 'theme_write_failed'
  | 'pwa_registration_failed'
  | 'pwa_update_failed';

export type DiagnosticSubsystem = 'react' | 'browser' | 'clipboard' | 'diagnostics' | 'save' | 'storage' | 'audio' | 'theme' | 'pwa';
export type DiagnosticOperation = 'render' | 'recover' | 'event-handler' | 'promise' | 'read' | 'write' | 'delete' | 'copy' | 'export' | 'initialize' | 'resume' | 'play' | 'update';
export type DiagnosticSource =
  | 'react-root'
  | 'window-error'
  | 'unhandled-rejection'
  | 'save-modal'
  | 'recovery-ui'
  | 'game-clock'
  | 'audio-engine'
  | 'theme-preference'
  | 'pwa-lifecycle';

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  severity: 'warning' | 'error';
  code: DiagnosticCode;
  subsystem: DiagnosticSubsystem;
  operation: DiagnosticOperation;
  outcome: 'failed' | 'recovered';
  buildId: string;
  interactionId: string;
  source: DiagnosticSource;
  details: { errorType: string };
}

export interface DiagnosticInput {
  severity: DiagnosticEvent['severity'];
  code: DiagnosticCode;
  subsystem: DiagnosticSubsystem;
  operation: DiagnosticOperation;
  outcome: DiagnosticEvent['outcome'];
  source: DiagnosticSource;
  error?: unknown;
}

interface DiagnosticRecorderOptions {
  buildId: string;
  interactionId?: string;
  now?: () => string;
}

const MAX_DIAGNOSTIC_EVENTS = 100;
const SAFE_ERROR_TYPES = new Set([
  'AggregateError',
  'DOMException',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
]);

function randomInteractionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now().toString(36)}`;
}

function safeErrorType(error: unknown): string {
  try {
    const name: unknown = error instanceof Error ? error.name : undefined;
    return typeof name === 'string' && SAFE_ERROR_TYPES.has(name) ? name : 'UnknownError';
  } catch {
    return 'UnknownError';
  }
}

export class DiagnosticRecorder {
  private readonly events: DiagnosticEvent[] = [];
  private readonly seenErrors = new WeakMap<object, number>();
  private readonly buildId: string;
  private readonly interactionId: string;
  private readonly now: () => string;
  private dedupeGeneration = 0;
  private dedupeCleanupQueued = false;
  private sequence = 0;

  public constructor({ buildId, interactionId = randomInteractionId(), now = () => new Date().toISOString() }: DiagnosticRecorderOptions) {
    this.buildId = buildId;
    this.interactionId = interactionId;
    this.now = now;
  }

  public record(input: DiagnosticInput): DiagnosticEvent | null {
    if (typeof input.error === 'object' && input.error !== null) {
      if (this.seenErrors.get(input.error) === this.dedupeGeneration) return null;
      this.seenErrors.set(input.error, this.dedupeGeneration);
      if (!this.dedupeCleanupQueued) {
        this.dedupeCleanupQueued = true;
        queueMicrotask(() => {
          this.dedupeGeneration += 1;
          this.dedupeCleanupQueued = false;
        });
      }
    }

    this.sequence += 1;
    const event = Object.freeze({
      id: `${this.interactionId}:${this.sequence}`,
      timestamp: this.now(),
      severity: input.severity,
      code: input.code,
      subsystem: input.subsystem,
      operation: input.operation,
      outcome: input.outcome,
      buildId: this.buildId,
      interactionId: this.interactionId,
      source: input.source,
      details: Object.freeze({ errorType: safeErrorType(input.error) }),
    });
    this.events.push(event);
    if (this.events.length > MAX_DIAGNOSTIC_EVENTS) this.events.shift();
    return event;
  }

  public snapshot(): readonly DiagnosticEvent[] {
    return [...this.events];
  }

  public exportReport(): string {
    return JSON.stringify({
      schemaVersion: 1,
      generatedAt: this.now(),
      buildId: this.buildId,
      interactionId: this.interactionId,
      events: this.events,
    }, null, 2);
  }
}

export const diagnostics = new DiagnosticRecorder({ buildId: __BUILD_ID__ });

const installedBrowserHandlers = new WeakMap<Window, () => void>();

export function installBrowserDiagnosticHandlers(
  target: Window = window,
  recorder: DiagnosticRecorder = diagnostics,
): () => void {
  installedBrowserHandlers.get(target)?.();
  const handleError = (event: ErrorEvent) => {
    recorder.record({
      code: 'window_error',
      severity: 'error',
      subsystem: 'browser',
      operation: 'event-handler',
      outcome: 'failed',
      source: 'window-error',
      error: event.error,
    });
  };
  const handleRejection = (event: PromiseRejectionEvent) => {
    recorder.record({
      code: 'unhandled_rejection',
      severity: 'error',
      subsystem: 'browser',
      operation: 'promise',
      outcome: 'failed',
      source: 'unhandled-rejection',
      error: event.reason,
    });
  };

  target.addEventListener('error', handleError);
  target.addEventListener('unhandledrejection', handleRejection);
  const removeHandlers = () => {
    target.removeEventListener('error', handleError);
    target.removeEventListener('unhandledrejection', handleRejection);
    if (installedBrowserHandlers.get(target) === removeHandlers) installedBrowserHandlers.delete(target);
  };
  installedBrowserHandlers.set(target, removeHandlers);
  return removeHandlers;
}
