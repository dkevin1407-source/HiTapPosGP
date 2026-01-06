#!/usr/bin/env node

// Deploy-time API health check for builds
// Exits with non-zero code if /api/health is not reachable or doesn't return JSON

const BASE = process.env.VITE_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3000';
const url = `${BASE.replace(/\/$/, '')}/api/health`;
const TIMEOUT = 7000;

(async function run() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    const snippet = text.replace(/\s+/g, ' ').slice(0, 400);

    if (!contentType.includes('application/json')) {
      console.error(`Health check failed: Expected JSON at ${url} but received content-type: ${contentType || 'none'}`);
      console.error(`Response snippet: ${snippet}`);
      console.error('Hint: set VITE_API_BASE_URL in your build environment to point to your running API.');
      process.exit(1);
    }

    let data;
    try { data = JSON.parse(text); } catch (e) {
      console.error(`Health check failed: Invalid JSON from ${url}: ${snippet}`);
      process.exit(1);
    }

    if (!(data && (data.status === 'OK' || res.status === 200))) {
      console.error(`Health check failed: Unhealthy response from ${url}: ${snippet}`);
      process.exit(1);
    }

    console.log(`Health check passed: ${url}`);
    process.exit(0);
  } catch (err) {
    console.error(`Health check failed to reach ${url}: ${(err && err.message) || err}`);
    console.error('Ensure the backend is running and VITE_API_BASE_URL is set correctly in the build environment.');
    process.exit(1);
  }
})();
