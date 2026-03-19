# \AuthAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetAuthSessionV1AuthSessionGet**](AuthAPI.md#GetAuthSessionV1AuthSessionGet) | **Get** /v1/auth/session | Get Auth Session
[**GetOauthCallbackAuthOauthProviderCallbackGet**](AuthAPI.md#GetOauthCallbackAuthOauthProviderCallbackGet) | **Get** /auth/oauth/{provider}/callback | Get Oauth Callback
[**GetOauthStartAuthOauthProviderStartGet**](AuthAPI.md#GetOauthStartAuthOauthProviderStartGet) | **Get** /auth/oauth/{provider}/start | Get Oauth Start
[**PostForgotPasswordAuthForgotPasswordPost**](AuthAPI.md#PostForgotPasswordAuthForgotPasswordPost) | **Post** /auth/forgot-password | Post Forgot Password
[**PostLoginAuthLoginPost**](AuthAPI.md#PostLoginAuthLoginPost) | **Post** /auth/login | Post Login
[**PostOauthExchangeAuthOauthExchangePost**](AuthAPI.md#PostOauthExchangeAuthOauthExchangePost) | **Post** /auth/oauth/exchange | Post Oauth Exchange
[**PostResetPasswordAuthResetPasswordPost**](AuthAPI.md#PostResetPasswordAuthResetPasswordPost) | **Post** /auth/reset-password | Post Reset Password
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


## GetOauthCallbackAuthOauthProviderCallbackGet

> interface{} GetOauthCallbackAuthOauthProviderCallbackGet(ctx, provider).State(state).Code(code).Error_(error_).Execute()

Get Oauth Callback

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
	provider := "provider_example" // string | 
	state := "state_example" // string |  (optional)
	code := "code_example" // string |  (optional)
	error_ := "error__example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuthAPI.GetOauthCallbackAuthOauthProviderCallbackGet(context.Background(), provider).State(state).Code(code).Error_(error_).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.GetOauthCallbackAuthOauthProviderCallbackGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetOauthCallbackAuthOauthProviderCallbackGet`: interface{}
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.GetOauthCallbackAuthOauthProviderCallbackGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**provider** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetOauthCallbackAuthOauthProviderCallbackGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **state** | **string** |  | 
 **code** | **string** |  | 
 **error_** | **string** |  | 

### Return type

**interface{}**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetOauthStartAuthOauthProviderStartGet

> interface{} GetOauthStartAuthOauthProviderStartGet(ctx, provider).Next(next).Execute()

Get Oauth Start

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
	provider := "provider_example" // string | 
	next := "next_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuthAPI.GetOauthStartAuthOauthProviderStartGet(context.Background(), provider).Next(next).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.GetOauthStartAuthOauthProviderStartGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetOauthStartAuthOauthProviderStartGet`: interface{}
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.GetOauthStartAuthOauthProviderStartGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**provider** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetOauthStartAuthOauthProviderStartGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **next** | **string** |  | 

### Return type

**interface{}**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostForgotPasswordAuthForgotPasswordPost

> OperationMessageResponse PostForgotPasswordAuthForgotPasswordPost(ctx).ForgotPasswordRequest(forgotPasswordRequest).Execute()

Post Forgot Password

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
	forgotPasswordRequest := *openapiclient.NewForgotPasswordRequest("Email_example") // ForgotPasswordRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuthAPI.PostForgotPasswordAuthForgotPasswordPost(context.Background()).ForgotPasswordRequest(forgotPasswordRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.PostForgotPasswordAuthForgotPasswordPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostForgotPasswordAuthForgotPasswordPost`: OperationMessageResponse
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.PostForgotPasswordAuthForgotPasswordPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostForgotPasswordAuthForgotPasswordPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **forgotPasswordRequest** | [**ForgotPasswordRequest**](ForgotPasswordRequest.md) |  | 

### Return type

[**OperationMessageResponse**](OperationMessageResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
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


## PostOauthExchangeAuthOauthExchangePost

> AuthSessionResponse PostOauthExchangeAuthOauthExchangePost(ctx).OAuthSessionExchangeRequest(oAuthSessionExchangeRequest).Execute()

Post Oauth Exchange

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
	oAuthSessionExchangeRequest := *openapiclient.NewOAuthSessionExchangeRequest("Token_example") // OAuthSessionExchangeRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuthAPI.PostOauthExchangeAuthOauthExchangePost(context.Background()).OAuthSessionExchangeRequest(oAuthSessionExchangeRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.PostOauthExchangeAuthOauthExchangePost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostOauthExchangeAuthOauthExchangePost`: AuthSessionResponse
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.PostOauthExchangeAuthOauthExchangePost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostOauthExchangeAuthOauthExchangePostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **oAuthSessionExchangeRequest** | [**OAuthSessionExchangeRequest**](OAuthSessionExchangeRequest.md) |  | 

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


## PostResetPasswordAuthResetPasswordPost

> OperationMessageResponse PostResetPasswordAuthResetPasswordPost(ctx).ResetPasswordRequest(resetPasswordRequest).Execute()

Post Reset Password

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
	resetPasswordRequest := *openapiclient.NewResetPasswordRequest("Token_example", "Password_example") // ResetPasswordRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuthAPI.PostResetPasswordAuthResetPasswordPost(context.Background()).ResetPasswordRequest(resetPasswordRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuthAPI.PostResetPasswordAuthResetPasswordPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostResetPasswordAuthResetPasswordPost`: OperationMessageResponse
	fmt.Fprintf(os.Stdout, "Response from `AuthAPI.PostResetPasswordAuthResetPasswordPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostResetPasswordAuthResetPasswordPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **resetPasswordRequest** | [**ResetPasswordRequest**](ResetPasswordRequest.md) |  | 

### Return type

[**OperationMessageResponse**](OperationMessageResponse.md)

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

