// Single source of truth for the backend API base URL.
// Set NEXT_PUBLIC_API_URL in .env.local for local dev (defaults to the local
// backend on :4000); production deploys should set it to the real API host,
// falling back to the production API if it's never configured.
const url = process.env.NEXT_PUBLIC_API_URL || 'https://api.abbas.uz';

export default url;