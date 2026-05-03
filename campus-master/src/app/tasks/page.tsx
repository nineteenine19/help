import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function labelStatus(s: string) {
    switch (s) {
        case "open":
            return "待接单";
        case "in_progress":
            return "进行中";
        case "awaiting_acceptance":
            return "待验收";
        case "completed":
            return "已完成";
        case "canceled":
            return "已取消";
        case "disputed":
            return "争议中";
        default:
            return s;
    }
}

export default async function TasksPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; category?: string }>;
}) {
    const sp = await searchParams;
    const status = sp.status || "";
    const category = sp.category || "";

    const supabase = await createSupabaseServerClient();

    let q = supabase
        .from("tasks")
        .select("id,title,category,reward_cents,status,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

    if (status) q = q.eq("status", status);
    if (category) q = q.ilike("category", `%${category}%`);

    const { data, error } = await q;

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">任务大厅</h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        全站任务池（最多展示 50 条）
                    </p>
                </div>
                <Link
                    href="/tasks/new"
                    className="rounded-md bg-black px-4 py-2 text-sm text-white"
                >
                    发布任务
                </Link>
            </div>

            <form className="mt-6 flex flex-wrap gap-3 rounded-md border bg-white p-3">
                <label className="text-sm">
                    状态
                    <select
                        name="status"
                        defaultValue={status}
                        className="ml-2 rounded-md border px-2 py-1"
                    >
                        <option value="">全部</option>
                        <option value="open">待接单</option>
                        <option value="in_progress">进行中</option>
                        <option value="awaiting_acceptance">待验收</option>
                        <option value="completed">已完成</option>
                        <option value="canceled">已取消</option>
                        <option value="disputed">争议中</option>
                    </select>
                </label>
                <label className="text-sm">
                    分类
                    <input
                        name="category"
                        defaultValue={category}
                        placeholder="如：快递/代买/搬运"
                        className="ml-2 rounded-md border px-2 py-1"
                    />
                </label>
                <button className="rounded-md border px-3 py-1 text-sm">筛选</button>
            </form>

            {error ? (
                <p className="mt-6 text-sm text-red-600">{error.message}</p>
            ) : null}

            <ul className="mt-6 space-y-3">
                {(data ?? []).map((t: any) => (
                    <li key={t.id} className="rounded-md border bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <Link href={`/tasks/${t.id}`} className="font-medium">
                                    {t.title}
                                </Link>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                                    <span>状态：{labelStatus(t.status)}</span>
                                    <span>报酬：￥{(t.reward_cents / 100).toFixed(2)}</span>
                                    {t.category ? <span>分类：{t.category}</span> : null}
                                </div>
                            </div>
                            <Link
                                href={`/tasks/${t.id}`}
                                className="shrink-0 text-sm underline"
                            >
                                查看
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
