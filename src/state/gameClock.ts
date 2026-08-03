export function startGameClock(
  tick: (elapsedMs: number) => void,
  now = () => performance.now(),
  onError: (error: unknown) => void = () => undefined,
  visibilityTarget: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> | undefined = typeof document === 'undefined' ? undefined : document,
): () => void {
  let previousTime = now();
  let wasHidden = visibilityTarget?.hidden ?? false;
  const resetBaseline = () => {
    previousTime = now();
    wasHidden = visibilityTarget?.hidden ?? false;
  };
  visibilityTarget?.addEventListener('visibilitychange', resetBaseline);
  const timer = setInterval(() => {
    const currentTime = now();
    const isHidden = visibilityTarget?.hidden ?? false;
    if (isHidden || wasHidden) {
      previousTime = currentTime;
      wasHidden = isHidden;
      return;
    }
    try {
      tick(Math.max(0, currentTime - previousTime));
    } catch (error: unknown) {
      // Keep the interval alive so a recoverable transition failure cannot strand the session.
      onError(error);
    }
    previousTime = currentTime;
  }, 50);

  return () => {
    clearInterval(timer);
    visibilityTarget?.removeEventListener('visibilitychange', resetBaseline);
  };
}
