# ReplayAttemptListItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AttemptId** | **string** |  | 
**MutationId** | **string** |  | 
**Result** | **string** |  | 
**FailureReason** | **NullableString** |  | 
**FirstFailureEventIndex** | **NullableInt32** |  | 
**FirstFailureTool** | **NullableString** |  | 
**Seed** | Pointer to **NullableInt32** |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewReplayAttemptListItem

`func NewReplayAttemptListItem(attemptId string, mutationId string, result string, failureReason NullableString, firstFailureEventIndex NullableInt32, firstFailureTool NullableString, createdAt time.Time, ) *ReplayAttemptListItem`

NewReplayAttemptListItem instantiates a new ReplayAttemptListItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReplayAttemptListItemWithDefaults

`func NewReplayAttemptListItemWithDefaults() *ReplayAttemptListItem`

NewReplayAttemptListItemWithDefaults instantiates a new ReplayAttemptListItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAttemptId

`func (o *ReplayAttemptListItem) GetAttemptId() string`

GetAttemptId returns the AttemptId field if non-nil, zero value otherwise.

### GetAttemptIdOk

`func (o *ReplayAttemptListItem) GetAttemptIdOk() (*string, bool)`

GetAttemptIdOk returns a tuple with the AttemptId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttemptId

`func (o *ReplayAttemptListItem) SetAttemptId(v string)`

SetAttemptId sets AttemptId field to given value.


### GetMutationId

`func (o *ReplayAttemptListItem) GetMutationId() string`

GetMutationId returns the MutationId field if non-nil, zero value otherwise.

### GetMutationIdOk

`func (o *ReplayAttemptListItem) GetMutationIdOk() (*string, bool)`

GetMutationIdOk returns a tuple with the MutationId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationId

`func (o *ReplayAttemptListItem) SetMutationId(v string)`

SetMutationId sets MutationId field to given value.


### GetResult

`func (o *ReplayAttemptListItem) GetResult() string`

GetResult returns the Result field if non-nil, zero value otherwise.

### GetResultOk

`func (o *ReplayAttemptListItem) GetResultOk() (*string, bool)`

GetResultOk returns a tuple with the Result field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResult

`func (o *ReplayAttemptListItem) SetResult(v string)`

SetResult sets Result field to given value.


### GetFailureReason

`func (o *ReplayAttemptListItem) GetFailureReason() string`

GetFailureReason returns the FailureReason field if non-nil, zero value otherwise.

### GetFailureReasonOk

`func (o *ReplayAttemptListItem) GetFailureReasonOk() (*string, bool)`

GetFailureReasonOk returns a tuple with the FailureReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureReason

`func (o *ReplayAttemptListItem) SetFailureReason(v string)`

SetFailureReason sets FailureReason field to given value.


### SetFailureReasonNil

`func (o *ReplayAttemptListItem) SetFailureReasonNil(b bool)`

 SetFailureReasonNil sets the value for FailureReason to be an explicit nil

### UnsetFailureReason
`func (o *ReplayAttemptListItem) UnsetFailureReason()`

UnsetFailureReason ensures that no value is present for FailureReason, not even an explicit nil
### GetFirstFailureEventIndex

`func (o *ReplayAttemptListItem) GetFirstFailureEventIndex() int32`

GetFirstFailureEventIndex returns the FirstFailureEventIndex field if non-nil, zero value otherwise.

### GetFirstFailureEventIndexOk

`func (o *ReplayAttemptListItem) GetFirstFailureEventIndexOk() (*int32, bool)`

GetFirstFailureEventIndexOk returns a tuple with the FirstFailureEventIndex field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFirstFailureEventIndex

`func (o *ReplayAttemptListItem) SetFirstFailureEventIndex(v int32)`

SetFirstFailureEventIndex sets FirstFailureEventIndex field to given value.


### SetFirstFailureEventIndexNil

`func (o *ReplayAttemptListItem) SetFirstFailureEventIndexNil(b bool)`

 SetFirstFailureEventIndexNil sets the value for FirstFailureEventIndex to be an explicit nil

### UnsetFirstFailureEventIndex
`func (o *ReplayAttemptListItem) UnsetFirstFailureEventIndex()`

UnsetFirstFailureEventIndex ensures that no value is present for FirstFailureEventIndex, not even an explicit nil
### GetFirstFailureTool

`func (o *ReplayAttemptListItem) GetFirstFailureTool() string`

GetFirstFailureTool returns the FirstFailureTool field if non-nil, zero value otherwise.

### GetFirstFailureToolOk

`func (o *ReplayAttemptListItem) GetFirstFailureToolOk() (*string, bool)`

GetFirstFailureToolOk returns a tuple with the FirstFailureTool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFirstFailureTool

`func (o *ReplayAttemptListItem) SetFirstFailureTool(v string)`

SetFirstFailureTool sets FirstFailureTool field to given value.


### SetFirstFailureToolNil

`func (o *ReplayAttemptListItem) SetFirstFailureToolNil(b bool)`

 SetFirstFailureToolNil sets the value for FirstFailureTool to be an explicit nil

### UnsetFirstFailureTool
`func (o *ReplayAttemptListItem) UnsetFirstFailureTool()`

UnsetFirstFailureTool ensures that no value is present for FirstFailureTool, not even an explicit nil
### GetSeed

`func (o *ReplayAttemptListItem) GetSeed() int32`

GetSeed returns the Seed field if non-nil, zero value otherwise.

### GetSeedOk

`func (o *ReplayAttemptListItem) GetSeedOk() (*int32, bool)`

GetSeedOk returns a tuple with the Seed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeed

`func (o *ReplayAttemptListItem) SetSeed(v int32)`

SetSeed sets Seed field to given value.

### HasSeed

`func (o *ReplayAttemptListItem) HasSeed() bool`

HasSeed returns a boolean if a field has been set.

### SetSeedNil

`func (o *ReplayAttemptListItem) SetSeedNil(b bool)`

 SetSeedNil sets the value for Seed to be an explicit nil

### UnsetSeed
`func (o *ReplayAttemptListItem) UnsetSeed()`

UnsetSeed ensures that no value is present for Seed, not even an explicit nil
### GetCreatedAt

`func (o *ReplayAttemptListItem) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *ReplayAttemptListItem) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *ReplayAttemptListItem) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


