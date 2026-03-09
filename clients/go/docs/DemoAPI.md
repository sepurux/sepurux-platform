# \DemoAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetDemoInfoDemoInfoGet**](DemoAPI.md#GetDemoInfoDemoInfoGet) | **Get** /demo/info | Get Demo Info



## GetDemoInfoDemoInfoGet

> map[string]interface{} GetDemoInfoDemoInfoGet(ctx).Execute()

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
	// response from `GetDemoInfoDemoInfoGet`: map[string]interface{}
	fmt.Fprintf(os.Stdout, "Response from `DemoAPI.GetDemoInfoDemoInfoGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetDemoInfoDemoInfoGetRequest struct via the builder pattern


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

