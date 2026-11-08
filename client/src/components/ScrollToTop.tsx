import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop ensures the browser window scrolls back up to (0, 0)
 * whenever the route pathname or search parameters change.
 * If a hash is present, it scrolls smoothly to the target element if found.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // If there is an anchor link, scroll to it
      const targetElement = document.getElementById(hash.replace('#', ''));
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Scroll the window to top
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });

    // Also reset scroll for documentElement and body (cross-browser safeguard)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Reset any custom overflow-y container if present
    const portalScrollables = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    portalScrollables.forEach((el) => {
      // Avoid resetting chat containers or mini-widgets if unnecessary,
      // but ensure main portal view containers scroll to top on route change
      if (el.clientHeight > 300) {
        el.scrollTop = 0;
      }
    });
  }, [pathname, search, hash]);

  return null;
}
