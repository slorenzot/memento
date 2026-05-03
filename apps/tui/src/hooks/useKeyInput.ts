import { useInput } from 'ink';

/**
 * Hook to register global keyboard input handler.
 * Wraps Ink's useInput for clean abstraction.
 *
 * @param handler - callback receiving the key string
 */
export function useKeyInput(handler: (key: string) => void): void {
  useInput((input, key) => {
    // Map special keys to consistent strings
    if (key.upArrow) {
      handler('up');
    } else if (key.downArrow) {
      handler('down');
    } else if (key.return) {
      handler('enter');
    } else if (key.escape) {
      handler('escape');
    } else if (key.tab) {
      handler('tab');
    } else if (key.backspace) {
      handler('backspace');
    } else if (input) {
      handler(input);
    }
  });
}
