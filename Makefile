SEPURUX_OPENAPI_URL ?= http://localhost:8000/openapi.json
OPENAPI_FILE ?= clients/openapi.json
OPENAPI_GENERATOR_IMAGE ?= openapitools/openapi-generator-cli:v7.8.0
SEPURUX_GO_MODULE ?= github.com/sepurux/sepurux-platform/clients/go
COMPOSE_FILE ?= infra/docker-compose.yml

.PHONY: openapi-export gen-clients gen-typescript-client gen-go-client postprocess-generated-clients seed-local-credentials seed-local-credentials-host

openapi-export:
	@mkdir -p clients
	curl -fsSL "$(SEPURUX_OPENAPI_URL)" -o "$(OPENAPI_FILE)"
	@echo "Exported OpenAPI spec to $(OPENAPI_FILE)"

gen-typescript-client:
	docker run --rm -v "$(PWD):/local" $(OPENAPI_GENERATOR_IMAGE) generate \
		-i /local/$(OPENAPI_FILE) \
		-g typescript-fetch \
		-c /local/clients/config/typescript-fetch.yaml \
		-o /local/clients/typescript \
		--additional-properties=hideGenerationTimestamp=true
	@echo "Generated TypeScript client at clients/typescript"

gen-go-client:
	docker run --rm -v "$(PWD):/local" $(OPENAPI_GENERATOR_IMAGE) generate \
		-i /local/$(OPENAPI_FILE) \
		-g go \
		-c /local/clients/config/go.yaml \
		-o /local/clients/go \
		--additional-properties=hideGenerationTimestamp=true
	@echo "Generated Go client at clients/go"

postprocess-generated-clients:
	SEPURUX_GO_MODULE="$(SEPURUX_GO_MODULE)" ./scripts/sync_generated_clients.sh
	@echo "Postprocessed generated clients"

gen-clients: openapi-export gen-typescript-client gen-go-client postprocess-generated-clients
	@echo "Generated TypeScript + Go clients from $(OPENAPI_FILE)"

seed-local-credentials:
	docker compose -f "$(COMPOSE_FILE)" build api
	docker compose -f "$(COMPOSE_FILE)" run --rm api sh -lc 'alembic upgrade head && python -m app.scripts.seed_local_credentials'

seed-local-credentials-host:
	DATABASE_URL="$${SEED_DATABASE_URL:-postgresql+psycopg://crashlab:crashlab@localhost:5434/crashlab}" \
	PYTHONPATH=api python -m app.scripts.seed_local_credentials
