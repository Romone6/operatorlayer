# Enterprise Closure Assumptions

Date: 2026-05-18

## Organisation Governance Controls

1. `invitePolicy` is modelled as:
   - `open`: owner/admin can invite any email domain.
   - `domain_allowlist_only`: owner/admin can invite only domains present in SSO domain allowlist.
   - `disabled`: invite creation is blocked for all roles.
2. `sessionDurationMinutes` is represented as an explicit policy indicator for enterprise governance and auditability in this slice; runtime token/session expiry enforcement remains tied to auth provider/session infrastructure.
3. `enforcedMfa` is represented as an organisation policy indicator in this slice; provider-level MFA enforcement remains an external IdP/auth configuration dependency.
4. Enterprise release-decision domain statuses use only live readiness/capability runtime evidence. Domains without a direct runtime blocker feed are explicitly marked `verification_gap` rather than inferred as ready.

## Product-Side Auth Target

5. The current product-side completion pass retains Supabase Auth for the upload-based MVP unless the owner states otherwise. Current code depends on Supabase Auth for sign-in, sign-up, protected app layout session checks, invite acceptance, and organisation membership lookup.
6. Better Auth migration is a documented future interest, not a current milestone requirement and not an implemented capability. The smallest safe assumption is to preserve the working Supabase Auth path and keep the migration PRD as post-MVP planning material.
