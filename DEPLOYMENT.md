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

   Replace `MySQL` in the references with the actual Railway MySQL service name. Do not commit these values.
4. Import the schema from `sql/database/create_db.sql` into the Railway database. Apply any additional migrations required by the application.
5. Generate a public domain for the API service and note its origin, such as `https://your-api-service.up.railway.app`.
6. Add a Railway Volume mounted at `/var/www/html/api/uploads` if listing images and booking uploads must survive redeploys. The container prepares this directory for PHP writes at startup.

## Netlify

1. Import the same GitHub repository as a Netlify site. The committed `netlify.toml` selects the build command and `dist` publish directory.
2. Add this site environment variable in Netlify:

   ```text
   RAILWAY_API_ORIGIN=https://your-api-service.up.railway.app
   ```

   Use the Railway API service's public HTTPS origin only: no `/api` suffix and no trailing path. The build uses it to generate the `/api/*` proxy rule.
3. Trigger a fresh deploy after setting the variable. Do not set `VITE_API_URL` in Netlify; the frontend must keep its relative `/api` base so the proxy and PHP session cookies remain same-origin.
4. Set Railway's `FRONTEND_ORIGIN` to the exact deployed Netlify origin, for example `https://your-site.netlify.app`.

Database credentials belong only in Railway service variables. Do not put them in Netlify variables or any `VITE_*` variable, because Vite variables are embedded in public frontend files.

For local XAMPP development, copy `.env.example` to `.env` and adjust `VITE_API_URL` if the project folder name or local server URL differs.