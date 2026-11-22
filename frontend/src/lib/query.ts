'use client';

import { useEffect } from 'react';

/**
 * Run once on mount with the page's query parameters, e.g. `/bookings?new=1&room=…`
 * from the quick actions. Reads window.location so pages need no Suspense boundary.
 */
export function useQueryOnce(handler: (params: URLSearchParams) => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length) handler(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
