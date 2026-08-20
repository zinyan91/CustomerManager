import { useSyncExternalStore } from 'react';
import { getApiHealth, subscribeApiHealth, type ApiHealthState } from '../lib/apiHealth';

export function useApiHealth(): ApiHealthState {
  return useSyncExternalStore(subscribeApiHealth, getApiHealth, getApiHealth);
}
