export function calculateGuessPoints(
  remainingSeconds: number,
  drawingTimeSeconds: number,
  playersWhoGuessed: number
): number {
  const duration = Math.max(1, drawingTimeSeconds);
  const remaining = Math.max(0, Math.min(remainingSeconds, duration));
  const timeFactor = remaining / duration;
  const basePoints = 100;
  const crowdPenalty = Math.min(playersWhoGuessed * 5, 30);
  return Math.max(10, Math.round(basePoints * (0.5 + 0.5 * timeFactor) - crowdPenalty));
}

export function calculateDrawerPoints(correctGuesses: number, totalGuessers: number): number {
  if (totalGuessers <= 0) return 0;
  const successRate = correctGuesses / totalGuessers;
  return Math.round(100 * successRate);
}
