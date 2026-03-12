# \ToolsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetToolRegistryEntriesV1ToolsGet**](ToolsAPI.md#GetToolRegistryEntriesV1ToolsGet) | **Get** /v1/tools | Get Tool Registry Entries
[**PatchToolRegistryEntryV1ToolsToolIdPatch**](ToolsAPI.md#PatchToolRegistryEntryV1ToolsToolIdPatch) | **Patch** /v1/tools/{tool_id} | Patch Tool Registry Entry
[**PostToolRegistryEntryV1ToolsPost**](ToolsAPI.md#PostToolRegistryEntryV1ToolsPost) | **Post** /v1/tools | Post Tool Registry Entry



## GetToolRegistryEntriesV1ToolsGet

> []ToolRegistryMetadata GetToolRegistryEntriesV1ToolsGet(ctx).XProjectId(xProjectId).Execute()

Get Tool Registry Entries

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
	resp, r, err := apiClient.ToolsAPI.GetToolRegistryEntriesV1ToolsGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ToolsAPI.GetToolRegistryEntriesV1ToolsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetToolRegistryEntriesV1ToolsGet`: []ToolRegistryMetadata
	fmt.Fprintf(os.Stdout, "Response from `ToolsAPI.GetToolRegistryEntriesV1ToolsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetToolRegistryEntriesV1ToolsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**[]ToolRegistryMetadata**](ToolRegistryMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PatchToolRegistryEntryV1ToolsToolIdPatch

> ToolRegistryMetadata PatchToolRegistryEntryV1ToolsToolIdPatch(ctx, toolId).ToolRegistryZoneUpdateRequest(toolRegistryZoneUpdateRequest).XProjectId(xProjectId).Execute()

Patch Tool Registry Entry

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
	toolId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	toolRegistryZoneUpdateRequest := *openapiclient.NewToolRegistryZoneUpdateRequest("Zone_example") // ToolRegistryZoneUpdateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ToolsAPI.PatchToolRegistryEntryV1ToolsToolIdPatch(context.Background(), toolId).ToolRegistryZoneUpdateRequest(toolRegistryZoneUpdateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ToolsAPI.PatchToolRegistryEntryV1ToolsToolIdPatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PatchToolRegistryEntryV1ToolsToolIdPatch`: ToolRegistryMetadata
	fmt.Fprintf(os.Stdout, "Response from `ToolsAPI.PatchToolRegistryEntryV1ToolsToolIdPatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**toolId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPatchToolRegistryEntryV1ToolsToolIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **toolRegistryZoneUpdateRequest** | [**ToolRegistryZoneUpdateRequest**](ToolRegistryZoneUpdateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**ToolRegistryMetadata**](ToolRegistryMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostToolRegistryEntryV1ToolsPost

> ToolRegistryMetadata PostToolRegistryEntryV1ToolsPost(ctx).ToolRegistryCreateRequest(toolRegistryCreateRequest).XProjectId(xProjectId).Execute()

Post Tool Registry Entry

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
	toolRegistryCreateRequest := *openapiclient.NewToolRegistryCreateRequest("Name_example") // ToolRegistryCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ToolsAPI.PostToolRegistryEntryV1ToolsPost(context.Background()).ToolRegistryCreateRequest(toolRegistryCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ToolsAPI.PostToolRegistryEntryV1ToolsPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostToolRegistryEntryV1ToolsPost`: ToolRegistryMetadata
	fmt.Fprintf(os.Stdout, "Response from `ToolsAPI.PostToolRegistryEntryV1ToolsPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostToolRegistryEntryV1ToolsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **toolRegistryCreateRequest** | [**ToolRegistryCreateRequest**](ToolRegistryCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**ToolRegistryMetadata**](ToolRegistryMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

