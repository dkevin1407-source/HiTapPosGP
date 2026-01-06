<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1R9Shmqf-Xsk7oOE35mggD3tE74f8V-Y2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Start the backend server (the API runs on port 3000 by default):
   `npm run start`
   (Alternatively, set `VITE_API_BASE_URL` in an `.env` file to point to your API server.)
3. Run the frontend in dev mode in a separate terminal:
   `npm run dev`

Notes:
- Vite is configured to proxy `/api` to `http://localhost:3000` during development. If you prefer to use an explicit base URL set `VITE_API_BASE_URL=http://localhost:3000` in an `.env` file.
- To run both backend and frontend together in dev mode:
  - `npm run dev:all` (starts backend with `nodemon` and frontend with `vite` using `concurrently`)
- For production: `npm run build` then `npm run start` (the `server.js` serves the built `dist` folder)

If you see an error like `Expected JSON but received: <!DOCTYPE html...` after deployment, it means the frontend received HTML when it expected JSON. Common causes and checks:

- Make sure the Node backend is running on your server and is reachable at the expected URL.
- Verify `VITE_API_BASE_URL` is set correctly in environment variables for your frontend **build** (or leave it blank if API is served from same domain and a Node server handles `/api/*`).
- Use these endpoints to diagnose on the server:
  - `/api/health` — should return JSON ({ status: 'OK' })
  - `/api/check-setup` — shows DB table statuses
- If those endpoints return HTML, the server may not be running or the requests are hitting static hosting instead of your Node process.

Build-time safety: this repo now runs a small health check before building. Set `VITE_API_BASE_URL` in your Hostinger build environment to point to your API (for example `https://api.example.com`); otherwise the prebuild will attempt `http://localhost:3000` and fail the build if the API is unreachable. This prevents publishing a frontend that cannot reach the API.

Hostinger: setting `VITE_API_BASE_URL` and redeploy

1. Decide which URL the frontend should call at runtime:
   - If your backend runs on the same domain and will handle `/api/*`, you can leave `VITE_API_BASE_URL` blank and ensure the Node process is running and listening for `/api` routes.
   - If your API runs on a separate domain (or you want explicit base URLs), set `VITE_API_BASE_URL` to the API origin, e.g. `https://api.example.com`.

2. Where to set the variable on Hostinger (two common flows):
   - Node.js App (server + API deployed as a Node app): In hPanel → Hosting → Manage → Node.js (or Application) section, add an environment variable `VITE_API_BASE_URL` with your API origin, then restart the app.
   - Static site build (build performed by Hostinger during deployment): In hPanel → Hosting → Manage → Deployments (or Build & Deploy), locate the **Environment variables** / **Build environment** section and add `VITE_API_BASE_URL=https://api.example.com` there. Then trigger a new deployment/build.

3. Quick validation after deployment:
   - Visit `https://your-site.com/api/health` (or the API origin's `/api/health`) — you should see a JSON response like `{ "status": "OK" }`.
   - If the endpoint returns HTML, your requests are hitting a static host page (check process status and routing).

4. Useful commands you can run on your Hostinger server shell (or locally with environment set):
   - `npm run check-api` — runs the same check used during prebuild and prints a clear diagnostic.
   - `curl -i https://your-site.com/api/health` — inspect status and response body.

If you want, I can draft the exact environment variable values for your Hostinger instance (`https://cornflowerblue-lapwing-659938.hostingersite.com`) and show the exact curl outputs to expect. See `TROUBLESHOOTING.md` for more Hostinger steps.
