"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReviewSchema } from "@/lib/validation";

export async function submitReviewAction(formData: FormData) {
    const parsed = ReviewSchema.safeParse({
        taskId: formData.get("taskId"),
        revieweeId: formData.get("revieweeId"),
        stars: formData.get("stars"),
        comment: formData.get("comment"),
    });

    if (!parsed.success) {
        throw new Error(parsed.error.message);
    }

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("task_reviews").insert({
        task_id: parsed.data.taskId,
        reviewer_id: user.id,
        reviewee_id: parsed.data.revieweeId,
        stars: parsed.data.stars,
        comment: parsed.data.comment || null,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/tasks/${parsed.data.taskId}`);
    revalidatePath("/dashboard");
}
