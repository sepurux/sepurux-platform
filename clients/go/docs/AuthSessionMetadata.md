# AuthSessionMetadata

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

## Methods

### NewAuthSessionMetadata

`func NewAuthSessionMetadata(tenantId string, projectId string, projectName string, roleName string, permissions AuthPermissionSet, ) *AuthSessionMetadata`

NewAuthSessionMetadata instantiates a new AuthSessionMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuthSessionMetadataWithDefaults

`func NewAuthSessionMetadataWithDefaults() *AuthSessionMetadata`

NewAuthSessionMetadataWithDefaults instantiates a new AuthSessionMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTenantId

`func (o *AuthSessionMetadata) GetTenantId() string`

GetTenantId returns the TenantId field if non-nil, zero value otherwise.

### GetTenantIdOk

`func (o *AuthSessionMetadata) GetTenantIdOk() (*string, bool)`

GetTenantIdOk returns a tuple with the TenantId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTenantId

`func (o *AuthSessionMetadata) SetTenantId(v string)`

SetTenantId sets TenantId field to given value.


### GetProjectId

`func (o *AuthSessionMetadata) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *AuthSessionMetadata) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *AuthSessionMetadata) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetProjectName

`func (o *AuthSessionMetadata) GetProjectName() string`

GetProjectName returns the ProjectName field if non-nil, zero value otherwise.

### GetProjectNameOk

`func (o *AuthSessionMetadata) GetProjectNameOk() (*string, bool)`

GetProjectNameOk returns a tuple with the ProjectName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectName

`func (o *AuthSessionMetadata) SetProjectName(v string)`

SetProjectName sets ProjectName field to given value.


### GetProjectScoped

`func (o *AuthSessionMetadata) GetProjectScoped() bool`

GetProjectScoped returns the ProjectScoped field if non-nil, zero value otherwise.

### GetProjectScopedOk

`func (o *AuthSessionMetadata) GetProjectScopedOk() (*bool, bool)`

GetProjectScopedOk returns a tuple with the ProjectScoped field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectScoped

`func (o *AuthSessionMetadata) SetProjectScoped(v bool)`

SetProjectScoped sets ProjectScoped field to given value.

### HasProjectScoped

`func (o *AuthSessionMetadata) HasProjectScoped() bool`

HasProjectScoped returns a boolean if a field has been set.

### GetRoleName

`func (o *AuthSessionMetadata) GetRoleName() string`

GetRoleName returns the RoleName field if non-nil, zero value otherwise.

### GetRoleNameOk

`func (o *AuthSessionMetadata) GetRoleNameOk() (*string, bool)`

GetRoleNameOk returns a tuple with the RoleName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoleName

`func (o *AuthSessionMetadata) SetRoleName(v string)`

SetRoleName sets RoleName field to given value.


### GetUserId

`func (o *AuthSessionMetadata) GetUserId() string`

GetUserId returns the UserId field if non-nil, zero value otherwise.

### GetUserIdOk

`func (o *AuthSessionMetadata) GetUserIdOk() (*string, bool)`

GetUserIdOk returns a tuple with the UserId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUserId

`func (o *AuthSessionMetadata) SetUserId(v string)`

SetUserId sets UserId field to given value.

### HasUserId

`func (o *AuthSessionMetadata) HasUserId() bool`

HasUserId returns a boolean if a field has been set.

### SetUserIdNil

`func (o *AuthSessionMetadata) SetUserIdNil(b bool)`

 SetUserIdNil sets the value for UserId to be an explicit nil

### UnsetUserId
`func (o *AuthSessionMetadata) UnsetUserId()`

UnsetUserId ensures that no value is present for UserId, not even an explicit nil
### GetEmail

`func (o *AuthSessionMetadata) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *AuthSessionMetadata) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *AuthSessionMetadata) SetEmail(v string)`

SetEmail sets Email field to given value.

### HasEmail

`func (o *AuthSessionMetadata) HasEmail() bool`

HasEmail returns a boolean if a field has been set.

### SetEmailNil

`func (o *AuthSessionMetadata) SetEmailNil(b bool)`

 SetEmailNil sets the value for Email to be an explicit nil

### UnsetEmail
`func (o *AuthSessionMetadata) UnsetEmail()`

UnsetEmail ensures that no value is present for Email, not even an explicit nil
### GetName

`func (o *AuthSessionMetadata) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *AuthSessionMetadata) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *AuthSessionMetadata) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *AuthSessionMetadata) HasName() bool`

HasName returns a boolean if a field has been set.

### SetNameNil

`func (o *AuthSessionMetadata) SetNameNil(b bool)`

 SetNameNil sets the value for Name to be an explicit nil

### UnsetName
`func (o *AuthSessionMetadata) UnsetName()`

UnsetName ensures that no value is present for Name, not even an explicit nil
### GetIsDemo

`func (o *AuthSessionMetadata) GetIsDemo() bool`

GetIsDemo returns the IsDemo field if non-nil, zero value otherwise.

### GetIsDemoOk

`func (o *AuthSessionMetadata) GetIsDemoOk() (*bool, bool)`

GetIsDemoOk returns a tuple with the IsDemo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsDemo

`func (o *AuthSessionMetadata) SetIsDemo(v bool)`

SetIsDemo sets IsDemo field to given value.

### HasIsDemo

`func (o *AuthSessionMetadata) HasIsDemo() bool`

HasIsDemo returns a boolean if a field has been set.

### GetPermissions

`func (o *AuthSessionMetadata) GetPermissions() AuthPermissionSet`

GetPermissions returns the Permissions field if non-nil, zero value otherwise.

### GetPermissionsOk

`func (o *AuthSessionMetadata) GetPermissionsOk() (*AuthPermissionSet, bool)`

GetPermissionsOk returns a tuple with the Permissions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermissions

`func (o *AuthSessionMetadata) SetPermissions(v AuthPermissionSet)`

SetPermissions sets Permissions field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


