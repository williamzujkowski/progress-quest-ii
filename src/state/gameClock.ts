export function startGameClock(tick: (elapsedMs: number) => void, now = () => performance.now()): () => void {
  let previousTime = now();
  const timer = setInterval(() => {
    const currentTime = now();
    tick(Math.max(0, currentTime - previousTime));
    previousTime = currentTime;
  }, 50);

  return () => clearInterval(timer);
}
