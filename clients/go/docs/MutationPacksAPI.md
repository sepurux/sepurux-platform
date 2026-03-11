# \MutationPacksAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**DeleteMutationPackByIdV1MutationPacksMutationPackIdDelete**](MutationPacksAPI.md#DeleteMutationPackByIdV1MutationPacksMutationPackIdDelete) | **Delete** /v1/mutation-packs/{mutation_pack_id} | Delete Mutation Pack By Id
[**GetMutationPackByIdV1MutationPacksPackRefGet**](MutationPacksAPI.md#GetMutationPackByIdV1MutationPacksPackRefGet) | **Get** /v1/mutation-packs/{pack_ref} | Get Mutation Pack By Id
[**GetMutationPackCoverageV1MutationPacksPackRefCoverageGet**](MutationPacksAPI.md#GetMutationPackCoverageV1MutationPacksPackRefCoverageGet) | **Get** /v1/mutation-packs/{pack_ref}/coverage | Get Mutation Pack Coverage
[**GetMutationPacksV1MutationPacksGet**](MutationPacksAPI.md#GetMutationPacksV1MutationPacksGet) | **Get** /v1/mutation-packs | Get Mutation Packs
[**PostMutationPackV1MutationPacksPost**](MutationPacksAPI.md#PostMutationPackV1MutationPacksPost) | **Post** /v1/mutation-packs | Post Mutation Pack



## DeleteMutationPackByIdV1MutationPacksMutationPackIdDelete

> DeleteMutationPackByIdV1MutationPacksMutationPackIdDelete(ctx, mutationPackId).XProjectId(xProjectId).Execute()

Delete Mutation Pack By Id

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
	mutationPackId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.MutationPacksAPI.DeleteMutationPackByIdV1MutationPacksMutationPackIdDelete(context.Background(), mutationPackId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MutationPacksAPI.DeleteMutationPackByIdV1MutationPacksMutationPackIdDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**mutationPackId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiDeleteMutationPackByIdV1MutationPacksMutationPackIdDeleteRequest struct via the builder pattern


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


## GetMutationPackByIdV1MutationPacksPackRefGet

> MutationPackMetadata GetMutationPackByIdV1MutationPacksPackRefGet(ctx, packRef).XProjectId(xProjectId).Execute()

Get Mutation Pack By Id

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
	packRef := "packRef_example" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.MutationPacksAPI.GetMutationPackByIdV1MutationPacksPackRefGet(context.Background(), packRef).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MutationPacksAPI.GetMutationPackByIdV1MutationPacksPackRefGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetMutationPackByIdV1MutationPacksPackRefGet`: MutationPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `MutationPacksAPI.GetMutationPackByIdV1MutationPacksPackRefGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**packRef** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetMutationPackByIdV1MutationPacksPackRefGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**MutationPackMetadata**](MutationPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetMutationPackCoverageV1MutationPacksPackRefCoverageGet

> MutationPackCoverageResponse GetMutationPackCoverageV1MutationPacksPackRefCoverageGet(ctx, packRef).XProjectId(xProjectId).Execute()

Get Mutation Pack Coverage

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
	packRef := "packRef_example" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.MutationPacksAPI.GetMutationPackCoverageV1MutationPacksPackRefCoverageGet(context.Background(), packRef).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MutationPacksAPI.GetMutationPackCoverageV1MutationPacksPackRefCoverageGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetMutationPackCoverageV1MutationPacksPackRefCoverageGet`: MutationPackCoverageResponse
	fmt.Fprintf(os.Stdout, "Response from `MutationPacksAPI.GetMutationPackCoverageV1MutationPacksPackRefCoverageGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**packRef** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetMutationPackCoverageV1MutationPacksPackRefCoverageGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**MutationPackCoverageResponse**](MutationPackCoverageResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetMutationPacksV1MutationPacksGet

> []MutationPackMetadata GetMutationPacksV1MutationPacksGet(ctx).IncludeSystem(includeSystem).XProjectId(xProjectId).Execute()

Get Mutation Packs

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
	includeSystem := true // bool |  (optional) (default to true)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.MutationPacksAPI.GetMutationPacksV1MutationPacksGet(context.Background()).IncludeSystem(includeSystem).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MutationPacksAPI.GetMutationPacksV1MutationPacksGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetMutationPacksV1MutationPacksGet`: []MutationPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `MutationPacksAPI.GetMutationPacksV1MutationPacksGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetMutationPacksV1MutationPacksGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **includeSystem** | **bool** |  | [default to true]
 **xProjectId** | **string** |  | 

### Return type

[**[]MutationPackMetadata**](MutationPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostMutationPackV1MutationPacksPost

> MutationPackCreateResponse PostMutationPackV1MutationPacksPost(ctx).MutationPackCreateRequest(mutationPackCreateRequest).XProjectId(xProjectId).Execute()

Post Mutation Pack

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
	mutationPackCreateRequest := *openapiclient.NewMutationPackCreateRequest("Name_example", interface{}(123)) // MutationPackCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.MutationPacksAPI.PostMutationPackV1MutationPacksPost(context.Background()).MutationPackCreateRequest(mutationPackCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MutationPacksAPI.PostMutationPackV1MutationPacksPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostMutationPackV1MutationPacksPost`: MutationPackCreateResponse
	fmt.Fprintf(os.Stdout, "Response from `MutationPacksAPI.PostMutationPackV1MutationPacksPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostMutationPackV1MutationPacksPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **mutationPackCreateRequest** | [**MutationPackCreateRequest**](MutationPackCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**MutationPackCreateResponse**](MutationPackCreateResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

