# \PolicyPacksAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**DeletePolicyPackV1PolicyPacksPolicyPackIdDelete**](PolicyPacksAPI.md#DeletePolicyPackV1PolicyPacksPolicyPackIdDelete) | **Delete** /v1/policy-packs/{policy_pack_id} | Delete Policy Pack
[**GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet**](PolicyPacksAPI.md#GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet) | **Get** /v1/policy-packs/{policy_pack_id} | Get Policy Pack By Id
[**GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet**](PolicyPacksAPI.md#GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet) | **Get** /v1/policy-packs/{policy_pack_id}/versions | Get Policy Pack Versions
[**GetPolicyPacksV1PolicyPacksGet**](PolicyPacksAPI.md#GetPolicyPacksV1PolicyPacksGet) | **Get** /v1/policy-packs | Get Policy Packs
[**PatchPolicyPackV1PolicyPacksPolicyPackIdPatch**](PolicyPacksAPI.md#PatchPolicyPackV1PolicyPacksPolicyPackIdPatch) | **Patch** /v1/policy-packs/{policy_pack_id} | Patch Policy Pack
[**PatchPolicyPackV1PolicyPacksPolicyPackIdPut**](PolicyPacksAPI.md#PatchPolicyPackV1PolicyPacksPolicyPackIdPut) | **Put** /v1/policy-packs/{policy_pack_id} | Patch Policy Pack
[**PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost**](PolicyPacksAPI.md#PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost) | **Post** /v1/policy-packs/{policy_pack_id}/rollback | Post Policy Pack Rollback
[**PostPolicyPackV1PolicyPacksPost**](PolicyPacksAPI.md#PostPolicyPackV1PolicyPacksPost) | **Post** /v1/policy-packs | Post Policy Pack



## DeletePolicyPackV1PolicyPacksPolicyPackIdDelete

> DeletePolicyPackV1PolicyPacksPolicyPackIdDelete(ctx, policyPackId).XProjectId(xProjectId).Execute()

Delete Policy Pack

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
	policyPackId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.PolicyPacksAPI.DeletePolicyPackV1PolicyPacksPolicyPackIdDelete(context.Background(), policyPackId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.DeletePolicyPackV1PolicyPacksPolicyPackIdDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**policyPackId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiDeletePolicyPackV1PolicyPacksPolicyPackIdDeleteRequest struct via the builder pattern


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


## GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet

> PolicyPackMetadata GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet(ctx, policyPackId).IncludeArchived(includeArchived).XProjectId(xProjectId).Execute()

Get Policy Pack By Id

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
	policyPackId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	includeArchived := true // bool |  (optional) (default to false)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.PolicyPacksAPI.GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet(context.Background(), policyPackId).IncludeArchived(includeArchived).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet`: PolicyPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `PolicyPacksAPI.GetPolicyPackByIdV1PolicyPacksPolicyPackIdGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**policyPackId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetPolicyPackByIdV1PolicyPacksPolicyPackIdGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **includeArchived** | **bool** |  | [default to false]
 **xProjectId** | **string** |  | 

### Return type

[**PolicyPackMetadata**](PolicyPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet

> []PolicyPackVersionMetadata GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet(ctx, policyPackId).XProjectId(xProjectId).Execute()

Get Policy Pack Versions

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
	policyPackId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.PolicyPacksAPI.GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet(context.Background(), policyPackId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet`: []PolicyPackVersionMetadata
	fmt.Fprintf(os.Stdout, "Response from `PolicyPacksAPI.GetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**policyPackId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetPolicyPackVersionsV1PolicyPacksPolicyPackIdVersionsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**[]PolicyPackVersionMetadata**](PolicyPackVersionMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetPolicyPacksV1PolicyPacksGet

> []PolicyPackMetadata GetPolicyPacksV1PolicyPacksGet(ctx).IncludeArchived(includeArchived).XProjectId(xProjectId).Execute()

Get Policy Packs

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
	includeArchived := true // bool |  (optional) (default to false)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.PolicyPacksAPI.GetPolicyPacksV1PolicyPacksGet(context.Background()).IncludeArchived(includeArchived).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.GetPolicyPacksV1PolicyPacksGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetPolicyPacksV1PolicyPacksGet`: []PolicyPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `PolicyPacksAPI.GetPolicyPacksV1PolicyPacksGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetPolicyPacksV1PolicyPacksGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **includeArchived** | **bool** |  | [default to false]
 **xProjectId** | **string** |  | 

### Return type

[**[]PolicyPackMetadata**](PolicyPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PatchPolicyPackV1PolicyPacksPolicyPackIdPatch

> PolicyPackMetadata PatchPolicyPackV1PolicyPacksPolicyPackIdPatch(ctx, policyPackId).PolicyPackUpdateRequest(policyPackUpdateRequest).XProjectId(xProjectId).Execute()

Patch Policy Pack

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
	policyPackId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	policyPackUpdateRequest := *openapiclient.NewPolicyPackUpdateRequest(interface{}(123)) // PolicyPackUpdateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.PolicyPacksAPI.PatchPolicyPackV1PolicyPacksPolicyPackIdPatch(context.Background(), policyPackId).PolicyPackUpdateRequest(policyPackUpdateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.PatchPolicyPackV1PolicyPacksPolicyPackIdPatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PatchPolicyPackV1PolicyPacksPolicyPackIdPatch`: PolicyPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `PolicyPacksAPI.PatchPolicyPackV1PolicyPacksPolicyPackIdPatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**policyPackId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPatchPolicyPackV1PolicyPacksPolicyPackIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **policyPackUpdateRequest** | [**PolicyPackUpdateRequest**](PolicyPackUpdateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**PolicyPackMetadata**](PolicyPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PatchPolicyPackV1PolicyPacksPolicyPackIdPut

> PolicyPackMetadata PatchPolicyPackV1PolicyPacksPolicyPackIdPut(ctx, policyPackId).PolicyPackUpdateRequest(policyPackUpdateRequest).XProjectId(xProjectId).Execute()

Patch Policy Pack

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
	policyPackId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	policyPackUpdateRequest := *openapiclient.NewPolicyPackUpdateRequest(interface{}(123)) // PolicyPackUpdateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.PolicyPacksAPI.PatchPolicyPackV1PolicyPacksPolicyPackIdPut(context.Background(), policyPackId).PolicyPackUpdateRequest(policyPackUpdateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.PatchPolicyPackV1PolicyPacksPolicyPackIdPut``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PatchPolicyPackV1PolicyPacksPolicyPackIdPut`: PolicyPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `PolicyPacksAPI.PatchPolicyPackV1PolicyPacksPolicyPackIdPut`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**policyPackId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPatchPolicyPackV1PolicyPacksPolicyPackIdPutRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **policyPackUpdateRequest** | [**PolicyPackUpdateRequest**](PolicyPackUpdateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**PolicyPackMetadata**](PolicyPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost

> PolicyPackMetadata PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost(ctx, policyPackId).PolicyPackRollbackRequest(policyPackRollbackRequest).XProjectId(xProjectId).Execute()

Post Policy Pack Rollback

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
	policyPackId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	policyPackRollbackRequest := *openapiclient.NewPolicyPackRollbackRequest(int32(123)) // PolicyPackRollbackRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.PolicyPacksAPI.PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost(context.Background(), policyPackId).PolicyPackRollbackRequest(policyPackRollbackRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost`: PolicyPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `PolicyPacksAPI.PostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**policyPackId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPostPolicyPackRollbackV1PolicyPacksPolicyPackIdRollbackPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **policyPackRollbackRequest** | [**PolicyPackRollbackRequest**](PolicyPackRollbackRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**PolicyPackMetadata**](PolicyPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostPolicyPackV1PolicyPacksPost

> PolicyPackMetadata PostPolicyPackV1PolicyPacksPost(ctx).PolicyPackCreateRequest(policyPackCreateRequest).XProjectId(xProjectId).Execute()

Post Policy Pack

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
	policyPackCreateRequest := *openapiclient.NewPolicyPackCreateRequest("Name_example", interface{}(123)) // PolicyPackCreateRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.PolicyPacksAPI.PostPolicyPackV1PolicyPacksPost(context.Background()).PolicyPackCreateRequest(policyPackCreateRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PolicyPacksAPI.PostPolicyPackV1PolicyPacksPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostPolicyPackV1PolicyPacksPost`: PolicyPackMetadata
	fmt.Fprintf(os.Stdout, "Response from `PolicyPacksAPI.PostPolicyPackV1PolicyPacksPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostPolicyPackV1PolicyPacksPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **policyPackCreateRequest** | [**PolicyPackCreateRequest**](PolicyPackCreateRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**PolicyPackMetadata**](PolicyPackMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

