# CampaignMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CampaignId** | **string** |  | 
**MutationPackId** | Pointer to **NullableString** |  | [optional] 
**Name** | **string** |  | 
**MutationSet** | **interface{}** |  | 
**EvalSet** | **interface{}** |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewCampaignMetadata

`func NewCampaignMetadata(campaignId string, name string, mutationSet interface{}, evalSet interface{}, createdAt time.Time, ) *CampaignMetadata`

NewCampaignMetadata instantiates a new CampaignMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCampaignMetadataWithDefaults

`func NewCampaignMetadataWithDefaults() *CampaignMetadata`

NewCampaignMetadataWithDefaults instantiates a new CampaignMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCampaignId

`func (o *CampaignMetadata) GetCampaignId() string`

GetCampaignId returns the CampaignId field if non-nil, zero value otherwise.

### GetCampaignIdOk

`func (o *CampaignMetadata) GetCampaignIdOk() (*string, bool)`

GetCampaignIdOk returns a tuple with the CampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignId

`func (o *CampaignMetadata) SetCampaignId(v string)`

SetCampaignId sets CampaignId field to given value.


### GetMutationPackId

`func (o *CampaignMetadata) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *CampaignMetadata) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *CampaignMetadata) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.

### HasMutationPackId

`func (o *CampaignMetadata) HasMutationPackId() bool`

HasMutationPackId returns a boolean if a field has been set.

### SetMutationPackIdNil

`func (o *CampaignMetadata) SetMutationPackIdNil(b bool)`

 SetMutationPackIdNil sets the value for MutationPackId to be an explicit nil

### UnsetMutationPackId
`func (o *CampaignMetadata) UnsetMutationPackId()`

UnsetMutationPackId ensures that no value is present for MutationPackId, not even an explicit nil
### GetName

`func (o *CampaignMetadata) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *CampaignMetadata) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *CampaignMetadata) SetName(v string)`

SetName sets Name field to given value.


### GetMutationSet

`func (o *CampaignMetadata) GetMutationSet() interface{}`

GetMutationSet returns the MutationSet field if non-nil, zero value otherwise.

### GetMutationSetOk

`func (o *CampaignMetadata) GetMutationSetOk() (*interface{}, bool)`

GetMutationSetOk returns a tuple with the MutationSet field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationSet

`func (o *CampaignMetadata) SetMutationSet(v interface{})`

SetMutationSet sets MutationSet field to given value.


### SetMutationSetNil

`func (o *CampaignMetadata) SetMutationSetNil(b bool)`

 SetMutationSetNil sets the value for MutationSet to be an explicit nil

### UnsetMutationSet
`func (o *CampaignMetadata) UnsetMutationSet()`

UnsetMutationSet ensures that no value is present for MutationSet, not even an explicit nil
### GetEvalSet

`func (o *CampaignMetadata) GetEvalSet() interface{}`

GetEvalSet returns the EvalSet field if non-nil, zero value otherwise.

### GetEvalSetOk

`func (o *CampaignMetadata) GetEvalSetOk() (*interface{}, bool)`

GetEvalSetOk returns a tuple with the EvalSet field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvalSet

`func (o *CampaignMetadata) SetEvalSet(v interface{})`

SetEvalSet sets EvalSet field to given value.


### SetEvalSetNil

`func (o *CampaignMetadata) SetEvalSetNil(b bool)`

 SetEvalSetNil sets the value for EvalSet to be an explicit nil

### UnsetEvalSet
`func (o *CampaignMetadata) UnsetEvalSet()`

UnsetEvalSet ensures that no value is present for EvalSet, not even an explicit nil
### GetCreatedAt

`func (o *CampaignMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CampaignMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CampaignMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


