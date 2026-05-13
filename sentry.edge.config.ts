// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
