# \ComplianceAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetComplianceSummaryV1ComplianceSummaryGet**](ComplianceAPI.md#GetComplianceSummaryV1ComplianceSummaryGet) | **Get** /v1/compliance/summary | Get Compliance Summary



## GetComplianceSummaryV1ComplianceSummaryGet

> ComplianceSummaryResponse GetComplianceSummaryV1ComplianceSummaryGet(ctx).WindowDays(windowDays).TopN(topN).XProjectId(xProjectId).Execute()

Get Compliance Summary

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
	windowDays := int32(56) // int32 |  (optional) (default to 30)
	topN := int32(56) // int32 |  (optional) (default to 5)
	xProjectId := "xProjectId_example" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ComplianceAPI.GetComplianceSummaryV1ComplianceSummaryGet(context.Background()).WindowDays(windowDays).TopN(topN).XProjectId(xProjectId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ComplianceAPI.GetComplianceSummaryV1ComplianceSummaryGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetComplianceSummaryV1ComplianceSummaryGet`: ComplianceSummaryResponse
	fmt.Fprintf(os.Stdout, "Response from `ComplianceAPI.GetComplianceSummaryV1ComplianceSummaryGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiGetComplianceSummaryV1ComplianceSummaryGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **windowDays** | **int32** |  | [default to 30]
 **topN** | **int32** |  | [default to 5]
 **xProjectId** | **string** |  | 

### Return type

[**ComplianceSummaryResponse**](ComplianceSummaryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

