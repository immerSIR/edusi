# Security Policy

## Supported Versions

Security fixes are handled on the default branch. If this project starts maintaining release branches, supported versions will be listed here.

## Reporting a Vulnerability

Please do not report vulnerabilities, exposed keys, child safety concerns, or data access issues in public GitHub issues.

Send a private report to the maintainers with:

- A description of the issue
- Steps to reproduce it
- Potential impact
- Any relevant logs, screenshots, or request examples with secrets redacted

Maintainers will acknowledge valid reports as soon as possible and coordinate a fix before public disclosure.

## Secret Handling

- Never commit `.env` files or provider credentials.
- Treat `SUPABASE_SERVICE_ROLE_KEY`, AI provider keys, and WhatsApp access tokens as server-only secrets.
- Rotate any key that may have been exposed in logs, screenshots, commits, or issue reports.
- Use separate development, staging, and production Supabase projects when possible.
