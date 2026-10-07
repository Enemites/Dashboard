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

Production, Preview, and Development values are stored as **Secret** environment variables in the Vercel project settings. The application reads them through `process.env` in server-only modules. `.env.example` contains empty placeholders; `.env.local` is used only for local development and is excluded from Git and deployment uploads.

The database connection must use a role with access only to the required tables and columns. See `database/reader-grants.sql` for grants; run them as the database owner after creating a dedicated LOGIN role. Do not use the database owner's credentials in the dashboard.

## Features and metric definitions

The logo and favicon reuse the original PNG assets from the waitlist landing page's `public/assets/logo.png` and `public/assets/favicon.png`. The dashboard keeps its neutral internal workspace palette.

- Registration totals, update opt-ins, recorded countries, and daily, weekly, monthly, or cumulative charts.
- Today and month-to-date growth, matched elapsed-time comparisons, full previous-period counts, and daily / monthly all-time records.
- Custom inclusive date ranges and filters for country, browser, operating system, age, device, and three-state update consent.
- Click a chart point or audience category to open its records. A period selector provides a keyboard-accessible chart drill-down.
- Completeness for recorded fields; database read duration, activity age, duplicate email rows, and future-dated records.
- Audience breakdowns by age, device, country, browser, and operating system.
- Searchable waitlist records with 10-row pagination, registration details, and CSV export.
- Form totals, active and unexpired status, and response counts within the selected period.
- Data source details, connection status, latest registration time, and metric coverage.
- Filters stored in the URL so team members with access can refresh or share a view.

Reports use **Asia/Jakarta (UTC+7)** with English date and number formatting. The 7-, 30-, and 90-day filters include today, starting at midnight on the first day and ending when the data is read. Custom ranges include both calendar dates and are capped at the read time. Selected-range comparisons use the immediately preceding, adjacent window of equal duration; the UI shows its boundaries. Weeks begin on Monday. Cumulative charts start at the beginning of the selected period and audience segment. All time is the default so historical registrations remain visible.

Growth cards retain audience filters but ignore the selected date range and text search. Today compares with yesterday through the same local time. Month-to-date compares with the same elapsed duration from the start of the previous month, capped at that month's full length. Full yesterday and previous-month totals are also shown. Daily and monthly ATH are the maximum calendar-period registration counts across the audience's recorded history, including the current incomplete period; ties show the earliest record. Growth is `(current - baseline) / baseline * 100`. A positive current count with a zero baseline displays **No baseline**; zero versus zero displays 0%. An audience with no history has no ATH.

Consent is counted and filtered consistently as opted in (`true`), opted out (`false`), or unknown (`NULL`). Completeness counts null / empty fields as missing and treats timezone-derived locations as unknown. Duplicate email counts are extra rows beyond the first, matched after trimming and lowercasing; they are not removed from registration totals. Future-dated records are flagged and excluded from registration metrics. No records are corrected or backfilled.

Data health is a check at page load or manual refresh, not scheduled monitoring. Read duration covers connection and read-only database queries. Last-registration age describes observed activity, not pipeline status: without a tracking heartbeat, a quiet period cannot establish an ingestion failure. Query failure shows the unavailable state instead of stale or fabricated results. Field completeness on Overview and Audience follows the selected audience and dates; Data sources reports the entire recorded dataset.

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
