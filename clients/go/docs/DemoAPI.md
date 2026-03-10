# \DemoAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetDemoInfoDemoInfoGet**](DemoAPI.md#GetDemoInfoDemoInfoGet) | **Get** /demo/info | Get Demo Info
[**PostDemoSessionDemoSessionPost**](DemoAPI.md#PostDemoSessionDemoSessionPost) | **Post** /demo/session | Post Demo Session



## GetDemoInfoDemoInfoGet

> DemoInfoResponse GetDemoInfoDemoInfoGet(ctx).Execute()

Get Demo Info

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

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DemoAPI.GetDemoInfoDemoInfoGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DemoAPI.GetDemoInfoDemoInfoGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetDemoInfoDemoInfoGet`: DemoInfoResponse
	fmt.Fprintf(os.Stdout, "Response from `DemoAPI.GetDemoInfoDemoInfoGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetDemoInfoDemoInfoGetRequest struct via the builder pattern


### Return type

[**DemoInfoResponse**](DemoInfoResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostDemoSessionDemoSessionPost

> DemoSessionResponse PostDemoSessionDemoSessionPost(ctx).Execute()

Post Demo Session

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

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.DemoAPI.PostDemoSessionDemoSessionPost(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `DemoAPI.PostDemoSessionDemoSessionPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostDemoSessionDemoSessionPost`: DemoSessionResponse
	fmt.Fprintf(os.Stdout, "Response from `DemoAPI.PostDemoSessionDemoSessionPost`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiPostDemoSessionDemoSessionPostRequest struct via the builder pattern


### Return type

[**DemoSessionResponse**](DemoSessionResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

