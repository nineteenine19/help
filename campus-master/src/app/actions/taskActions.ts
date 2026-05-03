"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    CancelTaskSchema,
    CreateTaskSchema,
    DisputeSchema,
    EvidenceSchema,
    TopUpSchema,
} from "@/lib/validation";
import { reviewTaskTextWithAI } from "@/lib/ai/reviewTask";

export type CreateTaskActionState = {
    formError: string | null;
    fieldErrors: Partial<
        Record<"title" | "description" | "category" | "rewardCents", string[]>
    >;
};

export async function topUpAction(formData: FormData) {
    const parsed = TopUpSchema.safeParse({
        amountCents: formData.get("amountCents"),
    });
    if (!parsed.success) {
        throw new Error(parsed.error.message);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("top_up", {
        p_amount_cents: parsed.data.amountCents,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
}

export async function createTaskAction(
    _prevState: CreateTaskActionState,
    formData: FormData,
): Promise<CreateTaskActionState> {
    const parsed = CreateTaskSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
        rewardCents: formData.get("rewardCents"),
    });

    if (!parsed.success) {
        const flattened = parsed.error.flatten();
        return {
            formError: "请检查表单输入",
            fieldErrors: flattened.fieldErrors as any,
        };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_task", {
        p_title: parsed.data.title,
        p_description: parsed.data.description,
        p_category: parsed.data.category ?? "",
        p_reward_cents: parsed.data.rewardCents,
    });

    if (error) {
        const msg = String((error as any).message || "创建失败");
        const details = String((error as any).details || "");
        const hint = String((error as any).hint || "");
        const code = String((error as any).code || "");

        if (msg.toLowerCase().includes("insufficient balance")) {
            return { formError: "余额不足，无法发布该报酬的任务。", fieldErrors: {} };
        }

        const extra = [
            details ? `details: ${details}` : "",
            hint ? `hint: ${hint}` : "",
            code ? `code: ${code}` : "",
        ]
            .filter(Boolean)
            .join("\n");

        return {
            formError: extra ? `${msg}\n${extra}` : msg,
            fieldErrors: {},
        };
    }

    if (!data) {
        return { formError: "创建失败，请稍后再试", fieldErrors: {} };
    }

    // Best-effort AI audit (optional). Failure should not block task creation.
    try {
        const result = await reviewTaskTextWithAI({
            title: parsed.data.title,
            description: parsed.data.description,
        });

        await supabase
            .from("ai_audits")
            .update({
                risk_level: result.riskLevel,
                reason: result.reason,
                raw: result.raw ?? null,
            })
            .eq("task_id", data);
    } catch {
        // ignore
    }

    redirect(`/tasks/${data}`);
}

export async function acceptTaskAction(formData: FormData) {
    const taskId = String(formData.get("taskId") || "");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc("accept_task", { p_task_id: taskId });
    if (error) throw new Error(error.message);

    revalidatePath(`/tasks/${taskId}`);
}

export async function submitEvidenceAction(formData: FormData) {
    const taskId = String(formData.get("taskId") || "");
    const imagePaths = formData
        .getAll("imagePath")
        .map((x) => String(x))
        .filter(Boolean);
    const parsed = EvidenceSchema.safeParse({
        evidenceText: formData.get("evidenceText"),
        imagePaths,
    });
    if (!parsed.success) {
        throw new Error(parsed.error.message);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("submit_evidence", {
        p_task_id: taskId,
        p_evidence_text: parsed.data.evidenceText,
        p_evidence_image_paths: parsed.data.imagePaths ?? [],
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/tasks/${taskId}`);
}

export async function confirmCompletionAction(formData: FormData) {
    const taskId = String(formData.get("taskId") || "");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("confirm_completion", {
        p_task_id: taskId,
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/tasks/${taskId}`);
    revalidatePath("/dashboard");
}

export async function openDisputeAction(formData: FormData) {
    const taskId = String(formData.get("taskId") || "");
    const parsed = DisputeSchema.safeParse({ reason: formData.get("reason") });
    if (!parsed.success) {
        throw new Error(parsed.error.message);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("open_dispute", {
        p_task_id: taskId,
        p_reason: parsed.data.reason,
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/tasks/${taskId}`);
    revalidatePath("/admin");
}

export async function cancelTaskAction(formData: FormData) {
    const parsed = CancelTaskSchema.safeParse({
        taskId: formData.get("taskId"),
        reason: formData.get("reason"),
    });
    if (!parsed.success) {
        throw new Error(parsed.error.message);
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("cancel_task", {
        p_task_id: parsed.data.taskId,
        p_reason: parsed.data.reason ?? "",
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/tasks/${parsed.data.taskId}`);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
}

export async function adminResolveDisputeAction(formData: FormData) {
    const taskId = String(formData.get("taskId") || "");
    const resolution = String(formData.get("resolution") || "");
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.rpc("resolve_dispute", {
        p_task_id: taskId,
        p_resolution: resolution,
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/tasks/${taskId}`);
    revalidatePath("/admin");
    revalidatePath("/dashboard");
}
