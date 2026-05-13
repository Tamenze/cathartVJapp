// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b12d0415c1d24f0cf5de81b510297ee0@o4510344752922624.ingest.us.sentry.io/4511379285147648",
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) delete event.request.data;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
