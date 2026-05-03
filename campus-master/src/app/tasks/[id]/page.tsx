import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    acceptTaskAction,
    cancelTaskAction,
    confirmCompletionAction,
    openDisputeAction,
    submitEvidenceAction,
} from "@/app/actions/taskActions";
import { submitReviewAction } from "@/app/actions/reviewActions";
import EvidenceUploader from "@/components/EvidenceUploader";
import TaskChat from "@/components/TaskChat";

type ProfileRole = {
    role: string;
};

type MessageRow = {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
};

type ReviewRow = {
    reviewer_id: string;
    reviewee_id: string;
    stars: number;
    comment: string | null;
    created_at: string;
};

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

export default async function TaskDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: myProfile } = user
        ? await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null as ProfileRole | null };

    const { data: task, error } = await supabase
        .from("tasks")
        .select(
            "id,requester_id,helper_id,title,description,category,reward_cents,status,evidence_text,evidence_image_paths,created_at",
        )
        .eq("id", id)
        .maybeSingle();

    const { data: aiAudit } = await supabase
        .from("ai_audits")
        .select("risk_level,reason,updated_at")
        .eq("task_id", id)
        .maybeSingle();

    if (error) {
        return (
            <div className="mx-auto w-full max-w-3xl px-4 py-8">
                <p className="text-sm text-red-600">{error.message}</p>
                <Link href="/tasks" className="mt-4 inline-block underline">
                    返回任务大厅
                </Link>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="mx-auto w-full max-w-3xl px-4 py-8">
                <p className="text-sm">任务不存在</p>
                <Link href="/tasks" className="mt-4 inline-block underline">
                    返回任务大厅
                </Link>
            </div>
        );
    }

    const isRequester = user?.id === task.requester_id;
    const isHelper = user?.id === task.helper_id;

    const myRole = (myProfile?.role as string | undefined) ?? null;
    const canAccept =
        task.status === "open" &&
        Boolean(user) &&
        !isRequester &&
        (myRole === "helper" || myRole === "admin");

    const canChat = Boolean(user && task.helper_id && (isRequester || isHelper));

    let conversationId: string | null = null;
    let initialMessages: MessageRow[] = [];

    if (canChat) {
        const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("task_id", id)
            .maybeSingle();

        if (existingConv?.id) {
            conversationId = existingConv.id as string;
        } else {
            const { data: upsertedConv } = await supabase
                .from("conversations")
                .upsert({ task_id: id }, { onConflict: "task_id" })
                .select("id")
                .single();
            conversationId = (upsertedConv?.id as string) ?? null;
        }

        if (conversationId) {
            const { data: msgs } = await supabase
                .from("messages")
                .select("id,sender_id,body,created_at")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true })
                .limit(50);

            if (Array.isArray(msgs)) {
                initialMessages = msgs as MessageRow[];
            }
        }
    }

    const evidenceImagePaths: string[] = Array.isArray(task.evidence_image_paths)
        ? (task.evidence_image_paths as string[])
        : [];

    const signedEvidenceUrls = await Promise.all(
        evidenceImagePaths.map(async (p) => {
            const { data } = await supabase.storage
                .from("task-evidence")
                .createSignedUrl(p, 60 * 60);
            return data?.signedUrl ?? null;
        }),
    );

    const { data: reviews } = await supabase
        .from("task_reviews")
        .select("reviewer_id,reviewee_id,stars,comment,created_at")
        .eq("task_id", id)
        .order("created_at", { ascending: false });
    const reviewRows = (reviews ?? []) as ReviewRow[];

    const hasReviewed = Boolean(
        user?.id && reviewRows.some((r) => r.reviewer_id === user.id),
    );

    const myRevieweeId = isRequester
        ? task.helper_id
        : isHelper
            ? task.requester_id
            : null;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold">{task.title}</h1>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-700">
                        <span>状态：{labelStatus(task.status)}</span>
                        <span>报酬：￥{(task.reward_cents / 100).toFixed(2)}</span>
                        {task.category ? <span>分类：{task.category}</span> : null}
                    </div>
                </div>
                <Link href="/tasks" className="shrink-0 text-sm underline">
                    返回
                </Link>
            </div>

            <section className="mt-6 rounded-md border bg-white p-4">
                <div className="text-sm font-medium">任务描述</div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {task.description}
                </p>
            </section>

            {aiAudit ? (
                <section className="mt-4 rounded-md border bg-white p-4">
                    <div className="text-sm font-medium">AI 审核（辅助）</div>
                    <div className="mt-2 text-sm text-zinc-700">
                        <div>风险级别：{aiAudit.risk_level}</div>
                        <div className="mt-1 whitespace-pre-wrap">
                            {aiAudit.reason ?? "（无说明）"}
                        </div>
                    </div>
                </section>
            ) : null}

            {task.evidence_text ? (
                <section className="mt-4 rounded-md border bg-white p-4">
                    <div className="text-sm font-medium">完成凭证</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                        {task.evidence_text}
                    </p>
                </section>
            ) : null}

            {signedEvidenceUrls.filter(Boolean).length ? (
                <section className="mt-4 rounded-md border bg-white p-4">
                    <div className="text-sm font-medium">凭证图片</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {signedEvidenceUrls.map((url, idx) =>
                            url ? (
                                <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element -- Supabase signed URLs are short-lived and should render directly. */}
                                    <img
                                        src={url}
                                        alt={`evidence-${idx + 1}`}
                                        className="h-32 w-full rounded-md border object-cover"
                                    />
                                </a>
                            ) : null,
                        )}
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">
                        图片为签名链接（有效期约 1 小时）。
                    </p>
                </section>
            ) : null}

            <section className="mt-6 rounded-md border bg-white p-4">
                <div className="text-sm font-medium">可执行操作</div>

                {task.status !== "completed" && task.status !== "canceled" && user && (isRequester || isHelper) ? (
                    <form action={cancelTaskAction} className="mt-3 space-y-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <label className="block text-sm">
                            <div>取消任务（将退款并记录取消方）</div>
                            <input
                                name="reason"
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="可选：填写取消原因"
                            />
                        </label>
                        <button className="rounded-md border px-4 py-2 text-sm">
                            取消任务
                        </button>
                        <p className="text-xs text-zinc-600">
                            接单后取消可能会触发违约扣分；超时也会由系统自动判定。
                        </p>
                    </form>
                ) : null}

                {canAccept ? (
                    <form action={acceptTaskAction} className="mt-3">
                        <input type="hidden" name="taskId" value={task.id} />
                        <button className="rounded-md bg-black px-4 py-2 text-sm text-white">
                            接单（进入进行中）
                        </button>
                    </form>
                ) : null}

                {task.status === "open" && user && !isRequester && !canAccept ? (
                    <p className="mt-3 text-sm text-zinc-600">
                        当前角色不是“接单方”，无法接单。可到{" "}
                        <Link href="/dashboard" className="underline">
                            我的看板
                        </Link>
                        {" "}切换角色为“接单方（helper）”。
                    </p>
                ) : null}

                {task.status === "in_progress" && isHelper ? (
                    <form action={submitEvidenceAction} className="mt-3 space-y-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <label className="block text-sm">
                            <div>凭证说明</div>
                            <textarea
                                name="evidenceText"
                                required
                                rows={4}
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="例如：已代领并送达宿舍楼下"
                            />
                        </label>

                        <div className="rounded-md border p-3">
                            <div className="text-sm font-medium">上传图片（可选）</div>
                            <div className="mt-2">
                                <EvidenceUploader taskId={task.id} />
                            </div>
                        </div>

                        <button className="rounded-md bg-black px-4 py-2 text-sm text-white">
                            提交凭证（进入待验收）
                        </button>
                    </form>
                ) : null}

                {task.status === "awaiting_acceptance" && isRequester ? (
                    <form action={confirmCompletionAction} className="mt-3">
                        <input type="hidden" name="taskId" value={task.id} />
                        <button className="rounded-md bg-black px-4 py-2 text-sm text-white">
                            确认完成并支付
                        </button>
                    </form>
                ) : null}

                {task.status !== "completed" && task.status !== "canceled" ? (
                    <form action={openDisputeAction} className="mt-4 space-y-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <label className="block text-sm">
                            <div>发起争议（任意一方可用）</div>
                            <input
                                name="reason"
                                required
                                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="简述争议原因"
                            />
                        </label>
                        <button className="rounded-md border px-4 py-2 text-sm">
                            进入争议中
                        </button>
                    </form>
                ) : null}

                <p className="mt-4 text-xs text-zinc-600">
                    任务状态流转：待接单 → 进行中 → 待验收 → 已完成；任意阶段可进入争议中。
                </p>
            </section>

            {canChat && conversationId && user ? (
                <TaskChat
                    taskId={task.id}
                    conversationId={conversationId}
                    currentUserId={user.id}
                    initialMessages={initialMessages}
                />
            ) : null}

            {task.status === "completed" && user && (isRequester || isHelper) ? (
                <section className="mt-6 rounded-md border bg-white p-4">
                    <div className="text-sm font-medium">评价与信用</div>
                    <p className="mt-2 text-sm text-zinc-700">
                        任务完成后，双方可进行一次互评；信用分会依据评分动态调整。
                    </p>

                    {!hasReviewed && myRevieweeId ? (
                        <form action={submitReviewAction} className="mt-4 space-y-2">
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="revieweeId" value={myRevieweeId} />

                            <label className="block text-sm">
                                <div>星级</div>
                                <select
                                    name="stars"
                                    defaultValue={5}
                                    className="mt-1 rounded-md border px-2 py-1"
                                >
                                    <option value={5}>5 - 非常满意</option>
                                    <option value={4}>4 - 满意</option>
                                    <option value={3}>3 - 一般</option>
                                    <option value={2}>2 - 不满意</option>
                                    <option value={1}>1 - 很差</option>
                                </select>
                            </label>

                            <label className="block text-sm">
                                <div>评语（可选）</div>
                                <input
                                    name="comment"
                                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                                    placeholder="简要描述体验"
                                />
                            </label>

                            <button className="rounded-md bg-black px-4 py-2 text-sm text-white">
                                提交评价
                            </button>
                        </form>
                    ) : (
                        <p className="mt-4 text-sm text-zinc-700">你已提交评价。</p>
                    )}

                    {reviewRows.length ? (
                        <div className="mt-6">
                            <div className="text-sm font-medium">已提交的评价</div>
                            <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                                {reviewRows.map((r, idx) => (
                                    <li key={idx} className="rounded-md border p-3">
                                        <div>星级：{r.stars}</div>
                                        {r.comment ? <div>评语：{r.comment}</div> : null}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </section>
            ) : null}
        </div>
    );
}
