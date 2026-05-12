import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { topUpAction } from "@/app/actions/taskActions";
import { updateRoleAction } from "@/app/actions/profileActions";

type TaskListItem = {
    id: string;
    title: string;
    status: string;
    reward_cents: number;
    created_at: string;
};

const roleLabels: Record<string, string> = {
    requester: "需求方（requester）",
    helper: "接单方（helper）",
    admin: "管理员（admin）",
};

export default async function DashboardPage() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth?next=/dashboard");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("display_name,role,credit_score")
        .eq("id", user.id)
        .maybeSingle();

    const { data: account } = await supabase
        .from("accounts")
        .select("available_cents,frozen_cents")
        .eq("user_id", user.id)
        .maybeSingle();

    const { data: myRequester } = await supabase
        .from("tasks")
        .select("id,title,status,reward_cents,created_at")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

    const { data: myHelper } = await supabase
        .from("tasks")
        .select("id,title,status,reward_cents,created_at")
        .eq("helper_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

    const requesterTasks = (myRequester ?? []) as TaskListItem[];
    const helperTasks = (myHelper ?? []) as TaskListItem[];

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
            <h1 className="text-2xl font-semibold">我的看板</h1>

            <section className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-md border bg-white p-4">
                    <div className="text-sm font-medium">账号</div>
                    <div className="mt-2 text-sm text-zinc-700">
                        <div>昵称：{profile?.display_name ?? "未设置"}</div>
                        <div className="flex items-center gap-2">
                            <span>
                                角色：{profile?.role ? roleLabels[profile.role] ?? profile.role : "未知"}
                            </span>
                        </div>
                        <div>信用分：{profile?.credit_score ?? 100}</div>
                    </div>

                    {profile?.role !== "admin" ? (
                        <>
                            <form action={updateRoleAction} className="mt-4 flex items-center gap-2">
                                <select
                                    name="role"
                                    defaultValue={profile?.role ?? "requester"}
                                    className="rounded-md border px-2 py-1 text-sm"
                                >
                                    <option value="requester">需求方（发布任务）</option>
                                    <option value="helper">接单方（接任务）</option>
                                </select>
                                <button className="rounded-md border px-3 py-1 text-sm">
                                    切换角色
                                </button>
                            </form>
                            <p className="mt-2 text-xs text-zinc-600">
                                说明：角色用于演示 RBAC，切换后会影响“发布/接单”等操作权限。
                            </p>
                        </>
                    ) : (
                        <p className="mt-4 text-xs text-zinc-600">
                            管理员账号不提供角色切换。
                        </p>
                    )}
                </div>

                <div className="rounded-md border bg-white p-4">
                    <div className="text-sm font-medium">余额</div>
                    <div className="mt-2 text-sm text-zinc-700">
                        <div>
                            可用：￥{((account?.available_cents ?? 0) / 100).toFixed(2)}
                        </div>
                        <div>
                            冻结：￥{((account?.frozen_cents ?? 0) / 100).toFixed(2)}
                        </div>
                    </div>

                    <form action={topUpAction} className="mt-4 flex gap-2">
                        <input
                            name="amountCents"
                            type="number"
                            min={1}
                            className="w-32 rounded-md border px-2 py-1 text-sm"
                            placeholder="充值(分)"
                            required
                        />
                        <button className="rounded-md bg-black px-3 py-1 text-sm text-white">
                            模拟充值
                        </button>
                    </form>
                    <p className="mt-2 text-xs text-zinc-600">
                        课程设计演示用：不对接真实支付，仅用于资金托管流程验证。
                    </p>
                </div>

                <div className="rounded-md border bg-white p-4">
                    <div className="text-sm font-medium">快捷入口</div>
                    <div className="mt-2 flex flex-col gap-2 text-sm">
                        <Link href="/tasks" className="underline">
                            去任务大厅
                        </Link>
                        <Link href="/tasks/new" className="underline">
                            发布任务
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-2">
                <div>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">我发布的任务</h2>
                        <Link href="/tasks" className="text-sm underline">
                            查看全部
                        </Link>
                    </div>
                    <ul className="mt-3 space-y-2">
                        {requesterTasks.map((t) => (
                            <li key={t.id} className="rounded-md border bg-white p-3">
                                <Link href={`/tasks/${t.id}`} className="font-medium">
                                    {t.title}
                                </Link>
                                <div className="mt-1 text-xs text-zinc-600">
                                    状态：{t.status}；报酬：￥{(t.reward_cents / 100).toFixed(2)}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">我接到的任务</h2>
                        <Link href="/tasks" className="text-sm underline">
                            查看全部
                        </Link>
                    </div>
                    <ul className="mt-3 space-y-2">
                        {helperTasks.map((t) => (
                            <li key={t.id} className="rounded-md border bg-white p-3">
                                <Link href={`/tasks/${t.id}`} className="font-medium">
                                    {t.title}
                                </Link>
                                <div className="mt-1 text-xs text-zinc-600">
                                    状态：{t.status}；报酬：￥{(t.reward_cents / 100).toFixed(2)}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}
