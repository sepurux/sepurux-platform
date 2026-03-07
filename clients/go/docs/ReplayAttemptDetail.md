# ReplayAttemptDetail

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AttemptId** | **string** |  | 
**RunId** | **string** |  | 
**MutationId** | **string** |  | 
**Result** | **string** |  | 
**FailureReason** | **NullableString** |  | 
**ArtifactsS3Key** | **NullableString** |  | 
**FirstFailureEventIndex** | **NullableInt32** |  | 
**FirstFailureTool** | **NullableString** |  | 
**Seed** | Pointer to **NullableInt32** |  | [optional] 
**MutationTrace** | Pointer to [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewReplayAttemptDetail

`func NewReplayAttemptDetail(attemptId string, runId string, mutationId string, result string, failureReason NullableString, artifactsS3Key NullableString, firstFailureEventIndex NullableInt32, firstFailureTool NullableString, createdAt time.Time, ) *ReplayAttemptDetail`

NewReplayAttemptDetail instantiates a new ReplayAttemptDetail object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewReplayAttemptDetailWithDefaults

`func NewReplayAttemptDetailWithDefaults() *ReplayAttemptDetail`

NewReplayAttemptDetailWithDefaults instantiates a new ReplayAttemptDetail object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAttemptId

`func (o *ReplayAttemptDetail) GetAttemptId() string`

GetAttemptId returns the AttemptId field if non-nil, zero value otherwise.

### GetAttemptIdOk

`func (o *ReplayAttemptDetail) GetAttemptIdOk() (*string, bool)`

GetAttemptIdOk returns a tuple with the AttemptId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttemptId

`func (o *ReplayAttemptDetail) SetAttemptId(v string)`

SetAttemptId sets AttemptId field to given value.


### GetRunId

`func (o *ReplayAttemptDetail) GetRunId() string`

GetRunId returns the RunId field if non-nil, zero value otherwise.

### GetRunIdOk

`func (o *ReplayAttemptDetail) GetRunIdOk() (*string, bool)`

GetRunIdOk returns a tuple with the RunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRunId

`func (o *ReplayAttemptDetail) SetRunId(v string)`

SetRunId sets RunId field to given value.


### GetMutationId

`func (o *ReplayAttemptDetail) GetMutationId() string`

GetMutationId returns the MutationId field if non-nil, zero value otherwise.

### GetMutationIdOk

`func (o *ReplayAttemptDetail) GetMutationIdOk() (*string, bool)`

GetMutationIdOk returns a tuple with the MutationId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationId

`func (o *ReplayAttemptDetail) SetMutationId(v string)`

SetMutationId sets MutationId field to given value.


### GetResult

`func (o *ReplayAttemptDetail) GetResult() string`

GetResult returns the Result field if non-nil, zero value otherwise.

### GetResultOk

`func (o *ReplayAttemptDetail) GetResultOk() (*string, bool)`

GetResultOk returns a tuple with the Result field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResult

`func (o *ReplayAttemptDetail) SetResult(v string)`

SetResult sets Result field to given value.


### GetFailureReason

`func (o *ReplayAttemptDetail) GetFailureReason() string`

GetFailureReason returns the FailureReason field if non-nil, zero value otherwise.

### GetFailureReasonOk

`func (o *ReplayAttemptDetail) GetFailureReasonOk() (*string, bool)`

GetFailureReasonOk returns a tuple with the FailureReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureReason

`func (o *ReplayAttemptDetail) SetFailureReason(v string)`

SetFailureReason sets FailureReason field to given value.


### SetFailureReasonNil

`func (o *ReplayAttemptDetail) SetFailureReasonNil(b bool)`

 SetFailureReasonNil sets the value for FailureReason to be an explicit nil

### UnsetFailureReason
`func (o *ReplayAttemptDetail) UnsetFailureReason()`

UnsetFailureReason ensures that no value is present for FailureReason, not even an explicit nil
### GetArtifactsS3Key

`func (o *ReplayAttemptDetail) GetArtifactsS3Key() string`

GetArtifactsS3Key returns the ArtifactsS3Key field if non-nil, zero value otherwise.

### GetArtifactsS3KeyOk

`func (o *ReplayAttemptDetail) GetArtifactsS3KeyOk() (*string, bool)`

GetArtifactsS3KeyOk returns a tuple with the ArtifactsS3Key field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetArtifactsS3Key

`func (o *ReplayAttemptDetail) SetArtifactsS3Key(v string)`

SetArtifactsS3Key sets ArtifactsS3Key field to given value.


### SetArtifactsS3KeyNil

`func (o *ReplayAttemptDetail) SetArtifactsS3KeyNil(b bool)`

 SetArtifactsS3KeyNil sets the value for ArtifactsS3Key to be an explicit nil

### UnsetArtifactsS3Key
`func (o *ReplayAttemptDetail) UnsetArtifactsS3Key()`

UnsetArtifactsS3Key ensures that no value is present for ArtifactsS3Key, not even an explicit nil
### GetFirstFailureEventIndex

`func (o *ReplayAttemptDetail) GetFirstFailureEventIndex() int32`

GetFirstFailureEventIndex returns the FirstFailureEventIndex field if non-nil, zero value otherwise.

### GetFirstFailureEventIndexOk

`func (o *ReplayAttemptDetail) GetFirstFailureEventIndexOk() (*int32, bool)`

GetFirstFailureEventIndexOk returns a tuple with the FirstFailureEventIndex field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFirstFailureEventIndex

`func (o *ReplayAttemptDetail) SetFirstFailureEventIndex(v int32)`

SetFirstFailureEventIndex sets FirstFailureEventIndex field to given value.


### SetFirstFailureEventIndexNil

`func (o *ReplayAttemptDetail) SetFirstFailureEventIndexNil(b bool)`

 SetFirstFailureEventIndexNil sets the value for FirstFailureEventIndex to be an explicit nil

### UnsetFirstFailureEventIndex
`func (o *ReplayAttemptDetail) UnsetFirstFailureEventIndex()`

UnsetFirstFailureEventIndex ensures that no value is present for FirstFailureEventIndex, not even an explicit nil
### GetFirstFailureTool

`func (o *ReplayAttemptDetail) GetFirstFailureTool() string`

GetFirstFailureTool returns the FirstFailureTool field if non-nil, zero value otherwise.

### GetFirstFailureToolOk

`func (o *ReplayAttemptDetail) GetFirstFailureToolOk() (*string, bool)`

GetFirstFailureToolOk returns a tuple with the FirstFailureTool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFirstFailureTool

`func (o *ReplayAttemptDetail) SetFirstFailureTool(v string)`

SetFirstFailureTool sets FirstFailureTool field to given value.


### SetFirstFailureToolNil

`func (o *ReplayAttemptDetail) SetFirstFailureToolNil(b bool)`

 SetFirstFailureToolNil sets the value for FirstFailureTool to be an explicit nil

### UnsetFirstFailureTool
`func (o *ReplayAttemptDetail) UnsetFirstFailureTool()`

UnsetFirstFailureTool ensures that no value is present for FirstFailureTool, not even an explicit nil
### GetSeed

`func (o *ReplayAttemptDetail) GetSeed() int32`

GetSeed returns the Seed field if non-nil, zero value otherwise.

### GetSeedOk

`func (o *ReplayAttemptDetail) GetSeedOk() (*int32, bool)`

GetSeedOk returns a tuple with the Seed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeed

`func (o *ReplayAttemptDetail) SetSeed(v int32)`

SetSeed sets Seed field to given value.

### HasSeed

`func (o *ReplayAttemptDetail) HasSeed() bool`

HasSeed returns a boolean if a field has been set.

### SetSeedNil

`func (o *ReplayAttemptDetail) SetSeedNil(b bool)`

 SetSeedNil sets the value for Seed to be an explicit nil

### UnsetSeed
`func (o *ReplayAttemptDetail) UnsetSeed()`

UnsetSeed ensures that no value is present for Seed, not even an explicit nil
### GetMutationTrace

`func (o *ReplayAttemptDetail) GetMutationTrace() AnyOf`

GetMutationTrace returns the MutationTrace field if non-nil, zero value otherwise.

### GetMutationTraceOk

`func (o *ReplayAttemptDetail) GetMutationTraceOk() (*AnyOf, bool)`

GetMutationTraceOk returns a tuple with the MutationTrace field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationTrace

`func (o *ReplayAttemptDetail) SetMutationTrace(v AnyOf)`

SetMutationTrace sets MutationTrace field to given value.

### HasMutationTrace

`func (o *ReplayAttemptDetail) HasMutationTrace() bool`

HasMutationTrace returns a boolean if a field has been set.

### SetMutationTraceNil

`func (o *ReplayAttemptDetail) SetMutationTraceNil(b bool)`

 SetMutationTraceNil sets the value for MutationTrace to be an explicit nil

### UnsetMutationTrace
`func (o *ReplayAttemptDetail) UnsetMutationTrace()`

UnsetMutationTrace ensures that no value is present for MutationTrace, not even an explicit nil
### GetCreatedAt

`func (o *ReplayAttemptDetail) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *ReplayAttemptDetail) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *ReplayAttemptDetail) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


