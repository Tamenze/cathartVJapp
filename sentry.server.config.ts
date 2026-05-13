import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? "development",
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: false,
  beforeSend(event) {
    // Strip request bodies so transcripts never appear in Sentry
    if (event.request) delete event.request.data;
    return event;
  },
});
