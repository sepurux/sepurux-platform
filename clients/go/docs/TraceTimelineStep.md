# TraceTimelineStep

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**TraceId** | **string** |  | 
**StepType** | **string** |  | 
**StepName** | **string** |  | 
**MutationName** | Pointer to **NullableString** |  | [optional] 
**Status** | [**Status**](Status.md) |  | 
**InputPayload** | Pointer to [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | [optional] 
**OutputPayload** | Pointer to [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | [optional] 
**LatencyMs** | Pointer to **NullableInt32** |  | [optional] 
**StartedAt** | **time.Time** |  | 
**FinishedAt** | Pointer to **NullableTime** |  | [optional] 
**Metadata** | Pointer to **map[string]interface{}** |  | [optional] 

## Methods

### NewTraceTimelineStep

`func NewTraceTimelineStep(id string, traceId string, stepType string, stepName string, status Status, startedAt time.Time, ) *TraceTimelineStep`

NewTraceTimelineStep instantiates a new TraceTimelineStep object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTraceTimelineStepWithDefaults

`func NewTraceTimelineStepWithDefaults() *TraceTimelineStep`

NewTraceTimelineStepWithDefaults instantiates a new TraceTimelineStep object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *TraceTimelineStep) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *TraceTimelineStep) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *TraceTimelineStep) SetId(v string)`

SetId sets Id field to given value.


### GetTraceId

`func (o *TraceTimelineStep) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *TraceTimelineStep) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *TraceTimelineStep) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.


### GetStepType

`func (o *TraceTimelineStep) GetStepType() string`

GetStepType returns the StepType field if non-nil, zero value otherwise.

### GetStepTypeOk

`func (o *TraceTimelineStep) GetStepTypeOk() (*string, bool)`

GetStepTypeOk returns a tuple with the StepType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStepType

`func (o *TraceTimelineStep) SetStepType(v string)`

SetStepType sets StepType field to given value.


### GetStepName

`func (o *TraceTimelineStep) GetStepName() string`

GetStepName returns the StepName field if non-nil, zero value otherwise.

### GetStepNameOk

`func (o *TraceTimelineStep) GetStepNameOk() (*string, bool)`

GetStepNameOk returns a tuple with the StepName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStepName

`func (o *TraceTimelineStep) SetStepName(v string)`

SetStepName sets StepName field to given value.


### GetMutationName

`func (o *TraceTimelineStep) GetMutationName() string`

GetMutationName returns the MutationName field if non-nil, zero value otherwise.

### GetMutationNameOk

`func (o *TraceTimelineStep) GetMutationNameOk() (*string, bool)`

GetMutationNameOk returns a tuple with the MutationName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationName

`func (o *TraceTimelineStep) SetMutationName(v string)`

SetMutationName sets MutationName field to given value.

### HasMutationName

`func (o *TraceTimelineStep) HasMutationName() bool`

HasMutationName returns a boolean if a field has been set.

### SetMutationNameNil

`func (o *TraceTimelineStep) SetMutationNameNil(b bool)`

 SetMutationNameNil sets the value for MutationName to be an explicit nil

### UnsetMutationName
`func (o *TraceTimelineStep) UnsetMutationName()`

UnsetMutationName ensures that no value is present for MutationName, not even an explicit nil
### GetStatus

