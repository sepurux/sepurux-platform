# RunMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**RunId** | **string** |  | 
**TraceId** | **string** |  | 
**CampaignId** | **string** |  | 
**MutationPackId** | Pointer to **NullableString** |  | [optional] 
**PolicyPackId** | Pointer to **NullableString** |  | [optional] 
**EffectivePolicyPackVersionId** | Pointer to **NullableString** |  | [optional] 
**Status** | **string** |  | 
**Summary** | [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | 
**PassRate** | Pointer to **NullableFloat32** |  | [optional] 
**UnsafeCount** | Pointer to **NullableInt32** |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewRunMetadata

`func NewRunMetadata(runId string, traceId string, campaignId string, status string, summary NullableAnyOf, createdAt time.Time, ) *RunMetadata`

NewRunMetadata instantiates a new RunMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRunMetadataWithDefaults

`func NewRunMetadataWithDefaults() *RunMetadata`

NewRunMetadataWithDefaults instantiates a new RunMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetRunId

`func (o *RunMetadata) GetRunId() string`

GetRunId returns the RunId field if non-nil, zero value otherwise.

### GetRunIdOk

`func (o *RunMetadata) GetRunIdOk() (*string, bool)`

GetRunIdOk returns a tuple with the RunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRunId

`func (o *RunMetadata) SetRunId(v string)`

SetRunId sets RunId field to given value.


### GetTraceId

`func (o *RunMetadata) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *RunMetadata) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *RunMetadata) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.


### GetCampaignId

`func (o *RunMetadata) GetCampaignId() string`

GetCampaignId returns the CampaignId field if non-nil, zero value otherwise.

### GetCampaignIdOk

`func (o *RunMetadata) GetCampaignIdOk() (*string, bool)`

GetCampaignIdOk returns a tuple with the CampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignId

`func (o *RunMetadata) SetCampaignId(v string)`

SetCampaignId sets CampaignId field to given value.


### GetMutationPackId

`func (o *RunMetadata) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *RunMetadata) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *RunMetadata) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.

### HasMutationPackId

`func (o *RunMetadata) HasMutationPackId() bool`

HasMutationPackId returns a boolean if a field has been set.

### SetMutationPackIdNil

`func (o *RunMetadata) SetMutationPackIdNil(b bool)`

 SetMutationPackIdNil sets the value for MutationPackId to be an explicit nil

### UnsetMutationPackId
`func (o *RunMetadata) UnsetMutationPackId()`

UnsetMutationPackId ensures that no value is present for MutationPackId, not even an explicit nil
### GetPolicyPackId

`func (o *RunMetadata) GetPolicyPackId() string`

GetPolicyPackId returns the PolicyPackId field if non-nil, zero value otherwise.

### GetPolicyPackIdOk

`func (o *RunMetadata) GetPolicyPackIdOk() (*string, bool)`

GetPolicyPackIdOk returns a tuple with the PolicyPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyPackId

`func (o *RunMetadata) SetPolicyPackId(v string)`

SetPolicyPackId sets PolicyPackId field to given value.

### HasPolicyPackId

`func (o *RunMetadata) HasPolicyPackId() bool`

HasPolicyPackId returns a boolean if a field has been set.

### SetPolicyPackIdNil

`func (o *RunMetadata) SetPolicyPackIdNil(b bool)`

 SetPolicyPackIdNil sets the value for PolicyPackId to be an explicit nil

### UnsetPolicyPackId
`func (o *RunMetadata) UnsetPolicyPackId()`

UnsetPolicyPackId ensures that no value is present for PolicyPackId, not even an explicit nil
### GetEffectivePolicyPackVersionId

`func (o *RunMetadata) GetEffectivePolicyPackVersionId() string`

GetEffectivePolicyPackVersionId returns the EffectivePolicyPackVersionId field if non-nil, zero value otherwise.

### GetEffectivePolicyPackVersionIdOk

