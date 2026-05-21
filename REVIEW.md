# PR Review Guidance

Edusi uses solo-maintainer mode: automated reviewers are advisory, deterministic CI is required, and the maintainer remains the final merge authority.

- Flag production bugs, security issues, regressions, missing validation, broken accessibility, and missing tests for changed behavior.
- Prefer high-signal comments over style nits.
- Verify that PRs address linked issues and acceptance criteria.
- Treat `.github/workflows/**`, deployment files, dependency manifests, authentication, authorization, secrets, Supabase RLS policies, and external API integrations as security-sensitive.
- Do not suggest running untrusted contributor code with write tokens or production secrets.
- Keep CodeRabbit and Claude feedback advisory unless their GitHub checks are later made reliable and explicitly required in branch protection.
