# DelIQ application database

This directory contains the Supabase migration for DelIQ's control-tower
database. It is intentionally separate from the simulated ERP/WMS/TMS
database.

The `deliq` schema stores:

- delivery exception cases and their source-system snapshot;
- evidence/events used to explain detection;
- ranked AI recommendations;
- human approvals and executed actions;
- manual issue capture, audit history, and KPI views.

The migration seeds one deterministic `SE-48213` short-pick case for the demo.
Run the migration against the DelIQ Supabase project, then connect the backend
using the server-side Supabase service-role key. Do not expose that key in the
browser.
