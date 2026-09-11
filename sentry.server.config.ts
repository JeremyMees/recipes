import * as Sentry from '@sentry/nuxt'

Sentry.init({
  dsn: 'https://18b9ad9549fdc0ccf11c661971819358@o1373533.ingest.us.sentry.io/4512068302602240',
  tracesSampleRate: 0.1,
  enableLogs: true,
  debug: false,
  enabled: !import.meta.dev,
})
