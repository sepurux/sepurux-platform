# ToolUsageStatsItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Tool** | **string** |  | 
**Attempts** | **int32** |  | 
**Calls** | **int32** |  | 

## Methods

### NewToolUsageStatsItem

`func NewToolUsageStatsItem(tool string, attempts int32, calls int32, ) *ToolUsageStatsItem`

NewToolUsageStatsItem instantiates a new ToolUsageStatsItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewToolUsageStatsItemWithDefaults

`func NewToolUsageStatsItemWithDefaults() *ToolUsageStatsItem`

NewToolUsageStatsItemWithDefaults instantiates a new ToolUsageStatsItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTool

`func (o *ToolUsageStatsItem) GetTool() string`

GetTool returns the Tool field if non-nil, zero value otherwise.

### GetToolOk

`func (o *ToolUsageStatsItem) GetToolOk() (*string, bool)`

GetToolOk returns a tuple with the Tool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTool

`func (o *ToolUsageStatsItem) SetTool(v string)`

SetTool sets Tool field to given value.


### GetAttempts

`func (o *ToolUsageStatsItem) GetAttempts() int32`

GetAttempts returns the Attempts field if non-nil, zero value otherwise.

### GetAttemptsOk

`func (o *ToolUsageStatsItem) GetAttemptsOk() (*int32, bool)`

GetAttemptsOk returns a tuple with the Attempts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttempts

`func (o *ToolUsageStatsItem) SetAttempts(v int32)`

SetAttempts sets Attempts field to given value.


### GetCalls

`func (o *ToolUsageStatsItem) GetCalls() int32`

GetCalls returns the Calls field if non-nil, zero value otherwise.

### GetCallsOk

`func (o *ToolUsageStatsItem) GetCallsOk() (*int32, bool)`

GetCallsOk returns a tuple with the Calls field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCalls

`func (o *ToolUsageStatsItem) SetCalls(v int32)`

SetCalls sets Calls field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


