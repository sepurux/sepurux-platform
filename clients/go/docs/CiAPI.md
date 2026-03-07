# \CiAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetCiRunV1CiRunsRunIdGet**](CiAPI.md#GetCiRunV1CiRunsRunIdGet) | **Get** /v1/ci/runs/{run_id} | Get Ci Run
[**PostCiRunV1CiRunsPost**](CiAPI.md#PostCiRunV1CiRunsPost) | **Post** /v1/ci/runs | Post Ci Run



## GetCiRunV1CiRunsRunIdGet

> CIRunStatusResponse GetCiRunV1CiRunsRunIdGet(ctx, runId).Execute()

Get Ci Run

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
	runId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CiAPI.GetCiRunV1CiRunsRunIdGet(context.Background(), runId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CiAPI.GetCiRunV1CiRunsRunIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetCiRunV1CiRunsRunIdGet`: CIRunStatusResponse
	fmt.Fprintf(os.Stdout, "Response from `CiAPI.GetCiRunV1CiRunsRunIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**runId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetCiRunV1CiRunsRunIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**CIRunStatusResponse**](CIRunStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostCiRunV1CiRunsPost

> CIRunCreateResponse PostCiRunV1CiRunsPost(ctx).CIRunCreateRequest(cIRunCreateRequest).Execute()

Post Ci Run

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
	cIRunCreateRequest := *openapiclient.NewCIRunCreateRequest("TraceId_example", "CampaignId_example", *openapiclient.NewCIRunThresholds(float32(123), int32(123))) // CIRunCreateRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CiAPI.PostCiRunV1CiRunsPost(context.Background()).CIRunCreateRequest(cIRunCreateRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CiAPI.PostCiRunV1CiRunsPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostCiRunV1CiRunsPost`: CIRunCreateResponse
	fmt.Fprintf(os.Stdout, "Response from `CiAPI.PostCiRunV1CiRunsPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostCiRunV1CiRunsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cIRunCreateRequest** | [**CIRunCreateRequest**](CIRunCreateRequest.md) |  | 

### Return type

[**CIRunCreateResponse**](CIRunCreateResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

