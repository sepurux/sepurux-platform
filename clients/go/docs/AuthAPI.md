# \AuthAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetAuthSessionV1AuthSessionGet**](AuthAPI.md#GetAuthSessionV1AuthSessionGet) | **Get** /v1/auth/session | Get Auth Session
[**PostLoginAuthLoginPost**](AuthAPI.md#PostLoginAuthLoginPost) | **Post** /auth/login | Post Login
[**PostSignupAuthSignupPost**](AuthAPI.md#PostSignupAuthSignupPost) | **Post** /auth/signup | Post Signup



## GetAuthSessionV1AuthSessionGet

> AuthSessionMetadata GetAuthSessionV1AuthSessionGet(ctx).XProjectId(xProjectId).Execute()

Get Auth Session

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
	resp, r, err := apiClient.AuthAPI.GetAuthSessionV1AuthSessionGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.GetAuthSessionV1AuthSessionGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetAuthSessionV1AuthSessionGet`: AuthSessionMetadata
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.GetAuthSessionV1AuthSessionGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetAuthSessionV1AuthSessionGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**AuthSessionMetadata**](AuthSessionMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostLoginAuthLoginPost

> AuthSessionResponse PostLoginAuthLoginPost(ctx).LoginRequest(loginRequest).Execute()

Post Login

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
	loginRequest := *openapiclient.NewLoginRequest("Email_example", "Password_example") // LoginRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuthAPI.PostLoginAuthLoginPost(context.Background()).LoginRequest(loginRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.PostLoginAuthLoginPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostLoginAuthLoginPost`: AuthSessionResponse
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.PostLoginAuthLoginPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostLoginAuthLoginPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **loginRequest** | [**LoginRequest**](LoginRequest.md) |  | 

### Return type

[**AuthSessionResponse**](AuthSessionResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostSignupAuthSignupPost

> AuthSessionResponse PostSignupAuthSignupPost(ctx).SignupRequest(signupRequest).Execute()

Post Signup

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
	signupRequest := *openapiclient.NewSignupRequest("Email_example", "Password_example") // SignupRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuthAPI.PostSignupAuthSignupPost(context.Background()).SignupRequest(signupRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.PostSignupAuthSignupPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostSignupAuthSignupPost`: AuthSessionResponse
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.PostSignupAuthSignupPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostSignupAuthSignupPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **signupRequest** | [**SignupRequest**](SignupRequest.md) |  | 

### Return type

[**AuthSessionResponse**](AuthSessionResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

