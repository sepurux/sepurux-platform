# \ScheduledCampaignsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**DeleteScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdDelete**](ScheduledCampaignsAPI.md#DeleteScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdDelete) | **Delete** /v1/scheduled-campaigns/{scheduled_campaign_id} | Delete Scheduled Campaign By Id
[**GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet**](ScheduledCampaignsAPI.md#GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet) | **Get** /v1/scheduled-campaigns/{scheduled_campaign_id} | Get Scheduled Campaign By Id
[**GetScheduledCampaignsV1ScheduledCampaignsGet**](ScheduledCampaignsAPI.md#GetScheduledCampaignsV1ScheduledCampaignsGet) | **Get** /v1/scheduled-campaigns | Get Scheduled Campaigns
[**PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch**](ScheduledCampaignsAPI.md#PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch) | **Patch** /v1/scheduled-campaigns/{scheduled_campaign_id} | Patch Scheduled Campaign
[**PostScheduledCampaignV1ScheduledCampaignsPost**](ScheduledCampaignsAPI.md#PostScheduledCampaignV1ScheduledCampaignsPost) | **Post** /v1/scheduled-campaigns | Post Scheduled Campaign



## DeleteScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdDelete

> DeleteScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdDelete(ctx, scheduledCampaignId).XProjectId(xProjectId).Execute()

Delete Scheduled Campaign By Id

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
	scheduledCampaignId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.ScheduledCampaignsAPI.DeleteScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdDelete(context.Background(), scheduledCampaignId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ScheduledCampaignsAPI.DeleteScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**scheduledCampaignId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiDeleteScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdDeleteRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

 (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet

> ScheduledCampaignMetadata GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet(ctx, scheduledCampaignId).XProjectId(xProjectId).Execute()

Get Scheduled Campaign By Id

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
	scheduledCampaignId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ScheduledCampaignsAPI.GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet(context.Background(), scheduledCampaignId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ScheduledCampaignsAPI.GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet`: ScheduledCampaignMetadata
	fmt.Fprintf(os.Stdout, "Response from `ScheduledCampaignsAPI.GetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**scheduledCampaignId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetScheduledCampaignByIdV1ScheduledCampaignsScheduledCampaignIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**ScheduledCampaignMetadata**](ScheduledCampaignMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetScheduledCampaignsV1ScheduledCampaignsGet

> []ScheduledCampaignMetadata GetScheduledCampaignsV1ScheduledCampaignsGet(ctx).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()

Get Scheduled Campaigns

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
	limit := int32(56) // int32 |  (optional) (default to 50)
	offset := int32(56) // int32 |  (optional) (default to 0)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ScheduledCampaignsAPI.GetScheduledCampaignsV1ScheduledCampaignsGet(context.Background()).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ScheduledCampaignsAPI.GetScheduledCampaignsV1ScheduledCampaignsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetScheduledCampaignsV1ScheduledCampaignsGet`: []ScheduledCampaignMetadata
	fmt.Fprintf(os.Stdout, "Response from `ScheduledCampaignsAPI.GetScheduledCampaignsV1ScheduledCampaignsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetScheduledCampaignsV1ScheduledCampaignsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** |  | [default to 50]
 **offset** | **int32** |  | [default to 0]
 **xProjectId** | **string** |  | 

### Return type

[**[]ScheduledCampaignMetadata**](ScheduledCampaignMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch

> ScheduledCampaignMetadata PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch(ctx, scheduledCampaignId).ScheduledCampaignUpdateRequest(scheduledCampaignUpdateRequest).XProjectId(xProjectId).Execute()

Patch Scheduled Campaign

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
	scheduledCampaignId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	scheduledCampaignUpdateRequest := *openapiclient.NewScheduledCampaignUpdateRequest() // ScheduledCampaignUpdateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ScheduledCampaignsAPI.PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch(context.Background(), scheduledCampaignId).ScheduledCampaignUpdateRequest(scheduledCampaignUpdateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ScheduledCampaignsAPI.PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch`: ScheduledCampaignMetadata
	fmt.Fprintf(os.Stdout, "Response from `ScheduledCampaignsAPI.PatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**scheduledCampaignId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPatchScheduledCampaignV1ScheduledCampaignsScheduledCampaignIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **scheduledCampaignUpdateRequest** | [**ScheduledCampaignUpdateRequest**](ScheduledCampaignUpdateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**ScheduledCampaignMetadata**](ScheduledCampaignMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostScheduledCampaignV1ScheduledCampaignsPost

> ScheduledCampaignMetadata PostScheduledCampaignV1ScheduledCampaignsPost(ctx).ScheduledCampaignCreateRequest(scheduledCampaignCreateRequest).XProjectId(xProjectId).Execute()

Post Scheduled Campaign

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
	scheduledCampaignCreateRequest := *openapiclient.NewScheduledCampaignCreateRequest("CampaignId_example", "MutationPackId_example", "CronSchedule_example") // ScheduledCampaignCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ScheduledCampaignsAPI.PostScheduledCampaignV1ScheduledCampaignsPost(context.Background()).ScheduledCampaignCreateRequest(scheduledCampaignCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ScheduledCampaignsAPI.PostScheduledCampaignV1ScheduledCampaignsPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostScheduledCampaignV1ScheduledCampaignsPost`: ScheduledCampaignMetadata
	fmt.Fprintf(os.Stdout, "Response from `ScheduledCampaignsAPI.PostScheduledCampaignV1ScheduledCampaignsPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostScheduledCampaignV1ScheduledCampaignsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **scheduledCampaignCreateRequest** | [**ScheduledCampaignCreateRequest**](ScheduledCampaignCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**ScheduledCampaignMetadata**](ScheduledCampaignMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

