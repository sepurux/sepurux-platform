# \CampaignsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetCampaignV1CampaignsCampaignIdGet**](CampaignsAPI.md#GetCampaignV1CampaignsCampaignIdGet) | **Get** /v1/campaigns/{campaign_id} | Get Campaign
[**GetCampaignsV1CampaignsGet**](CampaignsAPI.md#GetCampaignsV1CampaignsGet) | **Get** /v1/campaigns | Get Campaigns
[**PostCampaignRunPackV1CampaignsCampaignIdRunPackPost**](CampaignsAPI.md#PostCampaignRunPackV1CampaignsCampaignIdRunPackPost) | **Post** /v1/campaigns/{campaign_id}/run-pack | Post Campaign Run Pack
[**PostCampaignV1CampaignsPost**](CampaignsAPI.md#PostCampaignV1CampaignsPost) | **Post** /v1/campaigns | Post Campaign



## GetCampaignV1CampaignsCampaignIdGet

> CampaignMetadata GetCampaignV1CampaignsCampaignIdGet(ctx, campaignId).XProjectId(xProjectId).Execute()

Get Campaign

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
	campaignId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CampaignsAPI.GetCampaignV1CampaignsCampaignIdGet(context.Background(), campaignId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CampaignsAPI.GetCampaignV1CampaignsCampaignIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetCampaignV1CampaignsCampaignIdGet`: CampaignMetadata
	fmt.Fprintf(os.Stdout, "Response from `CampaignsAPI.GetCampaignV1CampaignsCampaignIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**campaignId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetCampaignV1CampaignsCampaignIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**CampaignMetadata**](CampaignMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetCampaignsV1CampaignsGet

> []CampaignMetadata GetCampaignsV1CampaignsGet(ctx).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()

Get Campaigns

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
	resp, r, err := apiClient.CampaignsAPI.GetCampaignsV1CampaignsGet(context.Background()).Limit(limit).Offset(offset).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CampaignsAPI.GetCampaignsV1CampaignsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetCampaignsV1CampaignsGet`: []CampaignMetadata
	fmt.Fprintf(os.Stdout, "Response from `CampaignsAPI.GetCampaignsV1CampaignsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetCampaignsV1CampaignsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** |  | [default to 50]
 **offset** | **int32** |  | [default to 0]
 **xProjectId** | **string** |  | 

### Return type

[**[]CampaignMetadata**](CampaignMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostCampaignRunPackV1CampaignsCampaignIdRunPackPost

> CampaignRunPackResponse PostCampaignRunPackV1CampaignsCampaignIdRunPackPost(ctx, campaignId).CampaignRunPackRequest(campaignRunPackRequest).XProjectId(xProjectId).Execute()

Post Campaign Run Pack

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
	campaignId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	campaignRunPackRequest := *openapiclient.NewCampaignRunPackRequest("Pack_example") // CampaignRunPackRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CampaignsAPI.PostCampaignRunPackV1CampaignsCampaignIdRunPackPost(context.Background(), campaignId).CampaignRunPackRequest(campaignRunPackRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CampaignsAPI.PostCampaignRunPackV1CampaignsCampaignIdRunPackPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostCampaignRunPackV1CampaignsCampaignIdRunPackPost`: CampaignRunPackResponse
	fmt.Fprintf(os.Stdout, "Response from `CampaignsAPI.PostCampaignRunPackV1CampaignsCampaignIdRunPackPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**campaignId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPostCampaignRunPackV1CampaignsCampaignIdRunPackPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **campaignRunPackRequest** | [**CampaignRunPackRequest**](CampaignRunPackRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**CampaignRunPackResponse**](CampaignRunPackResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostCampaignV1CampaignsPost

> CampaignMetadata PostCampaignV1CampaignsPost(ctx).CampaignCreateRequest(campaignCreateRequest).XProjectId(xProjectId).Execute()

Post Campaign

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
	campaignCreateRequest := *openapiclient.NewCampaignCreateRequest("Name_example", interface{}(123), interface{}(123)) // CampaignCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.CampaignsAPI.PostCampaignV1CampaignsPost(context.Background()).CampaignCreateRequest(campaignCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `CampaignsAPI.PostCampaignV1CampaignsPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostCampaignV1CampaignsPost`: CampaignMetadata
	fmt.Fprintf(os.Stdout, "Response from `CampaignsAPI.PostCampaignV1CampaignsPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostCampaignV1CampaignsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **campaignCreateRequest** | [**CampaignCreateRequest**](CampaignCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**CampaignMetadata**](CampaignMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

