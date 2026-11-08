/**
 * Security Guard & Anti-Inspection Protection Module
 * Blocks right-click context menu, DevTools inspector shortcuts,
 * view-source shortcuts, and unauthorized page saving.
 */

export const initWebProtection = () => {
  if (typeof window === 'undefined') return;

  // 1. Disable Right-Click Context Menu across total webpage
  document.addEventListener(
    'contextmenu',
    (e: MouseEvent) => {
      // Allow right-click on input and textarea if desired, otherwise block globally
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return; // Allow text editing inside forms
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    { capture: true }
  );

  // 2. Block Inspect, DevTools, Console & Source View Keyboard Shortcuts
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key ? e.key.toUpperCase() : '';
      const keyCode = e.keyCode;

      // F12 key (DevTools)
      if (key === 'F12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (isCtrlOrCmd) {
        // Ctrl+Shift+I or Cmd+Option+I (Inspect Element)
        if (isShift && (key === 'I' || keyCode === 73)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl+Shift+J or Cmd+Option+J (DevTools Console)
        if (isShift && (key === 'J' || keyCode === 74)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl+Shift+C (Inspect Element selector)
        if (isShift && (key === 'C' || keyCode === 67)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl+Shift+K (Firefox DevTools Console)
        if (isShift && (key === 'K' || keyCode === 75)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl+U or Cmd+U (View Page Source)
        if (key === 'U' || keyCode === 85) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Ctrl+S or Cmd+S (Save Page HTML)
        if (key === 'S' || keyCode === 83) {
          const target = e.target as HTMLElement | null;
          // Don't interrupt editor shortcut if inside a specialized code editor or form
          if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      }
    },
    { capture: true }
  );

  // 3. Prevent dragging images or links to save
  document.addEventListener('dragstart', (e: DragEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === 'IMG') {
      e.preventDefault();
    }
  });

  // 4. Subtle DevTools detection guard (pauses if DevTools is actively opened)
  if (typeof window !== 'undefined' && !import.meta.env.DEV) {
    let devtoolsOpen = false;
    const threshold = 160;

    setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      if (widthDiff || heightDiff) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          // In production, can blur document or log protection warning
          console.clear();
          console.warn(
            '%cSecurity Warning: Inspecting and modifying code on this platform is strictly monitored.',
            'color: red; font-size: 16px; font-weight: bold;'
          );
        }
      } else {
        devtoolsOpen = false;
      }
    }, 1000);
  }
};

export default initWebProtection;
