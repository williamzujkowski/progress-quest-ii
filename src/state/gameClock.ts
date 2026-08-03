export function startGameClock(
  tick: (elapsedMs: number) => void,
  now = () => performance.now(),
  onError: (error: unknown) => void = () => undefined,
): () => void {
  let previousTime = now();
  const timer = setInterval(() => {
    const currentTime = now();
    try {
      tick(Math.max(0, currentTime - previousTime));
    } catch (error: unknown) {
      // Keep the interval alive so a recoverable transition failure cannot strand the session.
      onError(error);
    }
    previousTime = currentTime;
  }, 50);

  return () => clearInterval(timer);
}
