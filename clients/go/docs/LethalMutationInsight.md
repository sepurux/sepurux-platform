# LethalMutationInsight

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MutationId** | **string** |  | 
**Failures** | **int32** |  | 
**AttemptsHit** | **int32** |  | 
**FailureRateWhenHit** | **float32** |  | 
**TopTools** | [**[]LethalMutationTopTool**](LethalMutationTopTool.md) |  | 
**TopReasons** | [**[]LethalMutationTopReason**](LethalMutationTopReason.md) |  | 

## Methods

### NewLethalMutationInsight

`func NewLethalMutationInsight(mutationId string, failures int32, attemptsHit int32, failureRateWhenHit float32, topTools []LethalMutationTopTool, topReasons []LethalMutationTopReason, ) *LethalMutationInsight`

NewLethalMutationInsight instantiates a new LethalMutationInsight object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewLethalMutationInsightWithDefaults

`func NewLethalMutationInsightWithDefaults() *LethalMutationInsight`

NewLethalMutationInsightWithDefaults instantiates a new LethalMutationInsight object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMutationId

`func (o *LethalMutationInsight) GetMutationId() string`

GetMutationId returns the MutationId field if non-nil, zero value otherwise.

### GetMutationIdOk

`func (o *LethalMutationInsight) GetMutationIdOk() (*string, bool)`

GetMutationIdOk returns a tuple with the MutationId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationId

`func (o *LethalMutationInsight) SetMutationId(v string)`

SetMutationId sets MutationId field to given value.


### GetFailures

`func (o *LethalMutationInsight) GetFailures() int32`

GetFailures returns the Failures field if non-nil, zero value otherwise.

### GetFailuresOk

`func (o *LethalMutationInsight) GetFailuresOk() (*int32, bool)`

GetFailuresOk returns a tuple with the Failures field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailures

`func (o *LethalMutationInsight) SetFailures(v int32)`

SetFailures sets Failures field to given value.


### GetAttemptsHit

`func (o *LethalMutationInsight) GetAttemptsHit() int32`

GetAttemptsHit returns the AttemptsHit field if non-nil, zero value otherwise.

### GetAttemptsHitOk

`func (o *LethalMutationInsight) GetAttemptsHitOk() (*int32, bool)`

GetAttemptsHitOk returns a tuple with the AttemptsHit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttemptsHit

`func (o *LethalMutationInsight) SetAttemptsHit(v int32)`

SetAttemptsHit sets AttemptsHit field to given value.


### GetFailureRateWhenHit

`func (o *LethalMutationInsight) GetFailureRateWhenHit() float32`

GetFailureRateWhenHit returns the FailureRateWhenHit field if non-nil, zero value otherwise.

### GetFailureRateWhenHitOk

`func (o *LethalMutationInsight) GetFailureRateWhenHitOk() (*float32, bool)`

GetFailureRateWhenHitOk returns a tuple with the FailureRateWhenHit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureRateWhenHit

`func (o *LethalMutationInsight) SetFailureRateWhenHit(v float32)`

SetFailureRateWhenHit sets FailureRateWhenHit field to given value.


### GetTopTools

`func (o *LethalMutationInsight) GetTopTools() []LethalMutationTopTool`

GetTopTools returns the TopTools field if non-nil, zero value otherwise.

### GetTopToolsOk

`func (o *LethalMutationInsight) GetTopToolsOk() (*[]LethalMutationTopTool, bool)`

GetTopToolsOk returns a tuple with the TopTools field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopTools

`func (o *LethalMutationInsight) SetTopTools(v []LethalMutationTopTool)`

SetTopTools sets TopTools field to given value.


### GetTopReasons

`func (o *LethalMutationInsight) GetTopReasons() []LethalMutationTopReason`

GetTopReasons returns the TopReasons field if non-nil, zero value otherwise.

### GetTopReasonsOk

`func (o *LethalMutationInsight) GetTopReasonsOk() (*[]LethalMutationTopReason, bool)`

GetTopReasonsOk returns a tuple with the TopReasons field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopReasons

`func (o *LethalMutationInsight) SetTopReasons(v []LethalMutationTopReason)`

SetTopReasons sets TopReasons field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


