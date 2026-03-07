# WebhookMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**WebhookId** | **string** |  | 
**ProjectId** | **string** |  | 
**Url** | **string** |  | 
**IsEnabled** | **bool** |  | 
**Events** | **[]string** |  | 
**CreatedAt** | **time.Time** |  | 
**LastSuccessAt** | Pointer to **NullableTime** |  | [optional] 
**LastError** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewWebhookMetadata

`func NewWebhookMetadata(webhookId string, projectId string, url string, isEnabled bool, events []string, createdAt time.Time, ) *WebhookMetadata`

NewWebhookMetadata instantiates a new WebhookMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewWebhookMetadataWithDefaults

`func NewWebhookMetadataWithDefaults() *WebhookMetadata`

NewWebhookMetadataWithDefaults instantiates a new WebhookMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetWebhookId

`func (o *WebhookMetadata) GetWebhookId() string`

GetWebhookId returns the WebhookId field if non-nil, zero value otherwise.

### GetWebhookIdOk

`func (o *WebhookMetadata) GetWebhookIdOk() (*string, bool)`

GetWebhookIdOk returns a tuple with the WebhookId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWebhookId

`func (o *WebhookMetadata) SetWebhookId(v string)`

SetWebhookId sets WebhookId field to given value.


### GetProjectId

`func (o *WebhookMetadata) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *WebhookMetadata) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *WebhookMetadata) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetUrl

`func (o *WebhookMetadata) GetUrl() string`

GetUrl returns the Url field if non-nil, zero value otherwise.

### GetUrlOk

`func (o *WebhookMetadata) GetUrlOk() (*string, bool)`

GetUrlOk returns a tuple with the Url field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrl

`func (o *WebhookMetadata) SetUrl(v string)`

SetUrl sets Url field to given value.


### GetIsEnabled

`func (o *WebhookMetadata) GetIsEnabled() bool`

GetIsEnabled returns the IsEnabled field if non-nil, zero value otherwise.

### GetIsEnabledOk

`func (o *WebhookMetadata) GetIsEnabledOk() (*bool, bool)`

GetIsEnabledOk returns a tuple with the IsEnabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsEnabled

`func (o *WebhookMetadata) SetIsEnabled(v bool)`

SetIsEnabled sets IsEnabled field to given value.


### GetEvents

`func (o *WebhookMetadata) GetEvents() []string`

GetEvents returns the Events field if non-nil, zero value otherwise.

### GetEventsOk

`func (o *WebhookMetadata) GetEventsOk() (*[]string, bool)`

GetEventsOk returns a tuple with the Events field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvents

`func (o *WebhookMetadata) SetEvents(v []string)`

SetEvents sets Events field to given value.


### GetCreatedAt

`func (o *WebhookMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *WebhookMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *WebhookMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.


### GetLastSuccessAt

`func (o *WebhookMetadata) GetLastSuccessAt() time.Time`

GetLastSuccessAt returns the LastSuccessAt field if non-nil, zero value otherwise.

### GetLastSuccessAtOk

`func (o *WebhookMetadata) GetLastSuccessAtOk() (*time.Time, bool)`

GetLastSuccessAtOk returns a tuple with the LastSuccessAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastSuccessAt

`func (o *WebhookMetadata) SetLastSuccessAt(v time.Time)`

SetLastSuccessAt sets LastSuccessAt field to given value.

### HasLastSuccessAt

`func (o *WebhookMetadata) HasLastSuccessAt() bool`

HasLastSuccessAt returns a boolean if a field has been set.

### SetLastSuccessAtNil

`func (o *WebhookMetadata) SetLastSuccessAtNil(b bool)`

 SetLastSuccessAtNil sets the value for LastSuccessAt to be an explicit nil

### UnsetLastSuccessAt
`func (o *WebhookMetadata) UnsetLastSuccessAt()`

UnsetLastSuccessAt ensures that no value is present for LastSuccessAt, not even an explicit nil
### GetLastError

`func (o *WebhookMetadata) GetLastError() string`

GetLastError returns the LastError field if non-nil, zero value otherwise.

### GetLastErrorOk

`func (o *WebhookMetadata) GetLastErrorOk() (*string, bool)`

GetLastErrorOk returns a tuple with the LastError field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastError

`func (o *WebhookMetadata) SetLastError(v string)`

SetLastError sets LastError field to given value.

### HasLastError

`func (o *WebhookMetadata) HasLastError() bool`

HasLastError returns a boolean if a field has been set.

### SetLastErrorNil

`func (o *WebhookMetadata) SetLastErrorNil(b bool)`

 SetLastErrorNil sets the value for LastError to be an explicit nil

### UnsetLastError
`func (o *WebhookMetadata) UnsetLastError()`

UnsetLastError ensures that no value is present for LastError, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


