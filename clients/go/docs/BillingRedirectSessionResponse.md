# BillingRedirectSessionResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Provider** | **string** |  | 
**Flow** | **string** |  | 
**Url** | **string** |  | 
**SessionId** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewBillingRedirectSessionResponse

`func NewBillingRedirectSessionResponse(provider string, flow string, url string, ) *BillingRedirectSessionResponse`

NewBillingRedirectSessionResponse instantiates a new BillingRedirectSessionResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewBillingRedirectSessionResponseWithDefaults

`func NewBillingRedirectSessionResponseWithDefaults() *BillingRedirectSessionResponse`

NewBillingRedirectSessionResponseWithDefaults instantiates a new BillingRedirectSessionResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetProvider

`func (o *BillingRedirectSessionResponse) GetProvider() string`

GetProvider returns the Provider field if non-nil, zero value otherwise.

### GetProviderOk

`func (o *BillingRedirectSessionResponse) GetProviderOk() (*string, bool)`

GetProviderOk returns a tuple with the Provider field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProvider

`func (o *BillingRedirectSessionResponse) SetProvider(v string)`

SetProvider sets Provider field to given value.


### GetFlow

`func (o *BillingRedirectSessionResponse) GetFlow() string`

GetFlow returns the Flow field if non-nil, zero value otherwise.

### GetFlowOk

`func (o *BillingRedirectSessionResponse) GetFlowOk() (*string, bool)`

GetFlowOk returns a tuple with the Flow field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFlow

`func (o *BillingRedirectSessionResponse) SetFlow(v string)`

SetFlow sets Flow field to given value.


### GetUrl

`func (o *BillingRedirectSessionResponse) GetUrl() string`

GetUrl returns the Url field if non-nil, zero value otherwise.

### GetUrlOk

`func (o *BillingRedirectSessionResponse) GetUrlOk() (*string, bool)`

GetUrlOk returns a tuple with the Url field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrl

`func (o *BillingRedirectSessionResponse) SetUrl(v string)`

SetUrl sets Url field to given value.


### GetSessionId

`func (o *BillingRedirectSessionResponse) GetSessionId() string`

GetSessionId returns the SessionId field if non-nil, zero value otherwise.

### GetSessionIdOk

`func (o *BillingRedirectSessionResponse) GetSessionIdOk() (*string, bool)`

GetSessionIdOk returns a tuple with the SessionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionId

`func (o *BillingRedirectSessionResponse) SetSessionId(v string)`

SetSessionId sets SessionId field to given value.

### HasSessionId

`func (o *BillingRedirectSessionResponse) HasSessionId() bool`

HasSessionId returns a boolean if a field has been set.

### SetSessionIdNil

`func (o *BillingRedirectSessionResponse) SetSessionIdNil(b bool)`

 SetSessionIdNil sets the value for SessionId to be an explicit nil

### UnsetSessionId
`func (o *BillingRedirectSessionResponse) UnsetSessionId()`

UnsetSessionId ensures that no value is present for SessionId, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


