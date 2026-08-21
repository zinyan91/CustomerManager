export interface ApiHealthState {
  reachable: boolean;
}

const REACHABLE: ApiHealthState = Object.freeze({ reachable: true });
const UNREACHABLE: ApiHealthState = Object.freeze({ reachable: false });

let state: ApiHealthState = REACHABLE;
const listeners = new Set<() => void>();

function setState(next: ApiHealthState): void {
  if (next === state) return;
  state = next;
  listeners.forEach(fn => fn());
}

export function recordApiSuccess(): void {
  setState(REACHABLE);
}

export function recordApiFailure(): void {
  setState(UNREACHABLE);
}

export function getApiHealth(): ApiHealthState {
  return state;
}

export function subscribeApiHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function resetApiHealth(): void {
  state = REACHABLE;
}

export function isUnreachableResponseStatus(status: number): boolean {
  return status >= 500 || status === 401;
}

export function wrapFetchWithHealthTracking(fetchImpl: typeof fetch): typeof fetch {
  return async (input, init) => {
    try {
      const res = await fetchImpl(input, init);
      if (isUnreachableResponseStatus(res.status)) recordApiFailure();
      else recordApiSuccess();
      return res;
    } catch (err) {
      recordApiFailure();
      throw err;
    }
  };
}
