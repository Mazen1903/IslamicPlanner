import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Hook that executes a callback when the application transitions from background/inactive to active (foreground).
 */
export function useAppForeground(onForeground: () => void): void {
  const onForegroundRef = useRef(onForeground);

  useEffect(() => {
    onForegroundRef.current = onForeground;
  }, [onForeground]);

  useEffect(() => {
    let lastState = AppState.currentState;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        (lastState === 'background' || lastState === 'inactive') &&
        nextState === 'active'
      ) {
        onForegroundRef.current();
      }
      lastState = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
