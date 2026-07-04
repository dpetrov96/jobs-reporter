import { handler } from "../src/handlers/health.js";

const event = {
  version: "2.0",
  routeKey: "GET /health",
  rawPath: "/health",
  rawQueryString: process.argv.includes("--send-test") ? "sendTest=true" : "",
  headers: {},
  requestContext: {
    accountId: "local",
    apiId: "local",
    domainName: "localhost",
    domainPrefix: "local",
    http: {
      method: "GET",
      path: "/health",
      protocol: "HTTP/1.1",
      sourceIp: "127.0.0.1",
      userAgent: "local-test",
    },
    requestId: "local-request",
    routeKey: "GET /health",
    stage: "$default",
    time: new Date().toISOString(),
    timeEpoch: Date.now(),
  },
  isBase64Encoded: false,
  queryStringParameters: process.argv.includes("--send-test")
    ? { sendTest: "true" }
    : undefined,
};

const result = await handler(event, {} as never, () => {});
console.log(JSON.stringify(result, null, 2));
