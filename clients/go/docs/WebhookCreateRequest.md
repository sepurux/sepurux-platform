# WebhookCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Url** | **string** |  | 
**Events** | Pointer to **[]string** |  | [optional] 
**IsEnabled** | Pointer to **bool** |  | [optional] [default to true]

## Methods

### NewWebhookCreateRequest

`func NewWebhookCreateRequest(url string, ) *WebhookCreateRequest`

NewWebhookCreateRequest instantiates a new WebhookCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewWebhookCreateRequestWithDefaults

`func NewWebhookCreateRequestWithDefaults() *WebhookCreateRequest`

NewWebhookCreateRequestWithDefaults instantiates a new WebhookCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetUrl

`func (o *WebhookCreateRequest) GetUrl() string`

GetUrl returns the Url field if non-nil, zero value otherwise.

### GetUrlOk

`func (o *WebhookCreateRequest) GetUrlOk() (*string, bool)`

GetUrlOk returns a tuple with the Url field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrl

`func (o *WebhookCreateRequest) SetUrl(v string)`

SetUrl sets Url field to given value.


### GetEvents

`func (o *WebhookCreateRequest) GetEvents() []string`

GetEvents returns the Events field if non-nil, zero value otherwise.

### GetEventsOk

`func (o *WebhookCreateRequest) GetEventsOk() (*[]string, bool)`

GetEventsOk returns a tuple with the Events field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvents

`func (o *WebhookCreateRequest) SetEvents(v []string)`

SetEvents sets Events field to given value.

### HasEvents

`func (o *WebhookCreateRequest) HasEvents() bool`

HasEvents returns a boolean if a field has been set.

### GetIsEnabled

`func (o *WebhookCreateRequest) GetIsEnabled() bool`

GetIsEnabled returns the IsEnabled field if non-nil, zero value otherwise.

### GetIsEnabledOk

`func (o *WebhookCreateRequest) GetIsEnabledOk() (*bool, bool)`

GetIsEnabledOk returns a tuple with the IsEnabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsEnabled

`func (o *WebhookCreateRequest) SetIsEnabled(v bool)`

SetIsEnabled sets IsEnabled field to given value.

### HasIsEnabled

`func (o *WebhookCreateRequest) HasIsEnabled() bool`

HasIsEnabled returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


