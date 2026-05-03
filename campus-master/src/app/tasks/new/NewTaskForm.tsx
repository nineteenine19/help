"use client";

import Link from "next/link";
import React from "react";
import { useFormStatus } from "react-dom";
import {
    createTaskAction,
    type CreateTaskActionState,
} from "@/app/actions/taskActions";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            disabled={pending}
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
            {pending ? "提交中…" : "确认发布并冻结资金"}
        </button>
    );
}

const initialState: CreateTaskActionState = {
    formError: null,
    fieldErrors: {},
};

export default function NewTaskForm() {
    const [state, formAction] = React.useActionState(
        createTaskAction,
        initialState,
    );

    return (
        <form action={formAction} className="mt-6 space-y-4">
            {state.formError ? (
                <div className="rounded-md border bg-white p-3 text-sm text-red-600">
                    {state.formError}{" "}
                    {state.formError.includes("余额") ? (
                        <Link href="/dashboard" className="underline">
                            去看板充值
                        </Link>
                    ) : null}
                </div>
            ) : null}

            <label className="block">
                <div className="text-sm">标题</div>
                <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={80}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="如：代领快递（西门菜鸟驿站）"
                />
                {state.fieldErrors.title?.length ? (
                    <p className="mt-1 text-sm text-red-600">
                        {state.fieldErrors.title[0]}
                    </p>
                ) : null}
            </label>

            <label className="block">
                <div className="text-sm">描述</div>
                <textarea
                    name="description"
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={6}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="补充时间、地点、注意事项等"
                />
                {state.fieldErrors.description?.length ? (
                    <p className="mt-1 text-sm text-red-600">
                        {state.fieldErrors.description[0]}
                    </p>
                ) : null}
            </label>

            <label className="block">
                <div className="text-sm">分类（可选）</div>
                <input
                    name="category"
                    minLength={2}
                    maxLength={40}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="快递/代买/搬运"
                />
                {state.fieldErrors.category?.length ? (
                    <p className="mt-1 text-sm text-red-600">
                        {state.fieldErrors.category[0]}
                    </p>
                ) : null}
            </label>

            <label className="block">
                <div className="text-sm">报酬（分）</div>
                <input
                    name="rewardCents"
                    type="number"
                    min={1}
                    max={1000000}
                    required
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="例如 500 表示 5.00 元"
                />
                {state.fieldErrors.rewardCents?.length ? (
                    <p className="mt-1 text-sm text-red-600">
                        {state.fieldErrors.rewardCents[0]}
                    </p>
                ) : null}
            </label>

            <SubmitButton />
        </form>
    );
}
