/** TypeScript types `catch` variables as `unknown` under strict mode — this safely extracts a message. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "An unexpected error occurred.";
}
