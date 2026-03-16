# \AnalyticsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetMutationsSummaryEndpointV1MutationsSummaryGet**](AnalyticsAPI.md#GetMutationsSummaryEndpointV1MutationsSummaryGet) | **Get** /v1/mutations/summary | Get Mutations Summary Endpoint
[**GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet**](AnalyticsAPI.md#GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet) | **Get** /v1/analytics/reliability | Get Project Reliability Summary Endpoint
[**GetRunStatsEndpointV1RunsRunIdStatsGet**](AnalyticsAPI.md#GetRunStatsEndpointV1RunsRunIdStatsGet) | **Get** /v1/runs/{run_id}/stats | Get Run Stats Endpoint
[**GetToolsFragilityEndpointV1ToolsFragilityGet**](AnalyticsAPI.md#GetToolsFragilityEndpointV1ToolsFragilityGet) | **Get** /v1/tools/fragility | Get Tools Fragility Endpoint



## GetMutationsSummaryEndpointV1MutationsSummaryGet

> MutationSummaryResponse GetMutationsSummaryEndpointV1MutationsSummaryGet(ctx).WindowDays(windowDays).Limit(limit).XProjectId(xProjectId).Execute()

Get Mutations Summary Endpoint

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/sepurux-platform/clients/go"
)

func main() {
	windowDays := int32(56) // int32 |  (optional) (default to 7)
	limit := int32(56) // int32 |  (optional) (default to 20)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.GetMutationsSummaryEndpointV1MutationsSummaryGet(context.Background()).WindowDays(windowDays).Limit(limit).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.GetMutationsSummaryEndpointV1MutationsSummaryGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetMutationsSummaryEndpointV1MutationsSummaryGet`: MutationSummaryResponse
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.GetMutationsSummaryEndpointV1MutationsSummaryGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetMutationsSummaryEndpointV1MutationsSummaryGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **windowDays** | **int32** |  | [default to 7]
 **limit** | **int32** |  | [default to 20]
 **xProjectId** | **string** |  | 

### Return type

[**MutationSummaryResponse**](MutationSummaryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet

> ProjectReliabilitySummaryResponse GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet(ctx).XProjectId(xProjectId).Execute()

Get Project Reliability Summary Endpoint

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/sepurux-platform/clients/go"
)

func main() {
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet`: ProjectReliabilitySummaryResponse
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.GetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetProjectReliabilitySummaryEndpointV1AnalyticsReliabilityGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**ProjectReliabilitySummaryResponse**](ProjectReliabilitySummaryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetRunStatsEndpointV1RunsRunIdStatsGet

> RunStatsResponse GetRunStatsEndpointV1RunsRunIdStatsGet(ctx, runId).XProjectId(xProjectId).Execute()

Get Run Stats Endpoint

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/sepurux-platform/clients/go"
)

func main() {
	runId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.GetRunStatsEndpointV1RunsRunIdStatsGet(context.Background(), runId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.GetRunStatsEndpointV1RunsRunIdStatsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetRunStatsEndpointV1RunsRunIdStatsGet`: RunStatsResponse
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.GetRunStatsEndpointV1RunsRunIdStatsGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetRunStatsEndpointV1RunsRunIdStatsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**RunStatsResponse**](RunStatsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetToolsFragilityEndpointV1ToolsFragilityGet

> ToolFragilityResponse GetToolsFragilityEndpointV1ToolsFragilityGet(ctx).WindowDays(windowDays).Limit(limit).XProjectId(xProjectId).Execute()

Get Tools Fragility Endpoint

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/sepurux-platform/clients/go"
)

func main() {
	windowDays := int32(56) // int32 |  (optional) (default to 7)
	limit := int32(56) // int32 |  (optional) (default to 20)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AnalyticsAPI.GetToolsFragilityEndpointV1ToolsFragilityGet(context.Background()).WindowDays(windowDays).Limit(limit).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AnalyticsAPI.GetToolsFragilityEndpointV1ToolsFragilityGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetToolsFragilityEndpointV1ToolsFragilityGet`: ToolFragilityResponse
	fmt.Fprintf(os.Stdout, "Response from `AnalyticsAPI.GetToolsFragilityEndpointV1ToolsFragilityGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetToolsFragilityEndpointV1ToolsFragilityGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **windowDays** | **int32** |  | [default to 7]
 **limit** | **int32** |  | [default to 20]
 **xProjectId** | **string** |  | 

### Return type

[**ToolFragilityResponse**](ToolFragilityResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

