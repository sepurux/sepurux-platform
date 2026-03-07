CRASHLAB_OPENAPI_URL ?= http://localhost:8000/openapi.json
OPENAPI_FILE ?= clients/openapi.json
OPENAPI_GENERATOR_IMAGE ?= openapitools/openapi-generator-cli:v7.8.0
CRASHLAB_GO_MODULE ?= github.com/felixkwasisarpong/crash-lab/clients/go

.PHONY: openapi-export gen-clients gen-typescript-client gen-go-client postprocess-generated-clients

openapi-export:
	@mkdir -p clients
	curl -fsSL "$(CRASHLAB_OPENAPI_URL)" -o "$(OPENAPI_FILE)"
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
	CRASHLAB_GO_MODULE="$(CRASHLAB_GO_MODULE)" ./scripts/sync_generated_clients.sh
	@echo "Postprocessed generated clients"

gen-clients: openapi-export gen-typescript-client gen-go-client postprocess-generated-clients
	@echo "Generated TypeScript + Go clients from $(OPENAPI_FILE)"
