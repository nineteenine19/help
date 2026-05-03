export type AiRiskLevel =
    | "pending"
    | "low"
    | "medium"
    | "high"
    | "skipped"
    | "error";

export type AiAuditResult = {
    riskLevel: AiRiskLevel;
    reason: string;
    raw?: unknown;
};

function safeJsonParse(text: string): unknown | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function readPath(value: unknown, path: Array<string | number>): unknown {
    let current = value;
    for (const key of path) {
        if (typeof key === "number") {
            if (!Array.isArray(current)) return undefined;
            current = current[key];
            continue;
        }

        if (!isRecord(current)) return undefined;
        current = current[key];
    }
    return current;
}

function toAiResult(value: unknown): Pick<AiAuditResult, "riskLevel" | "reason"> | null {
    if (!isRecord(value)) return null;

    const riskLevel = value.riskLevel;
    const reason = value.reason;
    if (
        (riskLevel === "low" || riskLevel === "medium" || riskLevel === "high") &&
        typeof reason === "string"
    ) {
        return { riskLevel, reason };
    }

    return null;
}

export async function reviewTaskTextWithAI(input: {
    title: string;
    description: string;
}): Promise<AiAuditResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return {
            riskLevel: "skipped",
            reason: "未配置 OPENAI_API_KEY，已跳过 AI 审核。",
        };
    }

    const system =
        "你是校园众包任务平台的合规审核助手。只输出严格 JSON，不要输出其它文字。";
    const prompt = {
        title: input.title,
        description: input.description,
        output_format: {
            riskLevel: "low | medium | high",
            reason: "string",
        },
        rules: [
            "重点识别：考试作弊/代考、有偿违规、暴力/伤害、自残、违法交易、涉黄、隐私泄露、诈骗。",
            "如果不确定但存在较大风险，给 medium 并说明疑点。",
            "reason 用中文，尽量具体但不要编造事实。",
        ],
    };

    // Try Responses API first; fallback to Chat Completions.
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };

    const responsesBody = {
        model: "gpt-4o-mini",
        input: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(prompt) },
        ],
    };

    try {
        const r = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers,
            body: JSON.stringify(responsesBody),
        });

        if (r.ok) {
            const json: unknown = await r.json();
            const text =
                readPath(json, ["output", 0, "content", 0, "text"]) ??
                readPath(json, ["output_text"]) ??
                readPath(json, ["output", "text"]);

            const parsed = typeof text === "string" ? safeJsonParse(text) : null;
            const result = toAiResult(parsed);
            if (result) {
                return {
                    riskLevel: result.riskLevel,
                    reason: result.reason,
                    raw: json,
                };
            }

            return {
                riskLevel: "error",
                reason: "AI 返回格式无法解析（Responses API）。",
                raw: json,
            };
        }
    } catch {
        // fallthrough
    }

    try {
        const chatBody = {
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: system },
                { role: "user", content: JSON.stringify(prompt) },
            ],
            temperature: 0,
        };

        const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers,
            body: JSON.stringify(chatBody),
        });

        const json: unknown = await r.json();
        const text = readPath(json, ["choices", 0, "message", "content"]);
        const parsed = typeof text === "string" ? safeJsonParse(text) : null;
        const result = toAiResult(parsed);

        if (r.ok && result) {
            return {
                riskLevel: result.riskLevel,
                reason: result.reason,
                raw: json,
            };
        }

        return {
            riskLevel: "error",
            reason: "AI 返回格式无法解析（Chat Completions）。",
            raw: json,
        };
    } catch (e: unknown) {
        return {
            riskLevel: "error",
            reason: `AI 请求失败：${e instanceof Error ? e.message : "unknown"}`,
        };
    }
}
