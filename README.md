# Enemites Internal Analytics

Internal analytics for [Enemites/Waitlist-landing-page](https://github.com/Enemites/Waitlist-landing-page), with a neutral interface designed for team operations.

## Stack and data source

- Next.js App Router, React, TypeScript, Recharts, and Geist.
- Frontend and server routes hosted on the Vercel project `enemites-analytics`.
- Shared Neon project `floral-flower-85390584`, database `neondb`, and `production` branch used by the landing page.
- Dedicated `dashboard_reader` role. The application only reads waitlist and form data; it does not run migrations or modify these records.
- Postgres pool with verified TLS, a maximum of three connections, a 10-second query timeout, and `attachDatabasePool` for Vercel Fluid compute.

## Local development

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). For a new setup, create `.env.local` from `.env.example`. The initial local configuration and team access key at `.setup/access-key.txt` are ignored by Git.

Required server environment variables: `DATABASE_URL`, `DASHBOARD_ACCESS_KEY`, and `SESSION_SECRET`. Never use the `NEXT_PUBLIC_` prefix for secrets.

The database connection must use a role with access only to the required tables and columns. See `database/reader-grants.sql` for grants; run them as the database owner after creating a dedicated LOGIN role. Do not use the database owner's credentials in the dashboard.

## Features and metric definitions

- Registration totals, update opt-ins, recorded countries, and daily or cumulative charts.
- Audience breakdowns by age, device, country, browser, and operating system.
- Searchable waitlist records with 10-row pagination, registration details, and CSV export.
- Form totals, active and unexpired status, and response counts within the selected period.
- Data source details, connection status, latest registration time, and metric coverage.
- Filters stored in the URL so team members with access can refresh or share a view.

Reports use **Asia/Jakarta (UTC+7)** with English date and number formatting. The 7-, 30-, and 90-day filters include today, starting at midnight on the first day and ending when the data is read. Comparisons use the preceding period of equal duration. When that period has no registrations, the dashboard displays the zero baseline without inventing a growth percentage. Cumulative charts start at the beginning of the selected period and audience segment. All time is the default so historical registrations remain visible.

Audience filters apply to waitlist statistics, charts, segments, records, and exports. Text search affects only the records and export. Forms follow the date range only. Missing locations and `Local (timezone)` values are grouped as unknown because they do not identify a verified country. Browser and device information describe registrations, not site visitor counts.

Visitor counts, pageviews, UTM/referrer data, and conversion rates are not yet recorded in Neon. The dashboard explicitly identifies unavailable metrics and uses no sample data or estimates. This project does not change landing page tracking.

## Internal access

Sign-in uses a random 256-bit team access key. There is no public account registration. Sessions are encrypted and authenticated with iron-session, expire after eight hours, and use HttpOnly, SameSite=Strict cookies with Secure enabled in production. Every data read and export is checked on the server. Login attempts are throttled per instance; this is not a global rate limiter. For a larger rollout, consider Vercel Firewall rules or a team identity provider.

To rotate access, generate a new cryptographic key, set `DASHBOARD_ACCESS_KEY`, and replace `SESSION_SECRET` to invalidate existing sessions. Both values must be at least 32 characters. Preserve high entropy rather than substituting a short password.

CSV exports follow the active filters, are limited to 10,000 rows, and use a UTF-8 BOM with quote and newline escaping. Spreadsheet formula values are neutralized. Exported contact information remains internal team data.

## Validation

```sh
npm run build
npm run typecheck
npm test
```

## Deployment

Source: [Enemites/Dashboard](https://github.com/Enemites/Dashboard).

Production: [enemites-analytics.vercel.app](https://enemites-analytics.vercel.app).

The GitHub repository is connected to Vercel. Pushing to `main` triggers a production deployment. The three required server environment variables are configured in Vercel; local project metadata is stored in the ignored `.vercel/project.json`.

The dashboard requires the team access key. Unique deployment URLs may also require Vercel Authentication. Never commit `.env.local`, `.setup`, exports, or other credentials to Git or include them in deployment packages.
