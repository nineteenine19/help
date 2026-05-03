import Link from "next/link";

export default function NavBar({
    isAuthed,
    isAdmin,
}: {
    isAuthed: boolean;
    isAdmin: boolean;
}) {
    return (
        <header className="border-b bg-white">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
                <Link href="/" className="font-semibold">
                    校园“万事达”
                </Link>
                <nav className="flex items-center gap-4 text-sm">
                    {isAuthed ? (
                        <>
                            <Link href="/tasks" className="hover:underline">
                                任务大厅
                            </Link>
                            <Link href="/tasks/new" className="hover:underline">
                                发布任务
                            </Link>
                            <Link href="/dashboard" className="hover:underline">
                                我的看板
                            </Link>
                            {isAdmin ? (
                                <Link href="/admin" className="hover:underline">
                                    管理员
                                </Link>
                            ) : null}
                            <Link href="/auth?mode=logout" className="hover:underline">
                                退出
                            </Link>
                        </>
                    ) : (
                        <Link href="/auth" className="hover:underline">
                            登录/注册
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
