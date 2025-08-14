# chatbot

## Observability

- Start stack: `docker compose -f infra/docker/docker-compose.yml up -d --build`
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (anonymous)
- Metrics: API `/metrics` on 4000, AI-bot `/metrics` on 4100
- Tracing: OTLP HTTP to `otel-collector:4318` (collector logs traces)
- Run load test: `k6 run infra/k6/load.js` (requires k6 installed)

Dashboards JSON: see `docs/observability/dashboards/`.