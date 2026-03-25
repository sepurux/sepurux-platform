# UserNotificationItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**NotificationId** | **string** |  | 
**TenantId** | **string** |  | 
**ProjectId** | **string** |  | 
**UserId** | Pointer to **NullableString** |  | [optional] 
**EventType** | **string** |  | 
**Severity** | **string** |  | 
**Title** | **string** |  | 
**Message** | **string** |  | 
**LinkUrl** | Pointer to **NullableString** |  | [optional] 
**Metadata** | Pointer to **map[string]interface{}** |  | [optional] 
**ReadAt** | Pointer to **NullableTime** |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewUserNotificationItem

`func NewUserNotificationItem(notificationId string, tenantId string, projectId string, eventType string, severity string, title string, message string, createdAt time.Time, ) *UserNotificationItem`

NewUserNotificationItem instantiates a new UserNotificationItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUserNotificationItemWithDefaults

`func NewUserNotificationItemWithDefaults() *UserNotificationItem`

NewUserNotificationItemWithDefaults instantiates a new UserNotificationItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetNotificationId

`func (o *UserNotificationItem) GetNotificationId() string`

GetNotificationId returns the NotificationId field if non-nil, zero value otherwise.

### GetNotificationIdOk

`func (o *UserNotificationItem) GetNotificationIdOk() (*string, bool)`

GetNotificationIdOk returns a tuple with the NotificationId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNotificationId

`func (o *UserNotificationItem) SetNotificationId(v string)`

SetNotificationId sets NotificationId field to given value.


### GetTenantId

`func (o *UserNotificationItem) GetTenantId() string`

GetTenantId returns the TenantId field if non-nil, zero value otherwise.

### GetTenantIdOk

`func (o *UserNotificationItem) GetTenantIdOk() (*string, bool)`

GetTenantIdOk returns a tuple with the TenantId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTenantId

`func (o *UserNotificationItem) SetTenantId(v string)`

SetTenantId sets TenantId field to given value.


### GetProjectId

`func (o *UserNotificationItem) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *UserNotificationItem) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *UserNotificationItem) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetUserId

`func (o *UserNotificationItem) GetUserId() string`

GetUserId returns the UserId field if non-nil, zero value otherwise.

### GetUserIdOk

`func (o *UserNotificationItem) GetUserIdOk() (*string, bool)`

GetUserIdOk returns a tuple with the UserId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUserId

`func (o *UserNotificationItem) SetUserId(v string)`

SetUserId sets UserId field to given value.

### HasUserId

`func (o *UserNotificationItem) HasUserId() bool`

HasUserId returns a boolean if a field has been set.

### SetUserIdNil

`func (o *UserNotificationItem) SetUserIdNil(b bool)`

 SetUserIdNil sets the value for UserId to be an explicit nil

### UnsetUserId
`func (o *UserNotificationItem) UnsetUserId()`

UnsetUserId ensures that no value is present for UserId, not even an explicit nil
### GetEventType

`func (o *UserNotificationItem) GetEventType() string`

GetEventType returns the EventType field if non-nil, zero value otherwise.

### GetEventTypeOk

`func (o *UserNotificationItem) GetEventTypeOk() (*string, bool)`

GetEventTypeOk returns a tuple with the EventType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventType

`func (o *UserNotificationItem) SetEventType(v string)`

SetEventType sets EventType field to given value.


### GetSeverity

`func (o *UserNotificationItem) GetSeverity() string`

GetSeverity returns the Severity field if non-nil, zero value otherwise.

### GetSeverityOk

`func (o *UserNotificationItem) GetSeverityOk() (*string, bool)`

GetSeverityOk returns a tuple with the Severity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeverity

`func (o *UserNotificationItem) SetSeverity(v string)`

SetSeverity sets Severity field to given value.


### GetTitle

`func (o *UserNotificationItem) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *UserNotificationItem) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *UserNotificationItem) SetTitle(v string)`

SetTitle sets Title field to given value.


### GetMessage

`func (o *UserNotificationItem) GetMessage() string`

GetMessage returns the Message field if non-nil, zero value otherwise.

### GetMessageOk

`func (o *UserNotificationItem) GetMessageOk() (*string, bool)`

GetMessageOk returns a tuple with the Message field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMessage

`func (o *UserNotificationItem) SetMessage(v string)`

SetMessage sets Message field to given value.


### GetLinkUrl

`func (o *UserNotificationItem) GetLinkUrl() string`

GetLinkUrl returns the LinkUrl field if non-nil, zero value otherwise.

### GetLinkUrlOk

`func (o *UserNotificationItem) GetLinkUrlOk() (*string, bool)`

GetLinkUrlOk returns a tuple with the LinkUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLinkUrl

`func (o *UserNotificationItem) SetLinkUrl(v string)`

SetLinkUrl sets LinkUrl field to given value.

### HasLinkUrl

`func (o *UserNotificationItem) HasLinkUrl() bool`

HasLinkUrl returns a boolean if a field has been set.

### SetLinkUrlNil

`func (o *UserNotificationItem) SetLinkUrlNil(b bool)`

 SetLinkUrlNil sets the value for LinkUrl to be an explicit nil

### UnsetLinkUrl
`func (o *UserNotificationItem) UnsetLinkUrl()`

UnsetLinkUrl ensures that no value is present for LinkUrl, not even an explicit nil
### GetMetadata

`func (o *UserNotificationItem) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *UserNotificationItem) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *UserNotificationItem) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *UserNotificationItem) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetReadAt

`func (o *UserNotificationItem) GetReadAt() time.Time`

GetReadAt returns the ReadAt field if non-nil, zero value otherwise.

### GetReadAtOk

`func (o *UserNotificationItem) GetReadAtOk() (*time.Time, bool)`

GetReadAtOk returns a tuple with the ReadAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReadAt

`func (o *UserNotificationItem) SetReadAt(v time.Time)`

SetReadAt sets ReadAt field to given value.

### HasReadAt

`func (o *UserNotificationItem) HasReadAt() bool`

HasReadAt returns a boolean if a field has been set.

### SetReadAtNil

`func (o *UserNotificationItem) SetReadAtNil(b bool)`

 SetReadAtNil sets the value for ReadAt to be an explicit nil

### UnsetReadAt
`func (o *UserNotificationItem) UnsetReadAt()`

UnsetReadAt ensures that no value is present for ReadAt, not even an explicit nil
### GetCreatedAt

`func (o *UserNotificationItem) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *UserNotificationItem) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *UserNotificationItem) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


