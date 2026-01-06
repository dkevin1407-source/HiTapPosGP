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
- For production: `npm run build` then `npm run start` (the `server.js` serves the built `dist` folder)

See `TROUBLESHOOTING.md` for Hostinger deployment checks and database setup.
