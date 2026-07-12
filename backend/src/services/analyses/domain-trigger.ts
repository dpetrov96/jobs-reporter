import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({});

export async function triggerDomainEnrichment(
  analysisId: string,
  periodStart: string,
  periodEnd: string,
  countryCode: string
): Promise<void> {
  const functionArn = process.env.ENRICH_DOMAINS_FUNCTION_ARN?.trim();
  if (!functionArn) {
    throw new Error("ENRICH_DOMAINS_FUNCTION_ARN not configured");
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
          countryCode: countryCode.toUpperCase(),
        })
      ),
    })
  );
}
