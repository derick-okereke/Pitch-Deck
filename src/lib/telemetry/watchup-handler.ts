// Kept independent of the SDK so transparency and failure isolation can be tested.
export function observeWatchupHandler<Args extends unknown[]>(
  handler: (...args: Args) => Response | Promise<Response>,
  start: () => (status: number) => void,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    let finish: ((status: number) => void) | undefined;
    try { finish = start(); } catch { /* optional monitoring */ }
    const report = (status: number) => { try { finish?.(status); } catch { /* optional monitoring */ } };
    try {
      const response = await handler(...args);
      report(response.status);
      return response;
    } catch (error) {
      report(500);
      throw error;
    }
  };
}
