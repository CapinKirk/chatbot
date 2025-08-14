# Observability (Local)

- Start stack: `docker compose -f infra/docker/docker-compose.yml up -d --build`
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (anonymous enabled)
- Metrics endpoints:
  - API: http://localhost:4000/metrics
  - AI-bot: http://localhost:4100/metrics
- Traces are sent to the OTEL Collector (logging exporter).

Dashboards are provisioned from `infra/docker/grafana/dashboards` via `provisioning` configs.