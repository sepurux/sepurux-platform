# \RunsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetRunAttemptsV1RunsRunIdAttemptsGet**](RunsAPI.md#GetRunAttemptsV1RunsRunIdAttemptsGet) | **Get** /v1/runs/{run_id}/attempts | Get Run Attempts
[**GetRunPolicyEventsV1RunsRunIdPolicyEventsGet**](RunsAPI.md#GetRunPolicyEventsV1RunsRunIdPolicyEventsGet) | **Get** /v1/runs/{run_id}/policy-events | Get Run Policy Events
[**GetRunSecurityEventsV1RunsRunIdSecurityEventsGet**](RunsAPI.md#GetRunSecurityEventsV1RunsRunIdSecurityEventsGet) | **Get** /v1/runs/{run_id}/security-events | Get Run Security Events
[**GetRunV1RunsRunIdGet**](RunsAPI.md#GetRunV1RunsRunIdGet) | **Get** /v1/runs/{run_id} | Get Run
[**GetRunsV1RunsGet**](RunsAPI.md#GetRunsV1RunsGet) | **Get** /v1/runs | Get Runs
[**PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost**](RunsAPI.md#PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost) | **Post** /v1/runs/{run_id}/apply-template/{template_id} | Post Apply Template
[**PostRunV1RunsPost**](RunsAPI.md#PostRunV1RunsPost) | **Post** /v1/runs | Post Run



## GetRunAttemptsV1RunsRunIdAttemptsGet

> []ReplayAttemptListItem GetRunAttemptsV1RunsRunIdAttemptsGet(ctx, runId).Limit(limit).Offset(offset).Result(result).XProjectId(xProjectId).Execute()

Get Run Attempts

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/go-sdk"
)

func main() {
	runId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	limit := int32(56) // int32 |  (optional) (default to 50)
	offset := int32(56) // int32 |  (optional) (default to 0)
	result := "result_example" // string |  (optional)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.RunsAPI.GetRunAttemptsV1RunsRunIdAttemptsGet(context.Background(), runId).Limit(limit).Offset(offset).Result(result).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `RunsAPI.GetRunAttemptsV1RunsRunIdAttemptsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetRunAttemptsV1RunsRunIdAttemptsGet`: []ReplayAttemptListItem
	fmt.Fprintf(os.Stdout, "Response from `RunsAPI.GetRunAttemptsV1RunsRunIdAttemptsGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetRunAttemptsV1RunsRunIdAttemptsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **limit** | **int32** |  | [default to 50]
 **offset** | **int32** |  | [default to 0]
 **result** | **string** |  | 
 **xProjectId** | **string** |  | 

### Return type

[**[]ReplayAttemptListItem**](ReplayAttemptListItem.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetRunPolicyEventsV1RunsRunIdPolicyEventsGet

> []PolicyEventListItem GetRunPolicyEventsV1RunsRunIdPolicyEventsGet(ctx, runId).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()

Get Run Policy Events

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/go-sdk"
)

func main() {
	runId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	limit := int32(56) // int32 |  (optional) (default to 50)
	offset := int32(56) // int32 |  (optional) (default to 0)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.RunsAPI.GetRunPolicyEventsV1RunsRunIdPolicyEventsGet(context.Background(), runId).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `RunsAPI.GetRunPolicyEventsV1RunsRunIdPolicyEventsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetRunPolicyEventsV1RunsRunIdPolicyEventsGet`: []PolicyEventListItem
	fmt.Fprintf(os.Stdout, "Response from `RunsAPI.GetRunPolicyEventsV1RunsRunIdPolicyEventsGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetRunPolicyEventsV1RunsRunIdPolicyEventsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **limit** | **int32** |  | [default to 50]
 **offset** | **int32** |  | [default to 0]
 **xProjectId** | **string** |  | 

### Return type

[**[]PolicyEventListItem**](PolicyEventListItem.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetRunSecurityEventsV1RunsRunIdSecurityEventsGet

> []SecurityEventListItem GetRunSecurityEventsV1RunsRunIdSecurityEventsGet(ctx, runId).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()

Get Run Security Events

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/go-sdk"
)

func main() {
	runId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	limit := int32(56) // int32 |  (optional) (default to 50)
	offset := int32(56) // int32 |  (optional) (default to 0)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.RunsAPI.GetRunSecurityEventsV1RunsRunIdSecurityEventsGet(context.Background(), runId).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `RunsAPI.GetRunSecurityEventsV1RunsRunIdSecurityEventsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetRunSecurityEventsV1RunsRunIdSecurityEventsGet`: []SecurityEventListItem
	fmt.Fprintf(os.Stdout, "Response from `RunsAPI.GetRunSecurityEventsV1RunsRunIdSecurityEventsGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetRunSecurityEventsV1RunsRunIdSecurityEventsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **limit** | **int32** |  | [default to 50]
 **offset** | **int32** |  | [default to 0]
 **xProjectId** | **string** |  | 

### Return type

[**[]SecurityEventListItem**](SecurityEventListItem.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetRunV1RunsRunIdGet

> RunMetadata GetRunV1RunsRunIdGet(ctx, runId).XProjectId(xProjectId).Execute()

Get Run

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/go-sdk"
)

func main() {
	runId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.RunsAPI.GetRunV1RunsRunIdGet(context.Background(), runId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `RunsAPI.GetRunV1RunsRunIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetRunV1RunsRunIdGet`: RunMetadata
	fmt.Fprintf(os.Stdout, "Response from `RunsAPI.GetRunV1RunsRunIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetRunV1RunsRunIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**RunMetadata**](RunMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetRunsV1RunsGet

> []RunMetadata GetRunsV1RunsGet(ctx).Limit(limit).XProjectId(xProjectId).Execute()

Get Runs

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/go-sdk"
)

func main() {
	limit := int32(56) // int32 |  (optional) (default to 20)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.RunsAPI.GetRunsV1RunsGet(context.Background()).Limit(limit).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `RunsAPI.GetRunsV1RunsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetRunsV1RunsGet`: []RunMetadata
	fmt.Fprintf(os.Stdout, "Response from `RunsAPI.GetRunsV1RunsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetRunsV1RunsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** |  | [default to 20]
 **xProjectId** | **string** |  | 

### Return type

[**[]RunMetadata**](RunMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost

> ApplyTemplateRunResponse PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost(ctx, runId, templateId).XProjectId(xProjectId).Execute()

Post Apply Template

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/go-sdk"
)

func main() {
	runId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	templateId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.RunsAPI.PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost(context.Background(), runId, templateId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `RunsAPI.PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost`: ApplyTemplateRunResponse
	fmt.Fprintf(os.Stdout, "Response from `RunsAPI.PostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** |  | 
**templateId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPostApplyTemplateV1RunsRunIdApplyTemplateTemplateIdPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


 **xProjectId** | **string** |  | 

### Return type

[**ApplyTemplateRunResponse**](ApplyTemplateRunResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostRunV1RunsPost

> RunMetadata PostRunV1RunsPost(ctx).RunCreateRequest(runCreateRequest).XProjectId(xProjectId).Execute()

Post Run

### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/sepurux/go-sdk"
)

func main() {
	runCreateRequest := *openapiclient.NewRunCreateRequest("TraceId_example", "CampaignId_example") // RunCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.RunsAPI.PostRunV1RunsPost(context.Background()).RunCreateRequest(runCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `RunsAPI.PostRunV1RunsPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostRunV1RunsPost`: RunMetadata
	fmt.Fprintf(os.Stdout, "Response from `RunsAPI.PostRunV1RunsPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostRunV1RunsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **runCreateRequest** | [**RunCreateRequest**](RunCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**RunMetadata**](RunMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

