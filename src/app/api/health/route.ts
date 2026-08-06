export const dynamic = "force-dynamic";

export async function GET() {
  // No DB required — works on Vercel free without DATABASE_URL
  try {
    // optional DB check, ignore if no DATABASE_URL
    if (process.env.DATABASE_URL) {
      const { db } = await import("@/db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`select 1`);
      return Response.json({ ok: true, db: "connected" });
    }
  } catch {}
  return Response.json({ ok: true });
}
