# RunStatsResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**RunId** | **string** |  | 
**Attempts** | [**RunAttemptsSummary**](RunAttemptsSummary.md) |  | 
**FailuresByTool** | [**[]ToolCountPct**](ToolCountPct.md) |  | 
**ToolsUsage** | [**[]ToolUsageStatsItem**](ToolUsageStatsItem.md) |  | 
**FailuresByMutation** | [**[]MutationCountPct**](MutationCountPct.md) |  | 
**TopFailureReasons** | [**[]ReasonCountPct**](ReasonCountPct.md) |  | 
**FirstFailureStepDistribution** | [**[]EventIndexCount**](EventIndexCount.md) |  | 
**Attribution** | **string** |  | 
**MostLethalMutations** | [**[]LethalMutationInsight**](LethalMutationInsight.md) |  | 
**InjectionBlocks** | Pointer to **int32** |  | [optional] [default to 0]
**InjectionSanitizations** | Pointer to **int32** |  | [optional] [default to 0]
**Insights** | [**[]RunInsight**](RunInsight.md) |  | 

## Methods

### NewRunStatsResponse

`func NewRunStatsResponse(runId string, attempts RunAttemptsSummary, failuresByTool []ToolCountPct, toolsUsage []ToolUsageStatsItem, failuresByMutation []MutationCountPct, topFailureReasons []ReasonCountPct, firstFailureStepDistribution []EventIndexCount, attribution string, mostLethalMutations []LethalMutationInsight, insights []RunInsight, ) *RunStatsResponse`

NewRunStatsResponse instantiates a new RunStatsResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRunStatsResponseWithDefaults

`func NewRunStatsResponseWithDefaults() *RunStatsResponse`

NewRunStatsResponseWithDefaults instantiates a new RunStatsResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetRunId

`func (o *RunStatsResponse) GetRunId() string`

GetRunId returns the RunId field if non-nil, zero value otherwise.

### GetRunIdOk

`func (o *RunStatsResponse) GetRunIdOk() (*string, bool)`

GetRunIdOk returns a tuple with the RunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRunId

`func (o *RunStatsResponse) SetRunId(v string)`

SetRunId sets RunId field to given value.


### GetAttempts

`func (o *RunStatsResponse) GetAttempts() RunAttemptsSummary`

GetAttempts returns the Attempts field if non-nil, zero value otherwise.

### GetAttemptsOk

`func (o *RunStatsResponse) GetAttemptsOk() (*RunAttemptsSummary, bool)`

GetAttemptsOk returns a tuple with the Attempts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttempts

`func (o *RunStatsResponse) SetAttempts(v RunAttemptsSummary)`

SetAttempts sets Attempts field to given value.


### GetFailuresByTool

`func (o *RunStatsResponse) GetFailuresByTool() []ToolCountPct`

GetFailuresByTool returns the FailuresByTool field if non-nil, zero value otherwise.

### GetFailuresByToolOk

`func (o *RunStatsResponse) GetFailuresByToolOk() (*[]ToolCountPct, bool)`

GetFailuresByToolOk returns a tuple with the FailuresByTool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailuresByTool

`func (o *RunStatsResponse) SetFailuresByTool(v []ToolCountPct)`

SetFailuresByTool sets FailuresByTool field to given value.


### GetToolsUsage

`func (o *RunStatsResponse) GetToolsUsage() []ToolUsageStatsItem`

GetToolsUsage returns the ToolsUsage field if non-nil, zero value otherwise.

### GetToolsUsageOk

`func (o *RunStatsResponse) GetToolsUsageOk() (*[]ToolUsageStatsItem, bool)`

GetToolsUsageOk returns a tuple with the ToolsUsage field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToolsUsage

`func (o *RunStatsResponse) SetToolsUsage(v []ToolUsageStatsItem)`

SetToolsUsage sets ToolsUsage field to given value.


### GetFailuresByMutation

`func (o *RunStatsResponse) GetFailuresByMutation() []MutationCountPct`

GetFailuresByMutation returns the FailuresByMutation field if non-nil, zero value otherwise.

### GetFailuresByMutationOk

`func (o *RunStatsResponse) GetFailuresByMutationOk() (*[]MutationCountPct, bool)`

GetFailuresByMutationOk returns a tuple with the FailuresByMutation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailuresByMutation

`func (o *RunStatsResponse) SetFailuresByMutation(v []MutationCountPct)`

