# \BillingAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetBillingCreditsV1BillingCreditsGet**](BillingAPI.md#GetBillingCreditsV1BillingCreditsGet) | **Get** /v1/billing/credits | Get Billing Credits
[**GetBillingPlansV1BillingPlansGet**](BillingAPI.md#GetBillingPlansV1BillingPlansGet) | **Get** /v1/billing/plans | Get Billing Plans
[**GetBillingSubscriptionV1BillingSubscriptionGet**](BillingAPI.md#GetBillingSubscriptionV1BillingSubscriptionGet) | **Get** /v1/billing/subscription | Get Billing Subscription
[**PostBillingPortalV1BillingPortalPost**](BillingAPI.md#PostBillingPortalV1BillingPortalPost) | **Post** /v1/billing/portal | Post Billing Portal
[**PostBillingSubscribeV1BillingSubscribePost**](BillingAPI.md#PostBillingSubscribeV1BillingSubscribePost) | **Post** /v1/billing/subscribe | Post Billing Subscribe
[**PostBillingTopupV1BillingTopupPost**](BillingAPI.md#PostBillingTopupV1BillingTopupPost) | **Post** /v1/billing/topup | Post Billing Topup



## GetBillingCreditsV1BillingCreditsGet

> CreditWalletMetadata GetBillingCreditsV1BillingCreditsGet(ctx).XProjectId(xProjectId).Execute()

Get Billing Credits

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
	resp, r, err := apiClient.BillingAPI.GetBillingCreditsV1BillingCreditsGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BillingAPI.GetBillingCreditsV1BillingCreditsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetBillingCreditsV1BillingCreditsGet`: CreditWalletMetadata
	fmt.Fprintf(os.Stdout, "Response from `BillingAPI.GetBillingCreditsV1BillingCreditsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetBillingCreditsV1BillingCreditsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**CreditWalletMetadata**](CreditWalletMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetBillingPlansV1BillingPlansGet

> []SubscriptionPlanMetadata GetBillingPlansV1BillingPlansGet(ctx).XProjectId(xProjectId).Execute()

Get Billing Plans

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
	resp, r, err := apiClient.BillingAPI.GetBillingPlansV1BillingPlansGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BillingAPI.GetBillingPlansV1BillingPlansGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetBillingPlansV1BillingPlansGet`: []SubscriptionPlanMetadata
	fmt.Fprintf(os.Stdout, "Response from `BillingAPI.GetBillingPlansV1BillingPlansGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetBillingPlansV1BillingPlansGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**[]SubscriptionPlanMetadata**](SubscriptionPlanMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetBillingSubscriptionV1BillingSubscriptionGet

> UserSubscriptionMetadata GetBillingSubscriptionV1BillingSubscriptionGet(ctx).XProjectId(xProjectId).Execute()

Get Billing Subscription

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
	resp, r, err := apiClient.BillingAPI.GetBillingSubscriptionV1BillingSubscriptionGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BillingAPI.GetBillingSubscriptionV1BillingSubscriptionGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetBillingSubscriptionV1BillingSubscriptionGet`: UserSubscriptionMetadata
	fmt.Fprintf(os.Stdout, "Response from `BillingAPI.GetBillingSubscriptionV1BillingSubscriptionGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetBillingSubscriptionV1BillingSubscriptionGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**UserSubscriptionMetadata**](UserSubscriptionMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostBillingPortalV1BillingPortalPost

> BillingRedirectSessionResponse PostBillingPortalV1BillingPortalPost(ctx).XProjectId(xProjectId).Execute()

Post Billing Portal

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
	resp, r, err := apiClient.BillingAPI.PostBillingPortalV1BillingPortalPost(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BillingAPI.PostBillingPortalV1BillingPortalPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostBillingPortalV1BillingPortalPost`: BillingRedirectSessionResponse
	fmt.Fprintf(os.Stdout, "Response from `BillingAPI.PostBillingPortalV1BillingPortalPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostBillingPortalV1BillingPortalPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**BillingRedirectSessionResponse**](BillingRedirectSessionResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostBillingSubscribeV1BillingSubscribePost

> BillingRedirectSessionResponse PostBillingSubscribeV1BillingSubscribePost(ctx).BillingSubscribeRequest(billingSubscribeRequest).XProjectId(xProjectId).Execute()

Post Billing Subscribe

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
	billingSubscribeRequest := *openapiclient.NewBillingSubscribeRequest("PlanId_example") // BillingSubscribeRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.BillingAPI.PostBillingSubscribeV1BillingSubscribePost(context.Background()).BillingSubscribeRequest(billingSubscribeRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BillingAPI.PostBillingSubscribeV1BillingSubscribePost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostBillingSubscribeV1BillingSubscribePost`: BillingRedirectSessionResponse
	fmt.Fprintf(os.Stdout, "Response from `BillingAPI.PostBillingSubscribeV1BillingSubscribePost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostBillingSubscribeV1BillingSubscribePostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **billingSubscribeRequest** | [**BillingSubscribeRequest**](BillingSubscribeRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**BillingRedirectSessionResponse**](BillingRedirectSessionResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostBillingTopupV1BillingTopupPost

> BillingRedirectSessionResponse PostBillingTopupV1BillingTopupPost(ctx).BillingTopupRequest(billingTopupRequest).XProjectId(xProjectId).Execute()

Post Billing Topup

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
	billingTopupRequest := *openapiclient.NewBillingTopupRequest(int32(123)) // BillingTopupRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.BillingAPI.PostBillingTopupV1BillingTopupPost(context.Background()).BillingTopupRequest(billingTopupRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `BillingAPI.PostBillingTopupV1BillingTopupPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostBillingTopupV1BillingTopupPost`: BillingRedirectSessionResponse
	fmt.Fprintf(os.Stdout, "Response from `BillingAPI.PostBillingTopupV1BillingTopupPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostBillingTopupV1BillingTopupPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **billingTopupRequest** | [**BillingTopupRequest**](BillingTopupRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**BillingRedirectSessionResponse**](BillingRedirectSessionResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

