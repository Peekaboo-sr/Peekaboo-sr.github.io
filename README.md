# RV Power

Install the dependencies with `python3 -m pip install -r requirements.txt` in a
virtual environment. Run `python3 tools/serve.py --port 8765`, then open
[the website](http://127.0.0.1:8765/) and
[the admin page](http://127.0.0.1:8765/admin). Enter the key from the
local `.rv-power-admin-key` file generated on the first server start. The key
file stays outside browser access. Sign out from the dashboard to end the session.

The catalog runs on static hosting. The local dashboard reads aggregate counts
stored by the preview server in `.rv-power-analytics.sqlite3`. The server binds
to loopback. Public analytics needs a deployed collection endpoint and a private
dashboard.

Edit model details and manufacturer source links in `site/catalog.js`. After
editing specifications, run `python3 tools/build_specs.py` in a Python
environment with ReportLab to regenerate the downloadable PDFs.

## Catalog prices

Products with a published Honda India price show the Honda price and the RV
Power price at 10% off. Products without a published price show “Price on
enquiry.” Use the contact page to request a quote.

## Live analytics

`analytics/` contains the Cloudflare Worker and D1 schema for the public
storefront. Generate a separate hosted admin key and store it as the Worker
secret `ADMIN_KEY`. Keep the Cloudflare plan on Free.

Run `sh analytics/prepare.sh` before deploying. Apply `analytics/schema.sql`
to the D1 binding, then set the public Worker’s `/api/events` URL in the
`rv-analytics-endpoint` meta tag in `index.html` and `contact-us.html`.
The hosted dashboard is at the Worker’s `/admin` endpoint. It reports
activity collected after the storefront starts sending events. The local
server continues to use its own analytics database.
