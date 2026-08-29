import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const MATCH_THRESHOLD = 0.6;

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { descriptor } = req.body;

  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return res.status(400).json({ message: 'descriptor massivi kerak' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, face_descriptor FROM xodim WHERE face_descriptor IS NOT NULL`
    );

    let best = null;
    let bestDistance = Infinity;

    for (const row of result.rows) {
      const stored = row.face_descriptor;
      if (!Array.isArray(stored) || stored.length !== descriptor.length) continue;

      const distance = euclideanDistance(descriptor, stored);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = row;
      }
    }

    if (!best || bestDistance >= MATCH_THRESHOLD) {
      return res.status(200).json({ match: null });
    }

    const openRecord = await pool.query(
      `SELECT * FROM xodim_one_day
       WHERE xodim_id = $1 AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [best.id]
    );
    const todayRecord = openRecord.rows[0] || null;

    return res.status(200).json({
      match: { id: best.id, name: best.name },
      distance: bestDistance,
      todayStatus: {
        state: !todayRecord ? 'none' : (todayRecord.end_time ? 'done' : 'open'),
        startTime: todayRecord?.start_time || null,
        endTime: todayRecord?.end_time || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);
