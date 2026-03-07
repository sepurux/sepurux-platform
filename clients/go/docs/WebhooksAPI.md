# \WebhooksAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetWebhookByIdV1WebhooksWebhookIdGet**](WebhooksAPI.md#GetWebhookByIdV1WebhooksWebhookIdGet) | **Get** /v1/webhooks/{webhook_id} | Get Webhook By Id
[**GetWebhooksV1WebhooksGet**](WebhooksAPI.md#GetWebhooksV1WebhooksGet) | **Get** /v1/webhooks | Get Webhooks
[**PatchWebhookV1WebhooksWebhookIdPatch**](WebhooksAPI.md#PatchWebhookV1WebhooksWebhookIdPatch) | **Patch** /v1/webhooks/{webhook_id} | Patch Webhook
[**PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost**](WebhooksAPI.md#PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost) | **Post** /v1/webhooks/{webhook_id}/rotate-secret | Post Rotate Webhook Secret
[**PostWebhookV1WebhooksPost**](WebhooksAPI.md#PostWebhookV1WebhooksPost) | **Post** /v1/webhooks | Post Webhook



## GetWebhookByIdV1WebhooksWebhookIdGet

> WebhookMetadata GetWebhookByIdV1WebhooksWebhookIdGet(ctx, webhookId).XProjectId(xProjectId).Execute()

Get Webhook By Id

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/felixkwasisarpong/crash-lab/clients/go"
)

func main() {
	webhookId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.WebhooksAPI.GetWebhookByIdV1WebhooksWebhookIdGet(context.Background(), webhookId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.GetWebhookByIdV1WebhooksWebhookIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetWebhookByIdV1WebhooksWebhookIdGet`: WebhookMetadata
	fmt.Fprintf(os.Stdout, "Response from `WebhooksAPI.GetWebhookByIdV1WebhooksWebhookIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**webhookId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetWebhookByIdV1WebhooksWebhookIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**WebhookMetadata**](WebhookMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetWebhooksV1WebhooksGet

> []WebhookMetadata GetWebhooksV1WebhooksGet(ctx).XProjectId(xProjectId).Execute()

Get Webhooks

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/felixkwasisarpong/crash-lab/clients/go"
)

func main() {
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.WebhooksAPI.GetWebhooksV1WebhooksGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.GetWebhooksV1WebhooksGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetWebhooksV1WebhooksGet`: []WebhookMetadata
	fmt.Fprintf(os.Stdout, "Response from `WebhooksAPI.GetWebhooksV1WebhooksGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetWebhooksV1WebhooksGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**[]WebhookMetadata**](WebhookMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PatchWebhookV1WebhooksWebhookIdPatch

> WebhookMetadata PatchWebhookV1WebhooksWebhookIdPatch(ctx, webhookId).WebhookUpdateRequest(webhookUpdateRequest).XProjectId(xProjectId).Execute()

Patch Webhook

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/felixkwasisarpong/crash-lab/clients/go"
)

func main() {
	webhookId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	webhookUpdateRequest := *openapiclient.NewWebhookUpdateRequest() // WebhookUpdateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.WebhooksAPI.PatchWebhookV1WebhooksWebhookIdPatch(context.Background(), webhookId).WebhookUpdateRequest(webhookUpdateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.PatchWebhookV1WebhooksWebhookIdPatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PatchWebhookV1WebhooksWebhookIdPatch`: WebhookMetadata
	fmt.Fprintf(os.Stdout, "Response from `WebhooksAPI.PatchWebhookV1WebhooksWebhookIdPatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**webhookId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPatchWebhookV1WebhooksWebhookIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **webhookUpdateRequest** | [**WebhookUpdateRequest**](WebhookUpdateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**WebhookMetadata**](WebhookMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost

> WebhookRotateSecretResponse PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost(ctx, webhookId).XProjectId(xProjectId).Execute()

Post Rotate Webhook Secret

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/felixkwasisarpong/crash-lab/clients/go"
)

func main() {
	webhookId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.WebhooksAPI.PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost(context.Background(), webhookId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost`: WebhookRotateSecretResponse
	fmt.Fprintf(os.Stdout, "Response from `WebhooksAPI.PostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**webhookId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPostRotateWebhookSecretV1WebhooksWebhookIdRotateSecretPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**WebhookRotateSecretResponse**](WebhookRotateSecretResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostWebhookV1WebhooksPost

> WebhookCreateResponse PostWebhookV1WebhooksPost(ctx).WebhookCreateRequest(webhookCreateRequest).XProjectId(xProjectId).Execute()

Post Webhook

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/felixkwasisarpong/crash-lab/clients/go"
)

func main() {
	webhookCreateRequest := *openapiclient.NewWebhookCreateRequest("Url_example") // WebhookCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.WebhooksAPI.PostWebhookV1WebhooksPost(context.Background()).WebhookCreateRequest(webhookCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.PostWebhookV1WebhooksPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostWebhookV1WebhooksPost`: WebhookCreateResponse
	fmt.Fprintf(os.Stdout, "Response from `WebhooksAPI.PostWebhookV1WebhooksPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostWebhookV1WebhooksPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **webhookCreateRequest** | [**WebhookCreateRequest**](WebhookCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**WebhookCreateResponse**](WebhookCreateResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

