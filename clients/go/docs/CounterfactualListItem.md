# CounterfactualListItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Strategy** | **string** |  | 
**Result** | **string** |  | 
**FailureReason** | **NullableString** |  | 
**Metrics** | [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | 
**Diff** | [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewCounterfactualListItem

`func NewCounterfactualListItem(strategy string, result string, failureReason NullableString, metrics NullableAnyOf, diff NullableAnyOf, createdAt time.Time, ) *CounterfactualListItem`

NewCounterfactualListItem instantiates a new CounterfactualListItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCounterfactualListItemWithDefaults

`func NewCounterfactualListItemWithDefaults() *CounterfactualListItem`

NewCounterfactualListItemWithDefaults instantiates a new CounterfactualListItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetStrategy

`func (o *CounterfactualListItem) GetStrategy() string`

GetStrategy returns the Strategy field if non-nil, zero value otherwise.

### GetStrategyOk

`func (o *CounterfactualListItem) GetStrategyOk() (*string, bool)`

GetStrategyOk returns a tuple with the Strategy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStrategy

`func (o *CounterfactualListItem) SetStrategy(v string)`

SetStrategy sets Strategy field to given value.


### GetResult

`func (o *CounterfactualListItem) GetResult() string`

GetResult returns the Result field if non-nil, zero value otherwise.

### GetResultOk

`func (o *CounterfactualListItem) GetResultOk() (*string, bool)`

GetResultOk returns a tuple with the Result field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResult

`func (o *CounterfactualListItem) SetResult(v string)`

SetResult sets Result field to given value.


### GetFailureReason

`func (o *CounterfactualListItem) GetFailureReason() string`

GetFailureReason returns the FailureReason field if non-nil, zero value otherwise.

### GetFailureReasonOk

`func (o *CounterfactualListItem) GetFailureReasonOk() (*string, bool)`

GetFailureReasonOk returns a tuple with the FailureReason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureReason

`func (o *CounterfactualListItem) SetFailureReason(v string)`

SetFailureReason sets FailureReason field to given value.


### SetFailureReasonNil

`func (o *CounterfactualListItem) SetFailureReasonNil(b bool)`

 SetFailureReasonNil sets the value for FailureReason to be an explicit nil

### UnsetFailureReason
`func (o *CounterfactualListItem) UnsetFailureReason()`

UnsetFailureReason ensures that no value is present for FailureReason, not even an explicit nil
### GetMetrics

`func (o *CounterfactualListItem) GetMetrics() AnyOf`

GetMetrics returns the Metrics field if non-nil, zero value otherwise.

### GetMetricsOk

`func (o *CounterfactualListItem) GetMetricsOk() (*AnyOf, bool)`

GetMetricsOk returns a tuple with the Metrics field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetrics

`func (o *CounterfactualListItem) SetMetrics(v AnyOf)`

SetMetrics sets Metrics field to given value.


### SetMetricsNil

`func (o *CounterfactualListItem) SetMetricsNil(b bool)`

 SetMetricsNil sets the value for Metrics to be an explicit nil

### UnsetMetrics
`func (o *CounterfactualListItem) UnsetMetrics()`

UnsetMetrics ensures that no value is present for Metrics, not even an explicit nil
### GetDiff

`func (o *CounterfactualListItem) GetDiff() AnyOf`

GetDiff returns the Diff field if non-nil, zero value otherwise.

### GetDiffOk

`func (o *CounterfactualListItem) GetDiffOk() (*AnyOf, bool)`

GetDiffOk returns a tuple with the Diff field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDiff

`func (o *CounterfactualListItem) SetDiff(v AnyOf)`

SetDiff sets Diff field to given value.


### SetDiffNil

`func (o *CounterfactualListItem) SetDiffNil(b bool)`

 SetDiffNil sets the value for Diff to be an explicit nil

### UnsetDiff
`func (o *CounterfactualListItem) UnsetDiff()`

UnsetDiff ensures that no value is present for Diff, not even an explicit nil
### GetCreatedAt

`func (o *CounterfactualListItem) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CounterfactualListItem) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CounterfactualListItem) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


