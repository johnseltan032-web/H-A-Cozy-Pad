# Netlify + Railway Deployment

Netlify hosts the Vite frontend. Railway runs the PHP API and MySQL database. The Netlify build creates a same-origin proxy for `/api/*`, so API requests, PHP sessions, and uploaded files use the Netlify site URL in the browser.

## Railway

1. Create a Railway project and add a MySQL service.
2. Add this repository as a service in the same Railway project and environment. Railway should build it with the root `Dockerfile`; the PHP API is served under `/api`.
   In **Settings → Deploy → Custom Start Command**, set the command to `/usr/local/bin/start-apache`. This image-bundled launcher configures Railway's `PORT` and starts Apache. Do not use `npm` or paste a shell command here.
3. In the API service variables, connect the MySQL service values. Use Railway's variable references if they are not injected automatically:

   ```text
   MYSQLHOST=${{MySQL.MYSQLHOST}}
   MYSQLPORT=${{MySQL.MYSQLPORT}}
   MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}
   MYSQLUSER=${{MySQL.MYSQLUSER}}
   MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
   ```

   Replace `MySQL` in the references with the actual Railway MySQL service name. Add these to the PHP/API service, not only the MySQL service. Remove any `DB_HOST=localhost` override if present. Do not commit database credentials.
4. Add `DIFY_API_KEY` to the API service variables. Optionally set `DIFY_API_URL` if using a Dify-compatible endpoint other than `https://api.dify.ai/v1`. Keep the API key server-side; never prefix it with `VITE_` or add it to Netlify.
5. For verification emails and email notifications, set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in the API service variables. Use a Gmail app password for an account with 2-Step Verification enabled, not the account password. These values are read by the PHP API and must not be placed in Netlify variables or committed to the repository.
6. Import the schema from `sql/database/create_db.sql` into the Railway database. It includes the `notifications` and email-verification tables. For an existing database, apply only migrations for schema changes that have not already been applied.
7. Generate a public domain for the API service and note its origin, such as `https://your-api-service.up.railway.app`.
8. Add a Railway Volume mounted at `/var/www/html/api/uploads` if listing images and booking uploads must survive redeploys. The container prepares this directory for PHP writes at startup.

## Netlify

1. Import the same GitHub repository as a Netlify site. The committed `netlify.toml` selects the build command and `dist` publish directory.
2. Add this site environment variable in Netlify:

   ```text
   RAILWAY_API_ORIGIN=https://your-api-service.up.railway.app
   ```

   Use the Railway API service's public HTTPS origin only: no `/api` suffix and no trailing path. The build uses it to generate the `/api/*` proxy rule.
3. Trigger a fresh deploy after setting the variable. Do not set `VITE_API_URL` in Netlify; the frontend must keep its relative `/api` base so the proxy and PHP session cookies remain same-origin.
4. Set Railway's `FRONTEND_ORIGIN` to the exact deployed Netlify origin, for example `https://your-site.netlify.app`. This is used for credentialed API CORS responses and email verification links.

The notification endpoints are served by the PHP API at `/api/notifications.php`. The frontend calls them through the same-origin Netlify `/api/*` proxy, so requests include the PHP session cookie. To check the connection, sign in on the deployed Netlify site, open the browser Network panel, and confirm requests to `/api/notifications.php` return successfully. A `401` response means the API was reached but the session is not authenticated; a CORS or proxy error usually means `RAILWAY_API_ORIGIN` or `FRONTEND_ORIGIN` is missing or incorrect.

Database credentials belong only in Railway service variables. Do not put them in Netlify variables or any `VITE_*` variable, because Vite variables are embedded in public frontend files.

For local XAMPP development, copy `.env.example` to `.env` and adjust `VITE_API_URL` if the project folder name or local server URL differs.