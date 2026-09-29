# SecureWise frontend

## GA4 analytics

GA4 is initialized once in `src/analytics/ga4.ts` with the measurement ID from
`VITE_GA4_MEASUREMENT_ID` (defaulting to `G-BRT6MH6KPD` when the variable is
not supplied). The app sends one explicit `page_view` for the initial route and
subsequent React Router path changes; automatic GA4 page views are disabled.
Paths are normalized to route paths and redact query strings, hashes, emails,
UUIDs, long token-like values, and numeric identifiers. Do not pass secrets,
user content, or identifiers as event parameters.

For production deployment, configure `VITE_GA4_MEASUREMENT_ID=G-BRT6MH6KPD`
as a Vercel build-time environment variable for the Production environment,
then redeploy. The ID is only used when Vite reports a production build
(`import.meta.env.PROD`) or the deployment environment is explicitly marked
with `VITE_DEPLOYMENT_ENV=production` or `VITE_VERCEL_ENV=production`. Local
development therefore cannot send data to the production property. The
measurement ID override is optional because the production bundle includes
`G-BRT6MH6KPD` as its default. The
repository had no CSP before GA4 was added, so `vercel.json` intentionally
does not add one; adding `default-src 'self'` would risk blocking the
application's existing API, font, and asset behavior. If a CSP is introduced
later, it must be based on the deployed asset/API inventory and include at
least `https://www.googletagmanager.com`, `https://www.google-analytics.com`,
and the regional GA endpoint used by the browser.

There is currently no consent-management layer in this frontend. As a result,
production analytics runs without a consent gate, while the loader remains
non-personalized (`allow_google_signals` and
`allow_ad_personalization_signals` are disabled). If a consent manager is
introduced, gate `initializeAnalytics` and event calls on the required
analytics consent, and preserve the existing path sanitization and
non-personalized configuration.

## Development

This project uses React, TypeScript, Vite, and React Router.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
