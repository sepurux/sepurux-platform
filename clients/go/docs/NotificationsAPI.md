# \NotificationsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetNotificationsV1NotificationsGet**](NotificationsAPI.md#GetNotificationsV1NotificationsGet) | **Get** /v1/notifications | Get Notifications
[**PostMarkAllNotificationsReadV1NotificationsReadAllPost**](NotificationsAPI.md#PostMarkAllNotificationsReadV1NotificationsReadAllPost) | **Post** /v1/notifications/read-all | Post Mark All Notifications Read
[**PostMarkNotificationReadV1NotificationsNotificationIdReadPost**](NotificationsAPI.md#PostMarkNotificationReadV1NotificationsNotificationIdReadPost) | **Post** /v1/notifications/{notification_id}/read | Post Mark Notification Read



## GetNotificationsV1NotificationsGet

> UserNotificationInboxResponse GetNotificationsV1NotificationsGet(ctx).Limit(limit).Offset(offset).UnreadOnly(unreadOnly).XProjectId(xProjectId).Execute()

Get Notifications

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
	limit := int32(56) // int32 |  (optional) (default to 20)
	offset := int32(56) // int32 |  (optional) (default to 0)
	unreadOnly := true // bool |  (optional) (default to false)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.NotificationsAPI.GetNotificationsV1NotificationsGet(context.Background()).Limit(limit).Offset(offset).UnreadOnly(unreadOnly).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NotificationsAPI.GetNotificationsV1NotificationsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetNotificationsV1NotificationsGet`: UserNotificationInboxResponse
	fmt.Fprintf(os.Stdout, "Response from `NotificationsAPI.GetNotificationsV1NotificationsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetNotificationsV1NotificationsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** |  | [default to 20]
 **offset** | **int32** |  | [default to 0]
 **unreadOnly** | **bool** |  | [default to false]
 **xProjectId** | **string** |  | 

### Return type

[**UserNotificationInboxResponse**](UserNotificationInboxResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostMarkAllNotificationsReadV1NotificationsReadAllPost

> UserNotificationReadAllResponse PostMarkAllNotificationsReadV1NotificationsReadAllPost(ctx).XProjectId(xProjectId).Execute()

Post Mark All Notifications Read

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
	resp, r, err := apiClient.NotificationsAPI.PostMarkAllNotificationsReadV1NotificationsReadAllPost(context.Background()).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NotificationsAPI.PostMarkAllNotificationsReadV1NotificationsReadAllPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostMarkAllNotificationsReadV1NotificationsReadAllPost`: UserNotificationReadAllResponse
	fmt.Fprintf(os.Stdout, "Response from `NotificationsAPI.PostMarkAllNotificationsReadV1NotificationsReadAllPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostMarkAllNotificationsReadV1NotificationsReadAllPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xProjectId** | **string** |  | 

### Return type

[**UserNotificationReadAllResponse**](UserNotificationReadAllResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostMarkNotificationReadV1NotificationsNotificationIdReadPost

> UserNotificationItem PostMarkNotificationReadV1NotificationsNotificationIdReadPost(ctx, notificationId).XProjectId(xProjectId).Execute()

Post Mark Notification Read

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
	notificationId := "38400000-8cf0-11bd-b23e-10b96e4ef00d" // string | 
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.NotificationsAPI.PostMarkNotificationReadV1NotificationsNotificationIdReadPost(context.Background(), notificationId).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `NotificationsAPI.PostMarkNotificationReadV1NotificationsNotificationIdReadPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostMarkNotificationReadV1NotificationsNotificationIdReadPost`: UserNotificationItem
	fmt.Fprintf(os.Stdout, "Response from `NotificationsAPI.PostMarkNotificationReadV1NotificationsNotificationIdReadPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**notificationId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiPostMarkNotificationReadV1NotificationsNotificationIdReadPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **xProjectId** | **string** |  | 

### Return type

[**UserNotificationItem**](UserNotificationItem.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

