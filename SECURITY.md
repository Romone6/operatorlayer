# Security Policy

## Supported release

Only the latest tagged release on `main` is supported. Do not report security issues against an untagged worktree.

## Reporting a vulnerability

Do not open public issues for suspected vulnerabilities, exposed credentials, or customer-data risks. Before publication, maintainers must enable GitHub private vulnerability reporting for the official repository. Once enabled, submit reports through the repository's **Security** tab and include the affected version, reproducible steps, impact, and any safe proof of concept.

Do not attach real customer documents, secrets, access tokens, or private keys. If private vulnerability reporting is not available, do not disclose the issue publicly; ask a repository maintainer for a private reporting channel.

## Response expectations

Maintainers aim to acknowledge reports within five business days and provide a remediation or status update within thirty days. Public disclosure is coordinated after a fix is available or a mitigation is documented.

## Security boundaries

The public core uses organisation-scoped access, private object paths, and server-only model credentials. Contributors must preserve those boundaries. The MVP has no delivery channel and must never send customer messages.
