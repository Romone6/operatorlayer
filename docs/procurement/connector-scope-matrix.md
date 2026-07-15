# Connector Scope Matrix (Current Contract Surface)

This matrix describes current implemented API/control-plane scope.
Provider-deep production sync evidence must still be validated per environment.

| Provider | OAuth Start/Callback | Sync | Backfill | Health | Sync Runs | Runtime Flag |
|---|---|---|---|---|---|---|
| Gmail | Yes | Yes | Yes | Yes | Yes | `connector_gmail` |
| Slack | Yes | Yes | Yes | Yes | Yes | `connector_slack` |
| Outlook | Yes | Yes | Yes | Yes | Yes | `connector_outlook` |
| HubSpot | Yes | Yes | Yes | Yes | Yes | `connector_hubspot` |
| Salesforce | Yes | Yes | Yes | Yes | Yes | `connector_salesforce` |
| Intercom | Yes | Yes | Yes | Yes | Yes | `connector_intercom` |
| Zendesk | Yes | Yes | Yes | Yes | Yes | `connector_zendesk` |

## Notes

- "Yes" indicates route-level implementation and integration-test coverage.
- "Available" in UI must remain blocked until provider-specific operational checks pass.
