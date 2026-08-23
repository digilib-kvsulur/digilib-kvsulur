# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |
| < 1.0   | ❌ No     |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in **KV Sulur DLMS**, please **do NOT open a public GitHub issue**.

### How to Report

1. **Email** the maintainer directly or open a [GitHub Security Advisory](../../security/advisories/new) (private disclosure).
2. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce it
   - Potential impact (data exposure, privilege escalation, etc.)
   - Any suggested fix if you have one

### What to Expect

- **Acknowledgement** within 48 hours of your report
- **Status update** within 7 days (confirmed, investigating, or not reproducible)
- **Resolution** timeline communicated once confirmed
- **Credit** in the release notes if you wish to be acknowledged

## Security Best Practices for Deployers

If you are self-hosting this application, please ensure:

- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in any frontend/client code or public repository. It must only exist in Supabase Edge Function secrets or a secure server environment.
- **Only `VITE_*` prefixed variables** (anon/publishable key) should be in `.env` files committed to CI or deployed to Vercel.
- **Row Level Security (RLS)** is enabled on all Supabase tables. Do not disable RLS policies without understanding the access implications.
- **Supabase Auth redirect URLs** should only include your verified production and development domains.
- **VAPID private key** for push notifications must be kept server-side only (Supabase Edge Function secret).
- Regularly rotate keys if you suspect any exposure.
- Run `npx supabase db push` only against your own project — never against a shared or production database without reviewing the migration first.

## Scope

The following are **in scope** for security reports:

- Authentication/authorization bypass (e.g., accessing another user's data)
- RLS policy bypasses that expose private student or staff data
- XSS or injection vulnerabilities in the frontend
- Insecure direct object references
- Sensitive data exposure in API responses or logs

The following are **out of scope**:

- Issues in third-party dependencies (report those upstream)
- Social engineering attacks
- Denial-of-service (unless trivially exploitable)
- Issues that require physical access to the device
