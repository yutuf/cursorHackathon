import { Agent, CursorAgentError, type AgentOptions } from "@cursor/sdk";

export type BriefAgentResult = {
  brief: string;
  source: "cursor-sdk-local" | "cursor-sdk-cloud" | "template";
  runId?: string;
  agentId?: string;
};

function getSdkOptions(apiKey: string): AgentOptions {
  const model = { id: "composer-2.5" };
  const onVercel = Boolean(process.env.VERCEL);

  if (onVercel) {
    return {
      apiKey,
      model,
      cloud: {
        repos: [
          {
            url:
              process.env.GITHUB_REPO_URL ??
              "https://github.com/yutuf/cursorHackathon",
          },
        ],
        skipReviewerRequest: true,
      },
    };
  }

  return {
    apiKey,
    model,
    local: {
      cwd: process.cwd(),
      settingSources: [],
    },
  };
}

export async function runBriefAgent(prompt: string): Promise<BriefAgentResult> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new CursorAgentError("CURSOR_API_KEY is not set", {
      isRetryable: false,
    });
  }

  const onVercel = Boolean(process.env.VERCEL);

  try {
    const result = await Agent.prompt(prompt, getSdkOptions(apiKey));

    if (result.status === "error" || !result.result?.trim()) {
      throw new Error(result.status === "error" ? "Agent run failed" : "Empty brief");
    }

    return {
      brief: result.result.trim(),
      source: onVercel ? "cursor-sdk-cloud" : "cursor-sdk-local",
      runId: result.id,
    };
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw error;
    }
    throw error;
  }
}
