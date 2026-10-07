-- Apply with a database owner after creating a LOGIN role named dashboard_reader.
-- This dashboard never runs schema migrations against the landing-page tables.
GRANT CONNECT ON DATABASE neondb TO dashboard_reader;
GRANT USAGE ON SCHEMA public TO dashboard_reader;
GRANT SELECT (id, name, email, phone_number, age_group, receive_updates,
  created_at, country, city, device_type, operating_system, browser)
  ON public.waitlist TO dashboard_reader;
GRANT SELECT ON public.enemites_forms, public.enemites_form_submissions TO dashboard_reader;
ALTER ROLE dashboard_reader SET default_transaction_read_only = on;
ALTER ROLE dashboard_reader SET statement_timeout = '10s';
