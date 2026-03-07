# CampaignCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** |  | 
**MutationSet** | **interface{}** |  | 
**EvalSet** | **interface{}** |  | 
**MutationPackId** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewCampaignCreateRequest

`func NewCampaignCreateRequest(name string, mutationSet interface{}, evalSet interface{}, ) *CampaignCreateRequest`

NewCampaignCreateRequest instantiates a new CampaignCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCampaignCreateRequestWithDefaults

`func NewCampaignCreateRequestWithDefaults() *CampaignCreateRequest`

NewCampaignCreateRequestWithDefaults instantiates a new CampaignCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *CampaignCreateRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *CampaignCreateRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *CampaignCreateRequest) SetName(v string)`

SetName sets Name field to given value.


### GetMutationSet

`func (o *CampaignCreateRequest) GetMutationSet() interface{}`

GetMutationSet returns the MutationSet field if non-nil, zero value otherwise.

### GetMutationSetOk

`func (o *CampaignCreateRequest) GetMutationSetOk() (*interface{}, bool)`

GetMutationSetOk returns a tuple with the MutationSet field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationSet

`func (o *CampaignCreateRequest) SetMutationSet(v interface{})`

SetMutationSet sets MutationSet field to given value.


### SetMutationSetNil

`func (o *CampaignCreateRequest) SetMutationSetNil(b bool)`

 SetMutationSetNil sets the value for MutationSet to be an explicit nil

### UnsetMutationSet
`func (o *CampaignCreateRequest) UnsetMutationSet()`

UnsetMutationSet ensures that no value is present for MutationSet, not even an explicit nil
### GetEvalSet

`func (o *CampaignCreateRequest) GetEvalSet() interface{}`

GetEvalSet returns the EvalSet field if non-nil, zero value otherwise.

### GetEvalSetOk

`func (o *CampaignCreateRequest) GetEvalSetOk() (*interface{}, bool)`

GetEvalSetOk returns a tuple with the EvalSet field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvalSet

`func (o *CampaignCreateRequest) SetEvalSet(v interface{})`

SetEvalSet sets EvalSet field to given value.


### SetEvalSetNil

`func (o *CampaignCreateRequest) SetEvalSetNil(b bool)`

 SetEvalSetNil sets the value for EvalSet to be an explicit nil

### UnsetEvalSet
`func (o *CampaignCreateRequest) UnsetEvalSet()`

UnsetEvalSet ensures that no value is present for EvalSet, not even an explicit nil
### GetMutationPackId

`func (o *CampaignCreateRequest) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *CampaignCreateRequest) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *CampaignCreateRequest) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.

### HasMutationPackId

`func (o *CampaignCreateRequest) HasMutationPackId() bool`

HasMutationPackId returns a boolean if a field has been set.

### SetMutationPackIdNil

`func (o *CampaignCreateRequest) SetMutationPackIdNil(b bool)`

 SetMutationPackIdNil sets the value for MutationPackId to be an explicit nil

### UnsetMutationPackId
`func (o *CampaignCreateRequest) UnsetMutationPackId()`

UnsetMutationPackId ensures that no value is present for MutationPackId, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


