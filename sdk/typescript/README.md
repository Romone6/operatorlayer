# OperatorLayer TypeScript SDK Starter

This starter wraps OperatorLayer enterprise API headers and error envelope handling.

## Usage

```ts
import { OperatorLayerClient } from "./src/index";

const client = new OperatorLayerClient({
  baseUrl: "https://your-operatorlayer-host",
  apiKey: process.env.OPERATORLAYER_API_KEY!,
  organisationId: process.env.OPERATORLAYER_ORG_ID!,
});

const metadata = await client.getV1Metadata();
const evaluations = await client.listEvaluations();
const connectorHealth = await client.getConnectorHealth("gmail");
const evaluation = await client.invokeMcpTool("draft.evaluate", {
  inputMessage: "Can you discount this?",
  draft: "We can definitely discount this.",
});
```

## Methods

- `getV1Metadata()`
- `getOpenApi()`
- `listEvaluations()`
- `getConnectorHealth(provider)`
- `listWebhookReplayable(webhookId)`
- `replayWebhook(webhookId, jobId)`
- `invokeMcpTool(toolId, input)`

## Error Handling

Failed requests throw `OperatorLayerError` with:

- `status`
- `message`
- `apiError` (includes `code`, `severity`, `recoverable`, `traceId` when provided by API)
