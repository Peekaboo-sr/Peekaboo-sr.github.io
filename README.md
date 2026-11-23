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
