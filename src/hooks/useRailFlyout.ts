import { useCallback, useEffect, useRef, useState } from 'react';

const CLOSE_DELAY_MS = 150;

export function useRailFlyout<Id extends string>() {
  const [state, setState] = useState<{ id: Id; top: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const open = useCallback((id: Id, anchor: HTMLElement) => {
    cancelClose();
    setState({ id, top: anchor.getBoundingClientRect().top });
  }, [cancelClose]);
  const close = useCallback(() => {
    cancelClose();
    setState(null);
  }, [cancelClose]);
  const scheduleClose = useCallback(() => {
    cancelClose();
    timer.current = setTimeout(() => setState(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  return { openId: state?.id ?? null, top: state?.top ?? 0, open, close, scheduleClose, cancelClose };
}
