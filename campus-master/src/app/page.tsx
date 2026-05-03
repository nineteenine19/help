import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/tasks");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        校园“万事达”——互助与众包任务平台
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-700">
        面向校园高频、碎片化、强时效需求（代领快递、代买餐食、搬运重物等），提供任务发布、
        接单履约、状态机流转、资金托管与信用评价的闭环。
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/auth"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          登录/注册
        </Link>
        <Link href="/tasks" className="rounded-md border px-4 py-2 text-sm">
          浏览任务大厅
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-white p-4">
          <div className="text-sm font-medium">状态机</div>
          <p className="mt-2 text-sm text-zinc-700">
            待接单 → 进行中 → 待验收 → 已完成；任意阶段可进入争议中。
          </p>
        </div>
        <div className="rounded-md border bg-white p-4">
          <div className="text-sm font-medium">资金托管</div>
          <p className="mt-2 text-sm text-zinc-700">
            发布即冻结，完成后自动划拨；流水可追溯。
          </p>
        </div>
        <div className="rounded-md border bg-white p-4">
          <div className="text-sm font-medium">RBAC</div>
          <p className="mt-2 text-sm text-zinc-700">
            需求方 / 接单方 / 管理员三类角色，权限隔离。
          </p>
        </div>
      </div>
    </div>
  );
}
