# \ApiKeysAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetApiKeysV1ApiKeysGet**](ApiKeysAPI.md#GetApiKeysV1ApiKeysGet) | **Get** /v1/api-keys | Get Api Keys
[**PostApiKeyV1ApiKeysPost**](ApiKeysAPI.md#PostApiKeyV1ApiKeysPost) | **Post** /v1/api-keys | Post Api Key



## GetApiKeysV1ApiKeysGet

> []ApiKeyMetadata GetApiKeysV1ApiKeysGet(ctx).Execute()

Get Api Keys

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

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ApiKeysAPI.GetApiKeysV1ApiKeysGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ApiKeysAPI.GetApiKeysV1ApiKeysGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetApiKeysV1ApiKeysGet`: []ApiKeyMetadata
	fmt.Fprintf(os.Stdout, "Response from `ApiKeysAPI.GetApiKeysV1ApiKeysGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetApiKeysV1ApiKeysGetRequest struct via the builder pattern


### Return type

[**[]ApiKeyMetadata**](ApiKeyMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostApiKeyV1ApiKeysPost

> ApiKeyCreateResponse PostApiKeyV1ApiKeysPost(ctx).ApiKeyCreateRequest(apiKeyCreateRequest).Execute()

Post Api Key

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
	apiKeyCreateRequest := *openapiclient.NewApiKeyCreateRequest("Name_example") // ApiKeyCreateRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ApiKeysAPI.PostApiKeyV1ApiKeysPost(context.Background()).ApiKeyCreateRequest(apiKeyCreateRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ApiKeysAPI.PostApiKeyV1ApiKeysPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostApiKeyV1ApiKeysPost`: ApiKeyCreateResponse
	fmt.Fprintf(os.Stdout, "Response from `ApiKeysAPI.PostApiKeyV1ApiKeysPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostApiKeyV1ApiKeysPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKeyCreateRequest** | [**ApiKeyCreateRequest**](ApiKeyCreateRequest.md) |  | 

### Return type

[**ApiKeyCreateResponse**](ApiKeyCreateResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

