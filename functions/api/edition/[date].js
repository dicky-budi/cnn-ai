// GET /api/edition/2026-06-13  ->  that specific edition's JSON
// The [date] filename makes this a dynamic route; params.date is the URL piece.
export async function onRequestGet(context) {
  const { env, params } = context;
  try {
    const row = await env.DB
      .prepare("SELECT data FROM editions WHERE edition_date = ?")
      .bind(params.date) // bound param -> safe from SQL injection
      .first();

    if (!row) {
      return new Response(JSON.stringify({ error: "Edition not found: " + params.date }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    return new Response(row.data, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=86400", // archived days never change -> cache 1 day
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "DB error: " + e.message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
