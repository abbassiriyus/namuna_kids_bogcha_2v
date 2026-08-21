export default async function handler(req, res) {
  const target = req.query.target;
  if (!target) {
    return res.status(400).json({ error: 'target query parameter is required' });
  }

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = `${base.replace(/\/$/, '')}${target}`;

  const headers = {};
  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const apiRes = await fetch(url, fetchOptions);
    const contentType = apiRes.headers.get('content-type') || '';

    const body = contentType.includes('application/json')
      ? await apiRes.json()
      : await apiRes.text();

    res.status(apiRes.status);
    if (contentType) res.setHeader('content-type', contentType);
    res.send(body);
  } catch (err) {
    console.error('Proxy error when fetching', url, err && err.message);
    res.status(502).json({ error: 'proxy_error', message: err.message, url });
  }
}
