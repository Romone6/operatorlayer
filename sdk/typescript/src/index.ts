export type OperatorLayerClientConfig = {
  baseUrl: string;
  apiKey: string;
  organisationId: string;
  fetchImpl?: typeof fetch;
};

export type OperatorLayerApiError = {
  code: string;
  message: string;
  details?: unknown;
  severity?: string;
  recoverable?: boolean;
  traceId?: string;
};

export class OperatorLayerError extends Error {
  status: number;
  apiError: OperatorLayerApiError | null;

  constructor(input: { status: number; message: string; apiError?: OperatorLayerApiError | null }) {
    super(input.message);
    this.name = "OperatorLayerError";
    this.status = input.status;
    this.apiError = input.apiError ?? null;
  }
}

type ApiEnvelope<T> = {
  data: T;
};

type EvaluationItem = {
  id: string;
  organisationId: string;
  createdAt: string;
};

type ListEvaluationsResponse = {
  items: EvaluationItem[];
  credential: {
    id: string;
    name: string;
  };
};

type V1MetadataResponse = {
  version: string;
  releasedAt: string;
  deprecationPolicy: string;
  endpoints: string[];
};

type ConnectorHealthResponse = {
  provider: string;
  state: "connected" | "disconnected";
  connected: boolean;
  configured: boolean;
  missingEnv: string[];
  featureEnabled: boolean;
  sync: {
    schedule: "manual" | "hourly" | "daily";
    lastSyncAt: string | null;
    lastSyncStatus: "succeeded" | "failed" | "never";
    lastSyncError: string | null;
    lastSuccessfulSyncAt: string | null;
    syncLagMinutes: number | null;
  };
  health: {
    scopeStatus: "complete" | "partial" | "missing_required" | "unknown";
    tokenExpiry: "valid" | "expiring_soon" | "expired" | "unknown";
    throttlingState: "normal" | "throttled" | "rate_limited" | "backoff" | "unknown";
    failureReasons: string[];
  };
  availability: {
    state: "available" | "unavailable";
    reason: string;
    message: string;
  };
};

type WebhookReplayListResponse = {
  replayable: Array<{
    jobId: string;
    eventType: string;
    status: string;
    attemptedAt: string | null;
    endpoint: string;
  }>;
};

type WebhookReplayTriggerResponse = {
  replayed: boolean;
  webhookId: string;
  sourceJobId: string;
  replayJobId: string;
};

type McpToolId = "policy_pack.fetch" | "draft.evaluate" | "draft.repair";

type McpInvocationResponse<TResult = unknown> = {
  toolId: McpToolId;
  invocationId: string;
  result: TResult;
};

export class OperatorLayerClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly organisationId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OperatorLayerClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.organisationId = config.organisationId;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async getV1Metadata() {
    return this.request<V1MetadataResponse>("GET", "/api/v1/metadata");
  }

  async getOpenApi() {
    return this.request<Record<string, unknown>>("GET", "/api/v1/openapi");
  }

  async listEvaluations() {
    return this.request<ListEvaluationsResponse>("GET", "/api/v1/evaluations");
  }

  async getConnectorHealth(provider: string) {
    return this.request<ConnectorHealthResponse>("GET", `/api/connectors/${encodeURIComponent(provider)}/health`);
  }

  async listWebhookReplayable(webhookId: string) {
    return this.request<WebhookReplayListResponse>(
      "GET",
      `/api/webhooks/${encodeURIComponent(webhookId)}/replay`
    );
  }

  async replayWebhook(webhookId: string, jobId: string) {
    return this.request<WebhookReplayTriggerResponse>(
      "POST",
      `/api/webhooks/${encodeURIComponent(webhookId)}/replay`,
      { jobId }
    );
  }

  async invokeMcpTool<TResult = unknown>(toolId: McpToolId, input: Record<string, unknown> = {}) {
    return this.request<McpInvocationResponse<TResult>>("POST", "/api/mcp", { toolId, input });
  }

  private async request<TResponse>(method: "GET" | "POST", path: string, body?: unknown) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-ol-api-key": this.apiKey,
        "x-ol-org-id": this.organisationId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as
      | ApiEnvelope<TResponse>
      | { error?: OperatorLayerApiError };
    if (!response.ok) {
      const error = payload && "error" in payload ? payload.error ?? null : null;
      throw new OperatorLayerError({
        status: response.status,
        message: error?.message ?? `OperatorLayer request failed (${response.status})`,
        apiError: error,
      });
    }
    return (payload as ApiEnvelope<TResponse>).data;
  }
}
