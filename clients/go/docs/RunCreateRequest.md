# RunCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TraceId** | **string** |  | 
**CampaignId** | **string** |  | 
**MutationPackId** | Pointer to **NullableString** |  | [optional] 
**PolicyPackId** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewRunCreateRequest

`func NewRunCreateRequest(traceId string, campaignId string, ) *RunCreateRequest`

NewRunCreateRequest instantiates a new RunCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRunCreateRequestWithDefaults

`func NewRunCreateRequestWithDefaults() *RunCreateRequest`

NewRunCreateRequestWithDefaults instantiates a new RunCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTraceId

`func (o *RunCreateRequest) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *RunCreateRequest) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *RunCreateRequest) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.


### GetCampaignId

`func (o *RunCreateRequest) GetCampaignId() string`

GetCampaignId returns the CampaignId field if non-nil, zero value otherwise.

### GetCampaignIdOk

`func (o *RunCreateRequest) GetCampaignIdOk() (*string, bool)`

GetCampaignIdOk returns a tuple with the CampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignId

`func (o *RunCreateRequest) SetCampaignId(v string)`

SetCampaignId sets CampaignId field to given value.


### GetMutationPackId

`func (o *RunCreateRequest) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *RunCreateRequest) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *RunCreateRequest) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.

### HasMutationPackId

`func (o *RunCreateRequest) HasMutationPackId() bool`

HasMutationPackId returns a boolean if a field has been set.

### SetMutationPackIdNil

`func (o *RunCreateRequest) SetMutationPackIdNil(b bool)`

 SetMutationPackIdNil sets the value for MutationPackId to be an explicit nil

### UnsetMutationPackId
`func (o *RunCreateRequest) UnsetMutationPackId()`

UnsetMutationPackId ensures that no value is present for MutationPackId, not even an explicit nil
### GetPolicyPackId

`func (o *RunCreateRequest) GetPolicyPackId() string`

GetPolicyPackId returns the PolicyPackId field if non-nil, zero value otherwise.

### GetPolicyPackIdOk

`func (o *RunCreateRequest) GetPolicyPackIdOk() (*string, bool)`

GetPolicyPackIdOk returns a tuple with the PolicyPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyPackId

`func (o *RunCreateRequest) SetPolicyPackId(v string)`

SetPolicyPackId sets PolicyPackId field to given value.

### HasPolicyPackId

`func (o *RunCreateRequest) HasPolicyPackId() bool`

HasPolicyPackId returns a boolean if a field has been set.

### SetPolicyPackIdNil

`func (o *RunCreateRequest) SetPolicyPackIdNil(b bool)`

 SetPolicyPackIdNil sets the value for PolicyPackId to be an explicit nil

### UnsetPolicyPackId
`func (o *RunCreateRequest) UnsetPolicyPackId()`

UnsetPolicyPackId ensures that no value is present for PolicyPackId, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


