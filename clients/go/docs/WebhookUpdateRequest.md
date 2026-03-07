# WebhookUpdateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Url** | Pointer to **NullableString** |  | [optional] 
**Events** | Pointer to **[]string** |  | [optional] 
**IsEnabled** | Pointer to **NullableBool** |  | [optional] 

## Methods

### NewWebhookUpdateRequest

`func NewWebhookUpdateRequest() *WebhookUpdateRequest`

NewWebhookUpdateRequest instantiates a new WebhookUpdateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewWebhookUpdateRequestWithDefaults

`func NewWebhookUpdateRequestWithDefaults() *WebhookUpdateRequest`

NewWebhookUpdateRequestWithDefaults instantiates a new WebhookUpdateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetUrl

`func (o *WebhookUpdateRequest) GetUrl() string`

GetUrl returns the Url field if non-nil, zero value otherwise.

### GetUrlOk

`func (o *WebhookUpdateRequest) GetUrlOk() (*string, bool)`

GetUrlOk returns a tuple with the Url field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrl

`func (o *WebhookUpdateRequest) SetUrl(v string)`

SetUrl sets Url field to given value.

### HasUrl

`func (o *WebhookUpdateRequest) HasUrl() bool`

HasUrl returns a boolean if a field has been set.

### SetUrlNil

`func (o *WebhookUpdateRequest) SetUrlNil(b bool)`

 SetUrlNil sets the value for Url to be an explicit nil

### UnsetUrl
`func (o *WebhookUpdateRequest) UnsetUrl()`

UnsetUrl ensures that no value is present for Url, not even an explicit nil
### GetEvents

`func (o *WebhookUpdateRequest) GetEvents() []string`

GetEvents returns the Events field if non-nil, zero value otherwise.

### GetEventsOk

`func (o *WebhookUpdateRequest) GetEventsOk() (*[]string, bool)`

GetEventsOk returns a tuple with the Events field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvents

`func (o *WebhookUpdateRequest) SetEvents(v []string)`

SetEvents sets Events field to given value.

### HasEvents

`func (o *WebhookUpdateRequest) HasEvents() bool`

HasEvents returns a boolean if a field has been set.

### SetEventsNil

`func (o *WebhookUpdateRequest) SetEventsNil(b bool)`

 SetEventsNil sets the value for Events to be an explicit nil

### UnsetEvents
`func (o *WebhookUpdateRequest) UnsetEvents()`

UnsetEvents ensures that no value is present for Events, not even an explicit nil
### GetIsEnabled

`func (o *WebhookUpdateRequest) GetIsEnabled() bool`

GetIsEnabled returns the IsEnabled field if non-nil, zero value otherwise.

### GetIsEnabledOk

`func (o *WebhookUpdateRequest) GetIsEnabledOk() (*bool, bool)`

GetIsEnabledOk returns a tuple with the IsEnabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsEnabled

`func (o *WebhookUpdateRequest) SetIsEnabled(v bool)`

SetIsEnabled sets IsEnabled field to given value.

### HasIsEnabled

`func (o *WebhookUpdateRequest) HasIsEnabled() bool`

HasIsEnabled returns a boolean if a field has been set.

### SetIsEnabledNil

`func (o *WebhookUpdateRequest) SetIsEnabledNil(b bool)`

 SetIsEnabledNil sets the value for IsEnabled to be an explicit nil

### UnsetIsEnabled
`func (o *WebhookUpdateRequest) UnsetIsEnabled()`

UnsetIsEnabled ensures that no value is present for IsEnabled, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


