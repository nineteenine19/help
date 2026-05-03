"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NotificationRow = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    reference_id: string | null;
    created_at: string;
    is_read: boolean;
};

export default function RealtimeNotifications() {
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);
    const [items, setItems] = useState<NotificationRow[]>([]);

    useEffect(() => {
        let cancelled = false;
        let channel: any = null;

        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (cancelled || !user) return;

            const { data } = await supabase
                .from("notifications")
                .select("id,type,title,body,reference_id,created_at,is_read")
                .order("created_at", { ascending: false })
                .limit(5);

            if (!cancelled && data) setItems(data as NotificationRow[]);

            channel = supabase
                .channel(`notifications-changes-${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const n = payload.new as any;
                        setItems((prev) =>
                            [{
                                id: n.id,
                                type: n.type,
                                title: n.title,
                                body: n.body,
                                reference_id: n.reference_id,
                                created_at: n.created_at,
                                is_read: n.is_read,
                            }, ...prev].slice(0, 5),
                        );
                    },
                )
                .subscribe();
        })();

        return () => {
            cancelled = true;
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [supabase]);

    if (items.length === 0) return null;

    return (
        <section className="mx-auto w-full max-w-5xl px-4 py-3">
            <div className="rounded-md border bg-white p-3">
                <div className="text-sm font-medium">最新通知</div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                    {items.map((n) => (
                        <li key={n.id} className="truncate">
                            {n.reference_id ? (
                                <Link
                                    href={`/tasks/${n.reference_id}${n.type === "message" ? "#chat" : ""}`}
                                    className="hover:underline"
                                >
                                    <span className="font-medium">{n.title}</span>
                                    {n.body ? (
                                        <span className="text-zinc-600">：{n.body}</span>
                                    ) : null}
                                </Link>
                            ) : (
                                <>
                                    <span className="font-medium">{n.title}</span>
                                    {n.body ? (
                                        <span className="text-zinc-600">：{n.body}</span>
                                    ) : null}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
