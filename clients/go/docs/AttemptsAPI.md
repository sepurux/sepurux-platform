# \AttemptsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetAttemptTimelineV1AttemptsAttemptIdTimelineGet**](AttemptsAPI.md#GetAttemptTimelineV1AttemptsAttemptIdTimelineGet) | **Get** /v1/attempts/{attempt_id}/timeline | Get Attempt Timeline
[**GetAttemptV1AttemptsAttemptIdGet**](AttemptsAPI.md#GetAttemptV1AttemptsAttemptIdGet) | **Get** /v1/attempts/{attempt_id} | Get Attempt



## GetAttemptTimelineV1AttemptsAttemptIdTimelineGet

> map[string]interface{} GetAttemptTimelineV1AttemptsAttemptIdTimelineGet(ctx, attemptId).XProjectId(xProjectId).Execute()

Get Attempt Timeline

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
	attemptId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AttemptsAPI.GetAttemptTimelineV1AttemptsAttemptIdTimelineGet(context.Background(), attemptId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AttemptsAPI.GetAttemptTimelineV1AttemptsAttemptIdTimelineGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetAttemptTimelineV1AttemptsAttemptIdTimelineGet`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `AttemptsAPI.GetAttemptTimelineV1AttemptsAttemptIdTimelineGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**attemptId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetAttemptTimelineV1AttemptsAttemptIdTimelineGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

**map[string]interface{}**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetAttemptV1AttemptsAttemptIdGet

> ReplayAttemptDetail GetAttemptV1AttemptsAttemptIdGet(ctx, attemptId).XProjectId(xProjectId).Execute()

Get Attempt

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
	attemptId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AttemptsAPI.GetAttemptV1AttemptsAttemptIdGet(context.Background(), attemptId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AttemptsAPI.GetAttemptV1AttemptsAttemptIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetAttemptV1AttemptsAttemptIdGet`: ReplayAttemptDetail
	fmt.Fprintf(os.Stdout, "Response from `AttemptsAPI.GetAttemptV1AttemptsAttemptIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**attemptId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetAttemptV1AttemptsAttemptIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**ReplayAttemptDetail**](ReplayAttemptDetail.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

