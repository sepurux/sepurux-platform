# CounterfactualMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CounterfactualId** | **string** |  | 
**AttemptId** | **string** |  | 
**Strategy** | **string** |  | 
**Result** | **string** |  | 
**FailureReason** | **NullableString** |  | 
**Metrics** | [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | 
**Diff** | [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewCounterfactualMetadata

`func NewCounterfactualMetadata(counterfactualId string, attemptId string, strategy string, result string, failureReason NullableString, metrics NullableAnyOf, diff NullableAnyOf, createdAt time.Time, ) *CounterfactualMetadata`

NewCounterfactualMetadata instantiates a new CounterfactualMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCounterfactualMetadataWithDefaults

`func NewCounterfactualMetadataWithDefaults() *CounterfactualMetadata`

NewCounterfactualMetadataWithDefaults instantiates a new CounterfactualMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCounterfactualId

`func (o *CounterfactualMetadata) GetCounterfactualId() string`

GetCounterfactualId returns the CounterfactualId field if non-nil, zero value otherwise.

### GetCounterfactualIdOk

`func (o *CounterfactualMetadata) GetCounterfactualIdOk() (*string, bool)`

GetCounterfactualIdOk returns a tuple with the CounterfactualId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCounterfactualId

`func (o *CounterfactualMetadata) SetCounterfactualId(v string)`

SetCounterfactualId sets CounterfactualId field to given value.


### GetAttemptId

`func (o *CounterfactualMetadata) GetAttemptId() string`

GetAttemptId returns the AttemptId field if non-nil, zero value otherwise.

### GetAttemptIdOk

`func (o *CounterfactualMetadata) GetAttemptIdOk() (*string, bool)`

GetAttemptIdOk returns a tuple with the AttemptId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttemptId

`func (o *CounterfactualMetadata) SetAttemptId(v string)`

SetAttemptId sets AttemptId field to given value.


### GetStrategy

`func (o *CounterfactualMetadata) GetStrategy() string`

GetStrategy returns the Strategy field if non-nil, zero value otherwise.

### GetStrategyOk

`func (o *CounterfactualMetadata) GetStrategyOk() (*string, bool)`

GetStrategyOk returns a tuple with the Strategy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStrategy

`func (o *CounterfactualMetadata) SetStrategy(v string)`

SetStrategy sets Strategy field to given value.


### GetResult

`func (o *CounterfactualMetadata) GetResult() string`

GetResult returns the Result field if non-nil, zero value otherwise.

### GetResultOk

`func (o *CounterfactualMetadata) GetResultOk() (*string, bool)`

GetResultOk returns a tuple with the Result field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResult

`func (o *CounterfactualMetadata) SetResult(v string)`

SetResult sets Result field to given value.


### GetFailureReason

`func (o *CounterfactualMetadata) GetFailureReason() string`

GetFailureReason returns the FailureReason field if non-nil, zero value otherwise.

### GetFailureReasonOk

`func (o *CounterfactualMetadata) GetFailureReasonOk() (*string, bool)`

GetFailureReasonOk returns a tuple with the FailureReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureReason

`func (o *CounterfactualMetadata) SetFailureReason(v string)`

SetFailureReason sets FailureReason field to given value.


### SetFailureReasonNil

`func (o *CounterfactualMetadata) SetFailureReasonNil(b bool)`

 SetFailureReasonNil sets the value for FailureReason to be an explicit nil

### UnsetFailureReason
`func (o *CounterfactualMetadata) UnsetFailureReason()`

UnsetFailureReason ensures that no value is present for FailureReason, not even an explicit nil
### GetMetrics

`func (o *CounterfactualMetadata) GetMetrics() AnyOf`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *CounterfactualMetadata) GetMetricsOk() (*AnyOf, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *CounterfactualMetadata) SetMetrics(v AnyOf)`

SetMetrics sets Metrics field to given value.


### SetMetricsNil

`func (o *CounterfactualMetadata) SetMetricsNil(b bool)`

 SetMetricsNil sets the value for Metrics to be an explicit nil

### UnsetMetrics
`func (o *CounterfactualMetadata) UnsetMetrics()`

UnsetMetrics ensures that no value is present for Metrics, not even an explicit nil
### GetDiff

`func (o *CounterfactualMetadata) GetDiff() AnyOf`

GetDiff returns the Diff field if non-nil, zero value otherwise.

### GetDiffOk

`func (o *CounterfactualMetadata) GetDiffOk() (*AnyOf, bool)`

GetDiffOk returns a tuple with the Diff field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDiff

`func (o *CounterfactualMetadata) SetDiff(v AnyOf)`

SetDiff sets Diff field to given value.


### SetDiffNil

`func (o *CounterfactualMetadata) SetDiffNil(b bool)`

 SetDiffNil sets the value for Diff to be an explicit nil

### UnsetDiff
`func (o *CounterfactualMetadata) UnsetDiff()`

UnsetDiff ensures that no value is present for Diff, not even an explicit nil
### GetCreatedAt

`func (o *CounterfactualMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CounterfactualMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CounterfactualMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


