import NewTaskForm from "./NewTaskForm";

export default function NewTaskPage() {
    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
            <h1 className="text-2xl font-semibold">发布任务</h1>
            <p className="mt-1 text-sm text-zinc-600">
                发布时会冻结对应金额（单位：分），任务完成后自动划拨。
            </p>

            <NewTaskForm />
        </div>
    );
}
