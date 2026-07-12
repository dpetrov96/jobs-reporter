import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

let loadPromise: Promise<string> | null = null;

async function resolveOpenAiKey(): Promise<string> {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const paramName = process.env.OPENAI_API_KEY_PARAM?.trim();
  if (!paramName) {
    return "";
  }

  const region = process.env.AWS_REGION ?? "eu-central-1";
  const client = new SSMClient({ region });

  try {
    const response = await client.send(
      new GetParameterCommand({
        Name: paramName,
        WithDecryption: true,
      })
    );

    const value = response.Parameter?.Value?.trim() ?? "";
    if (value) {
      process.env.OPENAI_API_KEY = value;
    }

    return value;
  } catch (error) {
    console.error(
      JSON.stringify({
        service: "analysis",
        phase: "ai_check",
        message: "Failed to load OPENAI_API_KEY from SSM",
        paramName,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return "";
  }
}

/** Load OpenAI key from env or SSM once per Lambda invocation. */
export async function loadOpenAiKey(): Promise<string> {
  if (!loadPromise) {
    loadPromise = resolveOpenAiKey();
  }

  return loadPromise;
}
