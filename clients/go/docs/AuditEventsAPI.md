# \AuditEventsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetAuditEventsV1AuditEventsGet**](AuditEventsAPI.md#GetAuditEventsV1AuditEventsGet) | **Get** /v1/audit-events | Get Audit Events



## GetAuditEventsV1AuditEventsGet

> []AuditEventListItem GetAuditEventsV1AuditEventsGet(ctx).Limit(limit).Offset(offset).EventType(eventType).XProjectId(xProjectId).Execute()

Get Audit Events

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
	eventType := "eventType_example" // string |  (optional)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.AuditEventsAPI.GetAuditEventsV1AuditEventsGet(context.Background()).Limit(limit).Offset(offset).EventType(eventType).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `AuditEventsAPI.GetAuditEventsV1AuditEventsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetAuditEventsV1AuditEventsGet`: []AuditEventListItem
	fmt.Fprintf(os.Stdout, "Response from `AuditEventsAPI.GetAuditEventsV1AuditEventsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetAuditEventsV1AuditEventsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **int32** |  | [default to 50]
 **offset** | **int32** |  | [default to 0]
 **eventType** | **string** |  | 
 **xProjectId** | **string** |  | 

### Return type

[**[]AuditEventListItem**](AuditEventListItem.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

