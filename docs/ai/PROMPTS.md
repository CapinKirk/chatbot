# Prompt Templates and Versioning

- modelVersion: rule-0.1
- promptId: baseline-0

Rules:
- Bump modelVersion when classifier behavior changes.
- Bump promptId when prompt text/regexes change.
- Record both on every RouteDecision and BotEvalRun.
