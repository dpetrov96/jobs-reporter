import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({});

export async function triggerAnalysisRun(
  analysisId: string,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  const functionArn = process.env.RUN_ANALYSIS_FUNCTION_ARN?.trim();
  if (!functionArn) {
    throw new Error("RUN_ANALYSIS_FUNCTION_ARN not configured");
  }

  await lambda.send(
    new InvokeCommand({
      FunctionName: functionArn,
      InvocationType: "Event",
      Payload: Buffer.from(
        JSON.stringify({
          analysisId,
          periodStart,
          periodEnd,
        })
      ),
    })
  );
}
