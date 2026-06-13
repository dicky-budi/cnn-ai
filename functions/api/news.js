// GET /api/news  ->  the most recent edition's JSON (this is what the homepage loads)
// Runs on Cloudflare's edge. `context.env.DB` is the D1 binding named "DB".
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const row = await env.DB
      .prepare("SELECT data FROM editions ORDER BY edition_date DESC LIMIT 1")
      .first();

    if (!row) {
      return json({ error: "No editions yet. Run the daily task once to seed the database." }, 404);
    }
    // `data` is already a JSON string — return it verbatim.
    return new Response(row.data, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300", // cache 5 min at the edge
      },
    });
  } catch (e) {
    return json({ error: "DB error: " + e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