`func (o *TraceTimelineStep) GetStatus() Status`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *TraceTimelineStep) GetStatusOk() (*Status, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *TraceTimelineStep) SetStatus(v Status)`

SetStatus sets Status field to given value.


### GetInputPayload

`func (o *TraceTimelineStep) GetInputPayload() AnyOf`

GetInputPayload returns the InputPayload field if non-nil, zero value otherwise.

### GetInputPayloadOk

`func (o *TraceTimelineStep) GetInputPayloadOk() (*AnyOf, bool)`

GetInputPayloadOk returns a tuple with the InputPayload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInputPayload

`func (o *TraceTimelineStep) SetInputPayload(v AnyOf)`

SetInputPayload sets InputPayload field to given value.

### HasInputPayload

`func (o *TraceTimelineStep) HasInputPayload() bool`

HasInputPayload returns a boolean if a field has been set.

### SetInputPayloadNil

`func (o *TraceTimelineStep) SetInputPayloadNil(b bool)`

 SetInputPayloadNil sets the value for InputPayload to be an explicit nil

### UnsetInputPayload
`func (o *TraceTimelineStep) UnsetInputPayload()`

UnsetInputPayload ensures that no value is present for InputPayload, not even an explicit nil
### GetOutputPayload

`func (o *TraceTimelineStep) GetOutputPayload() AnyOf`

GetOutputPayload returns the OutputPayload field if non-nil, zero value otherwise.

### GetOutputPayloadOk

`func (o *TraceTimelineStep) GetOutputPayloadOk() (*AnyOf, bool)`

GetOutputPayloadOk returns a tuple with the OutputPayload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOutputPayload

`func (o *TraceTimelineStep) SetOutputPayload(v AnyOf)`

SetOutputPayload sets OutputPayload field to given value.

### HasOutputPayload

`func (o *TraceTimelineStep) HasOutputPayload() bool`

HasOutputPayload returns a boolean if a field has been set.

### SetOutputPayloadNil

`func (o *TraceTimelineStep) SetOutputPayloadNil(b bool)`

 SetOutputPayloadNil sets the value for OutputPayload to be an explicit nil

### UnsetOutputPayload
`func (o *TraceTimelineStep) UnsetOutputPayload()`

UnsetOutputPayload ensures that no value is present for OutputPayload, not even an explicit nil
### GetLatencyMs

`func (o *TraceTimelineStep) GetLatencyMs() int32`

GetLatencyMs returns the LatencyMs field if non-nil, zero value otherwise.

### GetLatencyMsOk

`func (o *TraceTimelineStep) GetLatencyMsOk() (*int32, bool)`

GetLatencyMsOk returns a tuple with the LatencyMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLatencyMs

`func (o *TraceTimelineStep) SetLatencyMs(v int32)`

SetLatencyMs sets LatencyMs field to given value.

### HasLatencyMs

`func (o *TraceTimelineStep) HasLatencyMs() bool`

HasLatencyMs returns a boolean if a field has been set.

### SetLatencyMsNil

`func (o *TraceTimelineStep) SetLatencyMsNil(b bool)`

 SetLatencyMsNil sets the value for LatencyMs to be an explicit nil

### UnsetLatencyMs
`func (o *TraceTimelineStep) UnsetLatencyMs()`

UnsetLatencyMs ensures that no value is present for LatencyMs, not even an explicit nil
### GetStartedAt

`func (o *TraceTimelineStep) GetStartedAt() time.Time`

GetStartedAt returns the StartedAt field if non-nil, zero value otherwise.

### GetStartedAtOk

`func (o *TraceTimelineStep) GetStartedAtOk() (*time.Time, bool)`

GetStartedAtOk returns a tuple with the StartedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartedAt

`func (o *TraceTimelineStep) SetStartedAt(v time.Time)`

SetStartedAt sets StartedAt field to given value.


### GetFinishedAt

`func (o *TraceTimelineStep) GetFinishedAt() time.Time`

GetFinishedAt returns the FinishedAt field if non-nil, zero value otherwise.

### GetFinishedAtOk

`func (o *TraceTimelineStep) GetFinishedAtOk() (*time.Time, bool)`

GetFinishedAtOk returns a tuple with the FinishedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFinishedAt

`func (o *TraceTimelineStep) SetFinishedAt(v time.Time)`

SetFinishedAt sets FinishedAt field to given value.

### HasFinishedAt

`func (o *TraceTimelineStep) HasFinishedAt() bool`

HasFinishedAt returns a boolean if a field has been set.

### SetFinishedAtNil

`func (o *TraceTimelineStep) SetFinishedAtNil(b bool)`

 SetFinishedAtNil sets the value for FinishedAt to be an explicit nil

### UnsetFinishedAt
`func (o *TraceTimelineStep) UnsetFinishedAt()`

UnsetFinishedAt ensures that no value is present for FinishedAt, not even an explicit nil
### GetMetadata

`func (o *TraceTimelineStep) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *TraceTimelineStep) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *TraceTimelineStep) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *TraceTimelineStep) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### SetMetadataNil

`func (o *TraceTimelineStep) SetMetadataNil(b bool)`

 SetMetadataNil sets the value for Metadata to be an explicit nil

### UnsetMetadata
`func (o *TraceTimelineStep) UnsetMetadata()`

UnsetMetadata ensures that no value is present for Metadata, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


