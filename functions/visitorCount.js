import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // يستخدم تلقائيًا NETLIFY_DATABASE_URL

  try {
    // تأكد من وجود جدول الزوار
    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        visitor_ip TEXT,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // استخراج IP الزائر (من الهيدر)
    const visitorIp =
      event.headers['x-forwarded-for']?.split(',')[0] ||
      event.headers['client-ip'] ||
      'unknown';

    // هل زار اليوم قبل؟
    const [visitCount] = await sql`
      SELECT COUNT(*) AS count
      FROM visits
      WHERE visitor_ip = ${visitorIp} AND visited_at::date = CURRENT_DATE
    `;

    if (visitCount.count === '0') {
      // سجل زيارة جديدة
      await sql`
        INSERT INTO visits (visitor_ip) VALUES (${visitorIp})
      `;
    }

    // عدد الزوار الفريدين الكلي
    const [uniqueCount] = await sql`
      SELECT COUNT(DISTINCT visitor_ip) AS total FROM visits
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ uniqueVisitors: parseInt(uniqueCount.total, 10) }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
