export function startGameClock(
  tick: (elapsedMs: number) => void,
  now = () => performance.now(),
  onError: (error: unknown) => void = () => undefined,
  visibilityTarget: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> | undefined = typeof document === 'undefined' ? undefined : document,
): () => void {
  let previousTime = now();
  let bankedMs = 0;

  // Move wall-clock progress into the bank without deciding yet whether to spend it.
  const bankElapsed = () => {
    const currentTime = now();
    bankedMs += Math.max(0, currentTime - previousTime);
    previousTime = currentTime;
  };

  // An open-but-hidden tab keeps earning time. Banking on the transition itself means a
  // throttled background interval cannot lose the span between its last run and the switch.
  visibilityTarget?.addEventListener('visibilitychange', bankElapsed);

  const timer = setInterval(() => {
    bankElapsed();
    // Hidden ticks accumulate only; the engine's bounded catch-up spends the bank on return.
    if (visibilityTarget?.hidden ?? false) return;
    const elapsedMs = bankedMs;
    bankedMs = 0;
    try {
      tick(elapsedMs);
    } catch (error: unknown) {
      // Keep the interval alive so a recoverable transition failure cannot strand the session.
      onError(error);
    }
  }, 50);

  return () => {
    clearInterval(timer);
    visibilityTarget?.removeEventListener('visibilitychange', bankElapsed);
  };
}
