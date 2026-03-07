# ToolFragilityItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tool** | **string** |  | 
**Attempts** | **int32** |  | 
**Failures** | **int32** |  | 
**FailureRate** | **float32** |  | 
**TopMutations** | [**[]ToolFragilityTopMutation**](ToolFragilityTopMutation.md) |  | 
**TopReasons** | [**[]ToolFragilityTopReason**](ToolFragilityTopReason.md) |  | 

## Methods

### NewToolFragilityItem

`func NewToolFragilityItem(tool string, attempts int32, failures int32, failureRate float32, topMutations []ToolFragilityTopMutation, topReasons []ToolFragilityTopReason, ) *ToolFragilityItem`

NewToolFragilityItem instantiates a new ToolFragilityItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewToolFragilityItemWithDefaults

`func NewToolFragilityItemWithDefaults() *ToolFragilityItem`

NewToolFragilityItemWithDefaults instantiates a new ToolFragilityItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTool

`func (o *ToolFragilityItem) GetTool() string`

GetTool returns the Tool field if non-nil, zero value otherwise.

### GetToolOk

`func (o *ToolFragilityItem) GetToolOk() (*string, bool)`

GetToolOk returns a tuple with the Tool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTool

`func (o *ToolFragilityItem) SetTool(v string)`

SetTool sets Tool field to given value.


### GetAttempts

`func (o *ToolFragilityItem) GetAttempts() int32`

GetAttempts returns the Attempts field if non-nil, zero value otherwise.

### GetAttemptsOk

`func (o *ToolFragilityItem) GetAttemptsOk() (*int32, bool)`

GetAttemptsOk returns a tuple with the Attempts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttempts

`func (o *ToolFragilityItem) SetAttempts(v int32)`

SetAttempts sets Attempts field to given value.


### GetFailures

`func (o *ToolFragilityItem) GetFailures() int32`

GetFailures returns the Failures field if non-nil, zero value otherwise.

### GetFailuresOk

`func (o *ToolFragilityItem) GetFailuresOk() (*int32, bool)`

GetFailuresOk returns a tuple with the Failures field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailures

`func (o *ToolFragilityItem) SetFailures(v int32)`

SetFailures sets Failures field to given value.


### GetFailureRate

`func (o *ToolFragilityItem) GetFailureRate() float32`

GetFailureRate returns the FailureRate field if non-nil, zero value otherwise.

### GetFailureRateOk

`func (o *ToolFragilityItem) GetFailureRateOk() (*float32, bool)`

GetFailureRateOk returns a tuple with the FailureRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureRate

`func (o *ToolFragilityItem) SetFailureRate(v float32)`

SetFailureRate sets FailureRate field to given value.


### GetTopMutations

`func (o *ToolFragilityItem) GetTopMutations() []ToolFragilityTopMutation`

GetTopMutations returns the TopMutations field if non-nil, zero value otherwise.

### GetTopMutationsOk

`func (o *ToolFragilityItem) GetTopMutationsOk() (*[]ToolFragilityTopMutation, bool)`

GetTopMutationsOk returns a tuple with the TopMutations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopMutations

`func (o *ToolFragilityItem) SetTopMutations(v []ToolFragilityTopMutation)`

SetTopMutations sets TopMutations field to given value.


### GetTopReasons

`func (o *ToolFragilityItem) GetTopReasons() []ToolFragilityTopReason`

GetTopReasons returns the TopReasons field if non-nil, zero value otherwise.

### GetTopReasonsOk

`func (o *ToolFragilityItem) GetTopReasonsOk() (*[]ToolFragilityTopReason, bool)`

GetTopReasonsOk returns a tuple with the TopReasons field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopReasons

`func (o *ToolFragilityItem) SetTopReasons(v []ToolFragilityTopReason)`

SetTopReasons sets TopReasons field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