`func (o *RunMetadata) GetEffectivePolicyPackVersionIdOk() (*string, bool)`

GetEffectivePolicyPackVersionIdOk returns a tuple with the EffectivePolicyPackVersionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEffectivePolicyPackVersionId

`func (o *RunMetadata) SetEffectivePolicyPackVersionId(v string)`

SetEffectivePolicyPackVersionId sets EffectivePolicyPackVersionId field to given value.

### HasEffectivePolicyPackVersionId

`func (o *RunMetadata) HasEffectivePolicyPackVersionId() bool`

HasEffectivePolicyPackVersionId returns a boolean if a field has been set.

### SetEffectivePolicyPackVersionIdNil

`func (o *RunMetadata) SetEffectivePolicyPackVersionIdNil(b bool)`

 SetEffectivePolicyPackVersionIdNil sets the value for EffectivePolicyPackVersionId to be an explicit nil

### UnsetEffectivePolicyPackVersionId
`func (o *RunMetadata) UnsetEffectivePolicyPackVersionId()`

UnsetEffectivePolicyPackVersionId ensures that no value is present for EffectivePolicyPackVersionId, not even an explicit nil
### GetStatus

`func (o *RunMetadata) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *RunMetadata) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *RunMetadata) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetSummary

`func (o *RunMetadata) GetSummary() AnyOf`

GetSummary returns the Summary field if non-nil, zero value otherwise.

### GetSummaryOk

`func (o *RunMetadata) GetSummaryOk() (*AnyOf, bool)`

GetSummaryOk returns a tuple with the Summary field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSummary

`func (o *RunMetadata) SetSummary(v AnyOf)`

SetSummary sets Summary field to given value.


### SetSummaryNil

`func (o *RunMetadata) SetSummaryNil(b bool)`

 SetSummaryNil sets the value for Summary to be an explicit nil

### UnsetSummary
`func (o *RunMetadata) UnsetSummary()`

UnsetSummary ensures that no value is present for Summary, not even an explicit nil
### GetPassRate

`func (o *RunMetadata) GetPassRate() float32`

GetPassRate returns the PassRate field if non-nil, zero value otherwise.

### GetPassRateOk

`func (o *RunMetadata) GetPassRateOk() (*float32, bool)`

GetPassRateOk returns a tuple with the PassRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPassRate

`func (o *RunMetadata) SetPassRate(v float32)`

SetPassRate sets PassRate field to given value.

### HasPassRate

`func (o *RunMetadata) HasPassRate() bool`

HasPassRate returns a boolean if a field has been set.

### SetPassRateNil

`func (o *RunMetadata) SetPassRateNil(b bool)`

 SetPassRateNil sets the value for PassRate to be an explicit nil

### UnsetPassRate
`func (o *RunMetadata) UnsetPassRate()`

UnsetPassRate ensures that no value is present for PassRate, not even an explicit nil
### GetUnsafeCount

`func (o *RunMetadata) GetUnsafeCount() int32`

GetUnsafeCount returns the UnsafeCount field if non-nil, zero value otherwise.

### GetUnsafeCountOk

`func (o *RunMetadata) GetUnsafeCountOk() (*int32, bool)`

GetUnsafeCountOk returns a tuple with the UnsafeCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUnsafeCount

`func (o *RunMetadata) SetUnsafeCount(v int32)`

SetUnsafeCount sets UnsafeCount field to given value.

### HasUnsafeCount

`func (o *RunMetadata) HasUnsafeCount() bool`

HasUnsafeCount returns a boolean if a field has been set.

### SetUnsafeCountNil

`func (o *RunMetadata) SetUnsafeCountNil(b bool)`

 SetUnsafeCountNil sets the value for UnsafeCount to be an explicit nil

### UnsetUnsafeCount
`func (o *RunMetadata) UnsetUnsafeCount()`

UnsetUnsafeCount ensures that no value is present for UnsafeCount, not even an explicit nil
### GetCreatedAt

`func (o *RunMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *RunMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *RunMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


