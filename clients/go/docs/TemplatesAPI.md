# \TemplatesAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetTemplateByIdV1TemplatesTemplateIdGet**](TemplatesAPI.md#GetTemplateByIdV1TemplatesTemplateIdGet) | **Get** /v1/templates/{template_id} | Get Template By Id
[**GetTemplatesV1TemplatesGet**](TemplatesAPI.md#GetTemplatesV1TemplatesGet) | **Get** /v1/templates | Get Templates
[**PostTemplateV1TemplatesPost**](TemplatesAPI.md#PostTemplateV1TemplatesPost) | **Post** /v1/templates | Post Template



## GetTemplateByIdV1TemplatesTemplateIdGet

> HardeningTemplateMetadata GetTemplateByIdV1TemplatesTemplateIdGet(ctx, templateId).XProjectId(xProjectId).Execute()

Get Template By Id

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
	templateId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.TemplatesAPI.GetTemplateByIdV1TemplatesTemplateIdGet(context.Background(), templateId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TemplatesAPI.GetTemplateByIdV1TemplatesTemplateIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetTemplateByIdV1TemplatesTemplateIdGet`: HardeningTemplateMetadata
	fmt.Fprintf(os.Stdout, "Response from `TemplatesAPI.GetTemplateByIdV1TemplatesTemplateIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**templateId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetTemplateByIdV1TemplatesTemplateIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**HardeningTemplateMetadata**](HardeningTemplateMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetTemplatesV1TemplatesGet

> []HardeningTemplateMetadata GetTemplatesV1TemplatesGet(ctx).XProjectId(xProjectId).Execute()

Get Templates

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
	resp, r, err := apiClient.TemplatesAPI.GetTemplatesV1TemplatesGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TemplatesAPI.GetTemplatesV1TemplatesGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetTemplatesV1TemplatesGet`: []HardeningTemplateMetadata
	fmt.Fprintf(os.Stdout, "Response from `TemplatesAPI.GetTemplatesV1TemplatesGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetTemplatesV1TemplatesGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**[]HardeningTemplateMetadata**](HardeningTemplateMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostTemplateV1TemplatesPost

> HardeningTemplateMetadata PostTemplateV1TemplatesPost(ctx).HardeningTemplateCreateRequest(hardeningTemplateCreateRequest).XProjectId(xProjectId).Execute()

Post Template

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
	hardeningTemplateCreateRequest := *openapiclient.NewHardeningTemplateCreateRequest("Name_example", "Type_example", interface{}(123)) // HardeningTemplateCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.TemplatesAPI.PostTemplateV1TemplatesPost(context.Background()).HardeningTemplateCreateRequest(hardeningTemplateCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `TemplatesAPI.PostTemplateV1TemplatesPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostTemplateV1TemplatesPost`: HardeningTemplateMetadata
	fmt.Fprintf(os.Stdout, "Response from `TemplatesAPI.PostTemplateV1TemplatesPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostTemplateV1TemplatesPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **hardeningTemplateCreateRequest** | [**HardeningTemplateCreateRequest**](HardeningTemplateCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**HardeningTemplateMetadata**](HardeningTemplateMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

