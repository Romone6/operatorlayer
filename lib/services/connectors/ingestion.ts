import { AppError } from "@/lib/errors";
import { connectorConfigs } from "@/lib/services/connectors/providers";
import type { ConnectorProvider } from "@/lib/types";

type ConnectorRecordLike = {
  provider: ConnectorProvider;
  status: string;
  tokenRef: string | null;
  metadata?: Record<string, unknown>;
};

async function fetchJson(url: string, token: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    throw new AppError(502, "connector_api_error", "Connector API call failed.", {
      url,
      status: response.status,
      body,
    });
  }
  return body;
}

async function ingestGmail(token: string) {
  const base = connectorConfigs.gmail.apiBaseUrl;
  const list = await fetchJson(`${base}/users/me/messages?maxResults=10`, token);
  const messages = Array.isArray(list.messages) ? list.messages : [];
  const parts: string[] = [];
  for (const item of messages.slice(0, 10)) {
    const id = (item as Record<string, unknown>).id;
    if (!id) continue;
    const message = await fetchJson(`${base}/users/me/messages/${id}?format=metadata`, token);
    const headers = ((message.payload as Record<string, unknown> | undefined)?.headers ??
      []) as Array<Record<string, string>>;
    const subject =
      headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "(no subject)";
    parts.push(`Subject: ${subject}`);
  }
  return parts.join("\n");
}

async function ingestSlack(token: string) {
  const base = connectorConfigs.slack.apiBaseUrl;
  const channels = await fetchJson(`${base}/conversations.list?limit=5&types=public_channel`, token);
  const list = Array.isArray(channels.channels) ? channels.channels : [];
  const parts: string[] = [];
  for (const channel of list.slice(0, 5)) {
    const id = (channel as Record<string, unknown>).id;
    const name = (channel as Record<string, unknown>).name;
    if (!id) continue;
    const history = await fetchJson(`${base}/conversations.history?channel=${id}&limit=5`, token);
    const messages = Array.isArray(history.messages) ? history.messages : [];
    for (const message of messages) {
      parts.push(`#${name ?? "channel"}: ${String((message as Record<string, unknown>).text ?? "")}`);
    }
  }
  return parts.join("\n");
}

async function ingestOutlook(token: string) {
  const base = connectorConfigs.outlook.apiBaseUrl;
  const payload = await fetchJson(
    `${base}/me/messages?$top=10&$select=subject,bodyPreview,from,receivedDateTime`,
    token
  );
  const messages = Array.isArray(payload.value) ? payload.value : [];
  return messages
    .map((item) => {
      const message = item as Record<string, unknown>;
      const subject = String(message.subject ?? "(no subject)");
      const body = String(message.bodyPreview ?? "");
      return `Subject: ${subject}\nBody: ${body}`;
    })
    .join("\n\n");
}

async function ingestHubspot(token: string) {
  const payload = await fetchJson(
    `${connectorConfigs.hubspot.apiBaseUrl}/crm/v3/objects/contacts?limit=20&properties=firstname,lastname,email,jobtitle`,
    token
  );
  const results = Array.isArray(payload.results) ? payload.results : [];
  return results
    .map((item) => {
      const properties = (item as Record<string, unknown>).properties as Record<string, unknown>;
      return `Contact: ${String(properties?.firstname ?? "")} ${String(properties?.lastname ?? "")} <${String(properties?.email ?? "")}>`;
    })
    .join("\n");
}

async function ingestSalesforce(token: string, instanceUrl?: string | null) {
  const baseUrl = instanceUrl || "https://login.salesforce.com";
  const query = encodeURIComponent("SELECT Id, Subject, Status, Priority FROM Case LIMIT 20");
  const payload = await fetchJson(
    `${baseUrl}/services/data/v62.0/query?q=${query}`,
    token
  );
  const records = Array.isArray(payload.records) ? payload.records : [];
  return records
    .map((item) => {
      const record = item as Record<string, unknown>;
      return `Case ${String(record.Id ?? "")}: ${String(record.Subject ?? "")} [${String(record.Status ?? "")}]`;
    })
    .join("\n");
}

async function ingestIntercom(token: string) {
  const payload = await fetchJson(`${connectorConfigs.intercom.apiBaseUrl}/conversations?per_page=20`, token);
  const conversations = Array.isArray(payload.conversations) ? payload.conversations : [];
  return conversations
    .map((item) => {
      const record = item as Record<string, unknown>;
      return `Conversation ${String(record.id ?? "")}: ${String(record.title ?? "")}`;
    })
    .join("\n");
}

async function ingestZendesk(token: string) {
  const payload = await fetchJson(`${connectorConfigs.zendesk.apiBaseUrl}/tickets.json?per_page=20`, token);
  const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
  return tickets
    .map((item) => {
      const ticket = item as Record<string, unknown>;
      return `Ticket ${String(ticket.id ?? "")}: ${String(ticket.subject ?? "")}`;
    })
    .join("\n");
}

export async function ingestConnectorData(input: {
  connector: ConnectorRecordLike;
  accessToken: string;
}) {
  if (input.connector.status !== "connected") {
    throw new AppError(409, "connector_not_connected", "Connector is not connected.");
  }
  switch (input.connector.provider) {
    case "gmail":
      return ingestGmail(input.accessToken);
    case "slack":
      return ingestSlack(input.accessToken);
    case "outlook":
      return ingestOutlook(input.accessToken);
    case "hubspot":
      return ingestHubspot(input.accessToken);
    case "salesforce":
      return ingestSalesforce(
        input.accessToken,
        typeof input.connector.metadata?.instanceUrl === "string"
          ? input.connector.metadata.instanceUrl
          : null
      );
    case "intercom":
      return ingestIntercom(input.accessToken);
    case "zendesk":
      return ingestZendesk(input.accessToken);
    default:
      throw new AppError(400, "connector_provider_unsupported", "Unsupported connector provider.");
  }
}
