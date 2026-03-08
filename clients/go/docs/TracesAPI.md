# \TracesAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetTraceByIdV1TracesTraceIdGet**](TracesAPI.md#GetTraceByIdV1TracesTraceIdGet) | **Get** /v1/traces/{trace_id} | Get Trace By Id
[**GetTracesV1TracesGet**](TracesAPI.md#GetTracesV1TracesGet) | **Get** /v1/traces | Get Traces
[**PostTraceV1TracesPost**](TracesAPI.md#PostTraceV1TracesPost) | **Post** /v1/traces | Post Trace



## GetTraceByIdV1TracesTraceIdGet

> TraceMetadata GetTraceByIdV1TracesTraceIdGet(ctx, traceId).IncludePayload(includePayload).XProjectId(xProjectId).Execute()

Get Trace By Id

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
	traceId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	includePayload := true // bool |  (optional) (default to false)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.TracesAPI.GetTraceByIdV1TracesTraceIdGet(context.Background(), traceId).IncludePayload(includePayload).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TracesAPI.GetTraceByIdV1TracesTraceIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetTraceByIdV1TracesTraceIdGet`: TraceMetadata
	fmt.Fprintf(os.Stdout, "Response from `TracesAPI.GetTraceByIdV1TracesTraceIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**traceId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetTraceByIdV1TracesTraceIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **includePayload** | **bool** |  | [default to false]
 **xProjectId** | **string** |  | 

### Return type

[**TraceMetadata**](TraceMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetTracesV1TracesGet

> []TraceMetadata GetTracesV1TracesGet(ctx).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()

Get Traces

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
	limit := int32(56) // int32 |  (optional) (default to 50)
	offset := int32(56) // int32 |  (optional) (default to 0)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.TracesAPI.GetTracesV1TracesGet(context.Background()).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TracesAPI.GetTracesV1TracesGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetTracesV1TracesGet`: []TraceMetadata
	fmt.Fprintf(os.Stdout, "Response from `TracesAPI.GetTracesV1TracesGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetTracesV1TracesGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** |  | [default to 50]
 **offset** | **int32** |  | [default to 0]
 **xProjectId** | **string** |  | 

### Return type

[**[]TraceMetadata**](TraceMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostTraceV1TracesPost

> TraceMetadata PostTraceV1TracesPost(ctx).Body(body).XProjectId(xProjectId).Execute()

Post Trace

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
	body := interface{}(987) // interface{} | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.TracesAPI.PostTraceV1TracesPost(context.Background()).Body(body).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TracesAPI.PostTraceV1TracesPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostTraceV1TracesPost`: TraceMetadata
	fmt.Fprintf(os.Stdout, "Response from `TracesAPI.PostTraceV1TracesPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostTraceV1TracesPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **body** | **interface{}** |  | 
 **xProjectId** | **string** |  | 

### Return type

[**TraceMetadata**](TraceMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

