# \MembersAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**InviteMemberV1MembersPost**](MembersAPI.md#InviteMemberV1MembersPost) | **Post** /v1/members | Invite Member
[**ListMembersV1MembersGet**](MembersAPI.md#ListMembersV1MembersGet) | **Get** /v1/members | List Members
[**RemoveMemberV1MembersUserIdDelete**](MembersAPI.md#RemoveMemberV1MembersUserIdDelete) | **Delete** /v1/members/{user_id} | Remove Member



## InviteMemberV1MembersPost

> MemberMetadata InviteMemberV1MembersPost(ctx).MemberInviteRequest(memberInviteRequest).XProjectId(xProjectId).Execute()

Invite Member

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
	memberInviteRequest := *openapiclient.NewMemberInviteRequest("Email_example") // MemberInviteRequest | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.MembersAPI.InviteMemberV1MembersPost(context.Background()).MemberInviteRequest(memberInviteRequest).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MembersAPI.InviteMemberV1MembersPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `InviteMemberV1MembersPost`: MemberMetadata
	fmt.Fprintf(os.Stdout, "Response from `MembersAPI.InviteMemberV1MembersPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiInviteMemberV1MembersPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **memberInviteRequest** | [**MemberInviteRequest**](MemberInviteRequest.md) |  | 
 **xProjectId** | **string** |  | 

### Return type

[**MemberMetadata**](MemberMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ListMembersV1MembersGet

> []MemberMetadata ListMembersV1MembersGet(ctx).XProjectId(xProjectId).Execute()

List Members

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
	resp, r, err := apiClient.MembersAPI.ListMembersV1MembersGet(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MembersAPI.ListMembersV1MembersGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ListMembersV1MembersGet`: []MemberMetadata
	fmt.Fprintf(os.Stdout, "Response from `MembersAPI.ListMembersV1MembersGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListMembersV1MembersGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**[]MemberMetadata**](MemberMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## RemoveMemberV1MembersUserIdDelete

> RemoveMemberV1MembersUserIdDelete(ctx, userId).XProjectId(xProjectId).Execute()

Remove Member

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
	userId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.MembersAPI.RemoveMemberV1MembersUserIdDelete(context.Background(), userId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MembersAPI.RemoveMemberV1MembersUserIdDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**userId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiRemoveMemberV1MembersUserIdDeleteRequest struct via the builder pattern


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

