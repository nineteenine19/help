"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_FILES = 3;
const MAX_MB = 5;

function sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export default function EvidenceUploader({
    taskId,
    disabled,
}: {
    taskId: string;
    disabled?: boolean;
}) {
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paths, setPaths] = useState<string[]>([]);

    async function onPickFiles(files: FileList | null) {
        if (!files || files.length === 0) return;

        setError(null);

        const picked = Array.from(files).slice(0, MAX_FILES);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setError("未登录，无法上传。");
            return;
        }

        setBusy(true);
        try {
            const newPaths: string[] = [];

            for (const file of picked) {
                if (!file.type.startsWith("image/")) {
                    throw new Error("仅支持图片文件。");
                }

                if (file.size > MAX_MB * 1024 * 1024) {
                    throw new Error(`图片大小不能超过 ${MAX_MB}MB。`);
                }

                const ext = file.name.includes(".")
                    ? file.name.split(".").pop()
                    : "png";
                const safeName = sanitizeFilename(file.name);
                const objectPath = `${taskId}/${user.id}/${Date.now()}-${safeName}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from("task-evidence")
                    .upload(objectPath, file, {
                        upsert: false,
                        contentType: file.type,
                    });

                if (uploadError) throw uploadError;
                newPaths.push(objectPath);
            }

            setPaths((prev) => [...prev, ...newPaths].slice(0, MAX_FILES));
        } catch (e: any) {
            setError(e?.message ?? "上传失败");
        } finally {
            setBusy(false);
        }
    }

    function removePath(p: string) {
        setPaths((prev) => prev.filter((x) => x !== p));
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={busy || disabled || paths.length >= MAX_FILES}
                    onChange={(e) => void onPickFiles(e.target.files)}
                />
                <div className="text-xs text-zinc-600">
                    最多 {MAX_FILES} 张，每张 ≤ {MAX_MB}MB
                </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            {paths.length ? (
                <ul className="space-y-1 text-sm text-zinc-700">
                    {paths.map((p) => (
                        <li key={p} className="flex items-center justify-between gap-2">
                            <span className="truncate">{p}</span>
                            <button
                                type="button"
                                className="shrink-0 text-xs underline"
                                onClick={() => removePath(p)}
                                disabled={busy || disabled}
                            >
                                移除
                            </button>
                            <input type="hidden" name="imagePath" value={p} />
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-zinc-600">未上传图片（可只提交文字凭证）。</p>
            )}

            {busy ? <p className="text-xs text-zinc-600">上传中...</p> : null}
        </div>
    );
}
