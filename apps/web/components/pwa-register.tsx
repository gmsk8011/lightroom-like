"use client";

import * as React from "react";

/** Registered only in production — a service worker fighting Turbopack's
 *  own HMR/dev-server caching would be actively counterproductive locally. */
export function PwaRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a nicety here, not a requirement of the app
      // working — a failed registration shouldn't be user-visible.
    });
  }, []);

  return null;
}
