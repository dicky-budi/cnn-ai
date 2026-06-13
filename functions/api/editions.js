// GET /api/editions  ->  array of all edition dates, newest first
// Powers the date dropdown on the archive page.
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB
      .prepare("SELECT edition_date FROM editions ORDER BY edition_date DESC")
      .all();

    return new Response(JSON.stringify(results.map((r) => r.edition_date)), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "DB error: " + e.message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
