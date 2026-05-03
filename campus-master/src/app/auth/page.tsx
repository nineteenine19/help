"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthPage() {
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);
    const params = useSearchParams();
    const router = useRouter();

    const mode = params.get("mode") || "login";
    const next = params.get("next") || "/tasks";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function logout() {
        setBusy(true);
        setError(null);
        const { error } = await supabase.auth.signOut();
        setBusy(false);
        if (error) {
            setError(error.message);
            return;
        }
        router.push("/");
    }

    async function login(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        setBusy(false);
        if (error) {
            setError(error.message);
            return;
        }
        router.push(next);
        router.refresh();
    }

    async function register(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName || null,
                },
            },
        });
        setBusy(false);
        if (error) {
            setError(error.message);
            return;
        }
        router.push(next);
        router.refresh();
    }

    if (mode === "logout") {
        return (
            <div className="mx-auto w-full max-w-md px-4 py-10">
                <h1 className="text-xl font-semibold">退出登录</h1>
                <p className="mt-2 text-sm text-zinc-600">确认退出当前账号。</p>
                {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
                <button
                    onClick={logout}
                    disabled={busy}
                    className="mt-4 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                    退出
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-md px-4 py-10">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">
                    {mode === "register" ? "注册" : "登录"}
                </h1>
                <a
                    href={mode === "register" ? "/auth" : "/auth?mode=register"}
                    className="text-sm underline"
                >
                    {mode === "register" ? "去登录" : "去注册"}
                </a>
            </div>

            <form
                onSubmit={mode === "register" ? register : login}
                className="mt-6 space-y-3"
            >
                {mode === "register" ? (
                    <label className="block">
                        <div className="text-sm">昵称（可选）</div>
                        <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                ) : null}

                <label className="block">
                    <div className="text-sm">邮箱</div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </label>

                <label className="block">
                    <div className="text-sm">密码</div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </label>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                    disabled={busy}
                    className="w-full rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                    {busy
                        ? "处理中..."
                        : mode === "register"
                            ? "注册并进入"
                            : "登录并进入"}
                </button>
            </form>

            <p className="mt-4 text-xs text-zinc-600">
                注：注册后如需邮件验证，请在 Supabase Auth 设置里关闭或完成验证配置。
            </p>
        </div>
    );
}
