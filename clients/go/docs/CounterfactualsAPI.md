# \CounterfactualsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet**](CounterfactualsAPI.md#GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet) | **Get** /v1/attempts/{attempt_id}/counterfactuals | Get Attempt Counterfactuals
[**GetCounterfactualV1CounterfactualsCounterfactualIdGet**](CounterfactualsAPI.md#GetCounterfactualV1CounterfactualsCounterfactualIdGet) | **Get** /v1/counterfactuals/{counterfactual_id} | Get Counterfactual



## GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet

> []CounterfactualListItem GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet(ctx, attemptId).XProjectId(xProjectId).Execute()

Get Attempt Counterfactuals

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
	attemptId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CounterfactualsAPI.GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet(context.Background(), attemptId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CounterfactualsAPI.GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet`: []CounterfactualListItem
	fmt.Fprintf(os.Stdout, "Response from `CounterfactualsAPI.GetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**attemptId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetAttemptCounterfactualsV1AttemptsAttemptIdCounterfactualsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**[]CounterfactualListItem**](CounterfactualListItem.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetCounterfactualV1CounterfactualsCounterfactualIdGet

> CounterfactualMetadata GetCounterfactualV1CounterfactualsCounterfactualIdGet(ctx, counterfactualId).XProjectId(xProjectId).Execute()

Get Counterfactual

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
	counterfactualId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CounterfactualsAPI.GetCounterfactualV1CounterfactualsCounterfactualIdGet(context.Background(), counterfactualId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CounterfactualsAPI.GetCounterfactualV1CounterfactualsCounterfactualIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetCounterfactualV1CounterfactualsCounterfactualIdGet`: CounterfactualMetadata
	fmt.Fprintf(os.Stdout, "Response from `CounterfactualsAPI.GetCounterfactualV1CounterfactualsCounterfactualIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**counterfactualId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetCounterfactualV1CounterfactualsCounterfactualIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**CounterfactualMetadata**](CounterfactualMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