SetFailuresByMutation sets FailuresByMutation field to given value.


### GetTopFailureReasons

`func (o *RunStatsResponse) GetTopFailureReasons() []ReasonCountPct`

GetTopFailureReasons returns the TopFailureReasons field if non-nil, zero value otherwise.

### GetTopFailureReasonsOk

`func (o *RunStatsResponse) GetTopFailureReasonsOk() (*[]ReasonCountPct, bool)`

GetTopFailureReasonsOk returns a tuple with the TopFailureReasons field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopFailureReasons

`func (o *RunStatsResponse) SetTopFailureReasons(v []ReasonCountPct)`

SetTopFailureReasons sets TopFailureReasons field to given value.


### GetFirstFailureStepDistribution

`func (o *RunStatsResponse) GetFirstFailureStepDistribution() []EventIndexCount`

GetFirstFailureStepDistribution returns the FirstFailureStepDistribution field if non-nil, zero value otherwise.

### GetFirstFailureStepDistributionOk

`func (o *RunStatsResponse) GetFirstFailureStepDistributionOk() (*[]EventIndexCount, bool)`

GetFirstFailureStepDistributionOk returns a tuple with the FirstFailureStepDistribution field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFirstFailureStepDistribution

`func (o *RunStatsResponse) SetFirstFailureStepDistribution(v []EventIndexCount)`

SetFirstFailureStepDistribution sets FirstFailureStepDistribution field to given value.


### GetAttribution

`func (o *RunStatsResponse) GetAttribution() string`

GetAttribution returns the Attribution field if non-nil, zero value otherwise.

### GetAttributionOk

`func (o *RunStatsResponse) GetAttributionOk() (*string, bool)`

GetAttributionOk returns a tuple with the Attribution field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttribution

`func (o *RunStatsResponse) SetAttribution(v string)`

SetAttribution sets Attribution field to given value.


### GetMostLethalMutations

`func (o *RunStatsResponse) GetMostLethalMutations() []LethalMutationInsight`

GetMostLethalMutations returns the MostLethalMutations field if non-nil, zero value otherwise.

### GetMostLethalMutationsOk

`func (o *RunStatsResponse) GetMostLethalMutationsOk() (*[]LethalMutationInsight, bool)`

GetMostLethalMutationsOk returns a tuple with the MostLethalMutations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMostLethalMutations

`func (o *RunStatsResponse) SetMostLethalMutations(v []LethalMutationInsight)`

SetMostLethalMutations sets MostLethalMutations field to given value.


### GetInjectionBlocks

`func (o *RunStatsResponse) GetInjectionBlocks() int32`

GetInjectionBlocks returns the InjectionBlocks field if non-nil, zero value otherwise.

### GetInjectionBlocksOk

`func (o *RunStatsResponse) GetInjectionBlocksOk() (*int32, bool)`

GetInjectionBlocksOk returns a tuple with the InjectionBlocks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInjectionBlocks

`func (o *RunStatsResponse) SetInjectionBlocks(v int32)`

SetInjectionBlocks sets InjectionBlocks field to given value.

### HasInjectionBlocks

`func (o *RunStatsResponse) HasInjectionBlocks() bool`

HasInjectionBlocks returns a boolean if a field has been set.

### GetInjectionSanitizations

`func (o *RunStatsResponse) GetInjectionSanitizations() int32`

GetInjectionSanitizations returns the InjectionSanitizations field if non-nil, zero value otherwise.

### GetInjectionSanitizationsOk

`func (o *RunStatsResponse) GetInjectionSanitizationsOk() (*int32, bool)`

GetInjectionSanitizationsOk returns a tuple with the InjectionSanitizations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInjectionSanitizations

`func (o *RunStatsResponse) SetInjectionSanitizations(v int32)`

SetInjectionSanitizations sets InjectionSanitizations field to given value.

### HasInjectionSanitizations

`func (o *RunStatsResponse) HasInjectionSanitizations() bool`

HasInjectionSanitizations returns a boolean if a field has been set.

### GetInsights

`func (o *RunStatsResponse) GetInsights() []RunInsight`

GetInsights returns the Insights field if non-nil, zero value otherwise.

### GetInsightsOk

`func (o *RunStatsResponse) GetInsightsOk() (*[]RunInsight, bool)`

GetInsightsOk returns a tuple with the Insights field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInsights

`func (o *RunStatsResponse) SetInsights(v []RunInsight)`

SetInsights sets Insights field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


