# AuthSessionResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TenantId** | **string** |  | 
**ProjectId** | **string** |  | 
**ProjectName** | **string** |  | 
**ProjectScoped** | Pointer to **bool** |  | [optional] [default to true]
**RoleName** | **string** |  | 
**UserId** | Pointer to **NullableString** |  | [optional] 
**Email** | Pointer to **NullableString** |  | [optional] 
**Name** | Pointer to **NullableString** |  | [optional] 
**IsDemo** | Pointer to **bool** |  | [optional] [default to false]
**Permissions** | [**AuthPermissionSet**](AuthPermissionSet.md) |  | 
**ApiKey** | **string** |  | 

## Methods

### NewAuthSessionResponse

`func NewAuthSessionResponse(tenantId string, projectId string, projectName string, roleName string, permissions AuthPermissionSet, apiKey string, ) *AuthSessionResponse`

NewAuthSessionResponse instantiates a new AuthSessionResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuthSessionResponseWithDefaults

`func NewAuthSessionResponseWithDefaults() *AuthSessionResponse`

NewAuthSessionResponseWithDefaults instantiates a new AuthSessionResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTenantId

`func (o *AuthSessionResponse) GetTenantId() string`

GetTenantId returns the TenantId field if non-nil, zero value otherwise.

### GetTenantIdOk

`func (o *AuthSessionResponse) GetTenantIdOk() (*string, bool)`

GetTenantIdOk returns a tuple with the TenantId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTenantId

`func (o *AuthSessionResponse) SetTenantId(v string)`

SetTenantId sets TenantId field to given value.


### GetProjectId

`func (o *AuthSessionResponse) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *AuthSessionResponse) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *AuthSessionResponse) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetProjectName

`func (o *AuthSessionResponse) GetProjectName() string`

GetProjectName returns the ProjectName field if non-nil, zero value otherwise.

### GetProjectNameOk

`func (o *AuthSessionResponse) GetProjectNameOk() (*string, bool)`

GetProjectNameOk returns a tuple with the ProjectName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectName

`func (o *AuthSessionResponse) SetProjectName(v string)`

SetProjectName sets ProjectName field to given value.


### GetProjectScoped

`func (o *AuthSessionResponse) GetProjectScoped() bool`

GetProjectScoped returns the ProjectScoped field if non-nil, zero value otherwise.

### GetProjectScopedOk

`func (o *AuthSessionResponse) GetProjectScopedOk() (*bool, bool)`

GetProjectScopedOk returns a tuple with the ProjectScoped field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectScoped

`func (o *AuthSessionResponse) SetProjectScoped(v bool)`

SetProjectScoped sets ProjectScoped field to given value.

### HasProjectScoped

`func (o *AuthSessionResponse) HasProjectScoped() bool`

HasProjectScoped returns a boolean if a field has been set.

### GetRoleName

`func (o *AuthSessionResponse) GetRoleName() string`

GetRoleName returns the RoleName field if non-nil, zero value otherwise.

### GetRoleNameOk

`func (o *AuthSessionResponse) GetRoleNameOk() (*string, bool)`

GetRoleNameOk returns a tuple with the RoleName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoleName

`func (o *AuthSessionResponse) SetRoleName(v string)`

SetRoleName sets RoleName field to given value.


### GetUserId

`func (o *AuthSessionResponse) GetUserId() string`

GetUserId returns the UserId field if non-nil, zero value otherwise.

### GetUserIdOk

`func (o *AuthSessionResponse) GetUserIdOk() (*string, bool)`

GetUserIdOk returns a tuple with the UserId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUserId

`func (o *AuthSessionResponse) SetUserId(v string)`

SetUserId sets UserId field to given value.

### HasUserId

`func (o *AuthSessionResponse) HasUserId() bool`

HasUserId returns a boolean if a field has been set.

### SetUserIdNil

`func (o *AuthSessionResponse) SetUserIdNil(b bool)`

 SetUserIdNil sets the value for UserId to be an explicit nil

### UnsetUserId
`func (o *AuthSessionResponse) UnsetUserId()`

UnsetUserId ensures that no value is present for UserId, not even an explicit nil
### GetEmail

`func (o *AuthSessionResponse) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *AuthSessionResponse) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *AuthSessionResponse) SetEmail(v string)`

SetEmail sets Email field to given value.

### HasEmail

`func (o *AuthSessionResponse) HasEmail() bool`

HasEmail returns a boolean if a field has been set.

### SetEmailNil

`func (o *AuthSessionResponse) SetEmailNil(b bool)`

 SetEmailNil sets the value for Email to be an explicit nil

### UnsetEmail
`func (o *AuthSessionResponse) UnsetEmail()`

UnsetEmail ensures that no value is present for Email, not even an explicit nil
### GetName

`func (o *AuthSessionResponse) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *AuthSessionResponse) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *AuthSessionResponse) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *AuthSessionResponse) HasName() bool`

HasName returns a boolean if a field has been set.

### SetNameNil

`func (o *AuthSessionResponse) SetNameNil(b bool)`

 SetNameNil sets the value for Name to be an explicit nil

### UnsetName
`func (o *AuthSessionResponse) UnsetName()`

UnsetName ensures that no value is present for Name, not even an explicit nil
### GetIsDemo

`func (o *AuthSessionResponse) GetIsDemo() bool`

GetIsDemo returns the IsDemo field if non-nil, zero value otherwise.

### GetIsDemoOk

`func (o *AuthSessionResponse) GetIsDemoOk() (*bool, bool)`

GetIsDemoOk returns a tuple with the IsDemo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsDemo

`func (o *AuthSessionResponse) SetIsDemo(v bool)`

SetIsDemo sets IsDemo field to given value.

### HasIsDemo

`func (o *AuthSessionResponse) HasIsDemo() bool`

HasIsDemo returns a boolean if a field has been set.

### GetPermissions

`func (o *AuthSessionResponse) GetPermissions() AuthPermissionSet`

GetPermissions returns the Permissions field if non-nil, zero value otherwise.

### GetPermissionsOk

`func (o *AuthSessionResponse) GetPermissionsOk() (*AuthPermissionSet, bool)`

GetPermissionsOk returns a tuple with the Permissions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermissions

`func (o *AuthSessionResponse) SetPermissions(v AuthPermissionSet)`

SetPermissions sets Permissions field to given value.


### GetApiKey

`func (o *AuthSessionResponse) GetApiKey() string`

GetApiKey returns the ApiKey field if non-nil, zero value otherwise.

### GetApiKeyOk

`func (o *AuthSessionResponse) GetApiKeyOk() (*string, bool)`

GetApiKeyOk returns a tuple with the ApiKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetApiKey

`func (o *AuthSessionResponse) SetApiKey(v string)`

SetApiKey sets ApiKey field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


