import { handler } from "../src/handlers/fetch-jobs.js";

await handler(
  {
    version: "0",
    id: "local-scheduled-event",
    "detail-type": "Scheduled Event",
    source: "aws.events",
    account: "123456789012",
    time: new Date().toISOString(),
    region: "eu-central-1",
    resources: [],
    detail: {},
  },
  {} as never,
  () => {}
);
