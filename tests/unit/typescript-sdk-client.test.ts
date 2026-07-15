import { describe, expect, it, vi } from "vitest";

import { OperatorLayerClient, OperatorLayerError } from "@/sdk/typescript/src/index";

describe("OperatorLayerClient", () => {
  it("sends required API headers and returns envelope data", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("http://localhost:3000/api/v1/metadata");
      expect(init?.method).toBe("GET");
      const headers = new Headers(init?.headers);
      expect(headers.get("x-ol-api-key")).toBe("test-key");
      expect(headers.get("x-ol-org-id")).toBe("org_123");
      return new Response(
        JSON.stringify({
          data: {
            version: "v1",
            releasedAt: "2026-05-09",
            deprecationPolicy: "policy",
            endpoints: ["/api/v1/evaluations"],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const client = new OperatorLayerClient({
      baseUrl: "http://localhost:3000",
      apiKey: "test-key",
      organisationId: "org_123",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const response = await client.getV1Metadata();
    expect(response.version).toBe("v1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("posts webhook replay payload", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ jobId: "job_001" }));
      return new Response(
        JSON.stringify({
          data: {
            replayed: true,
            webhookId: "wh_001",
            sourceJobId: "job_001",
            replayJobId: "job_002",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const client = new OperatorLayerClient({
      baseUrl: "http://localhost:3000/",
      apiKey: "test-key",
      organisationId: "org_123",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const response = await client.replayWebhook("wh_001", "job_001");
    expect(response.replayed).toBe(true);
    expect(response.sourceJobId).toBe("job_001");
  });

  it("posts MCP invocation payload", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("http://localhost:3000/api/mcp");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          toolId: "draft.evaluate",
          input: {
            inputMessage: "Can you discount this?",
            draft: "We can definitely discount this.",
          },
        })
      );
      return new Response(
        JSON.stringify({
          data: {
            toolId: "draft.evaluate",
            invocationId: "mcp-invocation-001",
            result: { evaluation: { scores: { total: 72 } } },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const client = new OperatorLayerClient({
      baseUrl: "http://localhost:3000/",
      apiKey: "test-key",
      organisationId: "org_123",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const response = await client.invokeMcpTool("draft.evaluate", {
      inputMessage: "Can you discount this?",
      draft: "We can definitely discount this.",
    });
    expect(response.invocationId).toBe("mcp-invocation-001");
  });

  it("throws OperatorLayerError with envelope details on failure", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "api_scope_forbidden",
            message: "Credential does not grant evaluation.read scope.",
            severity: "high",
            recoverable: false,
            traceId: "trace_001",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    });

    const client = new OperatorLayerClient({
      baseUrl: "http://localhost:3000",
      apiKey: "test-key",
      organisationId: "org_123",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.listEvaluations()).rejects.toBeInstanceOf(OperatorLayerError);
    await expect(client.listEvaluations()).rejects.toMatchObject({
      status: 403,
      apiError: expect.objectContaining({
        code: "api_scope_forbidden",
      }),
    });
  });
});
