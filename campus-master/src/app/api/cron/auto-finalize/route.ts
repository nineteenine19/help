import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") ?? "";

    const expected = process.env.CRON_SECRET ?? "";
    if (!expected || key !== expected) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("auto_finalize_tasks", {
        p_in_progress_timeout_minutes: 24 * 60,
        p_acceptance_timeout_minutes: 24 * 60,
    });

    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, result: data ?? null });
}
