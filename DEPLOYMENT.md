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
5. For verification emails and email notifications, configure PHPMailer to use Gmail SMTP in the API service variables:

   ```text
   GMAIL_USER=hna.cozypad.service@gmail.com
   GMAIL_APP_PASSWORD=<Google app password>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=ssl
   ```

   Generate a new Google App Password with 2-Step Verification enabled; do not use the normal account password. PHPMailer is installed into the PHP image from `composer.json`. `RESEND_API_KEY` and `EMAIL_FROM` are not used by this mailer. Keep credentials only in Railway and redeploy the PHP/API service after changing them. Railway must permit outbound SMTP to `smtp.gmail.com:465`; if the service logs show a connection timeout, PHPMailer cannot bypass that network restriction and an HTTPS email provider API will be needed instead.
6. Import the schema from `sql/database/create_db.sql` into the Railway database. It includes the `notifications` and email-verification tables. For an existing database, apply only migrations for schema changes that have not already been applied.
7. Generate a public domain for the API service and note its origin, such as `https://your-api-service.up.railway.app`.
8. Add a Railway Volume mounted at `/var/www/html/api/uploads` if listing images and booking uploads must survive redeploys. The container prepares this directory for PHP writes at startup.

### Google Calendar service

The Google Calendar OAuth server is a separate Node service; it does not run inside the PHP/API service. In the same Railway project, create another service from this repository and set **Settings → Build → Dockerfile Path** to `Dockerfile.calendar`. Set its variables to:

```text
CLIENT_ID=<Google OAuth web client ID>
SECRET_ID=<Google OAuth client secret>
FRONTEND_ORIGIN=https://your-site.netlify.app
GOOGLE_REDIRECT_URI=https://your-calendar-service.up.railway.app/auth/callback
```

Generate a public domain for this calendar service. Railway injects `PORT`; the calendar server listens on it. In Google Cloud, add the exact `GOOGLE_REDIRECT_URI` above under **Authorized redirect URIs**. Keep `SECRET_ID` only in Railway. After Google authorization settings are saved, redeploy the calendar service.

## Netlify

1. Import the same GitHub repository as a Netlify site. The committed `netlify.toml` selects the build command and `dist` publish directory.
2. Add this site environment variable in Netlify:

   ```text
   RAILWAY_API_ORIGIN=https://your-api-service.up.railway.app
   ```

   Use the Railway API service's public HTTPS origin only: no `/api` suffix and no trailing path. The build uses it to generate the `/api/*` proxy rule.
3. Trigger a fresh deploy after setting the variable. Do not set `VITE_API_URL` in Netlify; the frontend must keep its relative `/api` base so the proxy and PHP session cookies remain same-origin.
4. Set Railway's `FRONTEND_ORIGIN` to the exact deployed Netlify origin, for example `https://your-site.netlify.app`. This is used for credentialed API CORS responses and email verification links.

For Google Calendar (separate from Google sign-in), set this Netlify build variable to the public URL of the Railway calendar service, with no trailing slash:

```text
VITE_GOOGLE_CALENDAR_URL=https://your-calendar-service.up.railway.app
```

Trigger a new Netlify deploy after setting it. Do not set `VITE_GOOGLE_CALENDAR_URL` on Railway; it is embedded in the frontend during the Netlify build.

Google sign-in is configured at frontend build time. Add `VITE_GOOGLE_CLIENT_ID` to the Netlify site's environment variables using the Google OAuth web client ID, then redeploy the site. Setting this variable only on Railway has no effect on the Netlify-built frontend. In Google Cloud OAuth client settings, add the Netlify site origin to **Authorized JavaScript origins** and the appropriate callback/origin URLs required by the configured login flow.

The notification endpoints are served by the PHP API at `/api/notifications.php`. The frontend calls them through the same-origin Netlify `/api/*` proxy, so requests include the PHP session cookie. To check the connection, sign in on the deployed Netlify site, open the browser Network panel, and confirm requests to `/api/notifications.php` return successfully. A `401` response means the API was reached but the session is not authenticated; a CORS or proxy error usually means `RAILWAY_API_ORIGIN` or `FRONTEND_ORIGIN` is missing or incorrect.

Database credentials belong only in Railway service variables. Do not put them in Netlify variables or any `VITE_*` variable, because Vite variables are embedded in public frontend files.

For local XAMPP development, copy `.env.example` to `.env` and adjust `VITE_API_URL` if the project folder name or local server URL differs.