// Single source of truth for the backend API base URL.
// Set NEXT_PUBLIC_API_URL in .env.local for local dev (defaults to the local
// backend on :4000/api); production builds use a relative '/api' path so the
// same domain that serves the frontend also serves the backend, whatever
// that domain is.
const url = process.env.NEXT_PUBLIC_API_URL || '/api';

export default url;