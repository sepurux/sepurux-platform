# \ProjectsAPI

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**GetProjectsV1ProjectsGet**](ProjectsAPI.md#GetProjectsV1ProjectsGet) | **Get** /v1/projects | Get Projects
[**PostProjectV1ProjectsPost**](ProjectsAPI.md#PostProjectV1ProjectsPost) | **Post** /v1/projects | Post Project



## GetProjectsV1ProjectsGet

> []ProjectMetadata GetProjectsV1ProjectsGet(ctx).Execute()

Get Projects

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
	resp, r, err := apiClient.ProjectsAPI.GetProjectsV1ProjectsGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ProjectsAPI.GetProjectsV1ProjectsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `GetProjectsV1ProjectsGet`: []ProjectMetadata
	fmt.Fprintf(os.Stdout, "Response from `ProjectsAPI.GetProjectsV1ProjectsGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiGetProjectsV1ProjectsGetRequest struct via the builder pattern


### Return type

[**[]ProjectMetadata**](ProjectMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## PostProjectV1ProjectsPost

> ProjectMetadata PostProjectV1ProjectsPost(ctx).ProjectCreateRequest(projectCreateRequest).Execute()

Post Project

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
	projectCreateRequest := *openapiclient.NewProjectCreateRequest("Name_example") // ProjectCreateRequest | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ProjectsAPI.PostProjectV1ProjectsPost(context.Background()).ProjectCreateRequest(projectCreateRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ProjectsAPI.PostProjectV1ProjectsPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `PostProjectV1ProjectsPost`: ProjectMetadata
	fmt.Fprintf(os.Stdout, "Response from `ProjectsAPI.PostProjectV1ProjectsPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiPostProjectV1ProjectsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **projectCreateRequest** | [**ProjectCreateRequest**](ProjectCreateRequest.md) |  | 

### Return type

[**ProjectMetadata**](ProjectMetadata.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

