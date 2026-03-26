# CIRunStatusResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**RunId** | **string** |  | 
**Status** | **string** |  | 
**Decision** | **string** |  | 
**PassRate** | **float32** |  | 
**UnsafeAttempts** | **int32** |  | 
**Failures** | **int32** |  | 
**TopFailingTools** | [**[]ToolCount**](ToolCount.md) |  | 
**MutationCategories** | Pointer to **[]string** |  | [optional] 
**MutationCoverageScore** | Pointer to **NullableInt32** |  | [optional] 
**DashboardUrl** | **string** |  | 

## Methods

### NewCIRunStatusResponse

`func NewCIRunStatusResponse(runId string, status string, decision string, passRate float32, unsafeAttempts int32, failures int32, topFailingTools []ToolCount, dashboardUrl string, ) *CIRunStatusResponse`

NewCIRunStatusResponse instantiates a new CIRunStatusResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCIRunStatusResponseWithDefaults

`func NewCIRunStatusResponseWithDefaults() *CIRunStatusResponse`

NewCIRunStatusResponseWithDefaults instantiates a new CIRunStatusResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetRunId

`func (o *CIRunStatusResponse) GetRunId() string`

GetRunId returns the RunId field if non-nil, zero value otherwise.

### GetRunIdOk

`func (o *CIRunStatusResponse) GetRunIdOk() (*string, bool)`

GetRunIdOk returns a tuple with the RunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRunId

`func (o *CIRunStatusResponse) SetRunId(v string)`

SetRunId sets RunId field to given value.


### GetStatus

`func (o *CIRunStatusResponse) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CIRunStatusResponse) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CIRunStatusResponse) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetDecision

`func (o *CIRunStatusResponse) GetDecision() string`

GetDecision returns the Decision field if non-nil, zero value otherwise.

### GetDecisionOk

`func (o *CIRunStatusResponse) GetDecisionOk() (*string, bool)`

GetDecisionOk returns a tuple with the Decision field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDecision

`func (o *CIRunStatusResponse) SetDecision(v string)`

SetDecision sets Decision field to given value.


### GetPassRate

`func (o *CIRunStatusResponse) GetPassRate() float32`

GetPassRate returns the PassRate field if non-nil, zero value otherwise.

### GetPassRateOk

`func (o *CIRunStatusResponse) GetPassRateOk() (*float32, bool)`

GetPassRateOk returns a tuple with the PassRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPassRate

`func (o *CIRunStatusResponse) SetPassRate(v float32)`

SetPassRate sets PassRate field to given value.


### GetUnsafeAttempts

`func (o *CIRunStatusResponse) GetUnsafeAttempts() int32`

GetUnsafeAttempts returns the UnsafeAttempts field if non-nil, zero value otherwise.

### GetUnsafeAttemptsOk

`func (o *CIRunStatusResponse) GetUnsafeAttemptsOk() (*int32, bool)`

GetUnsafeAttemptsOk returns a tuple with the UnsafeAttempts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUnsafeAttempts

`func (o *CIRunStatusResponse) SetUnsafeAttempts(v int32)`

SetUnsafeAttempts sets UnsafeAttempts field to given value.


### GetFailures

`func (o *CIRunStatusResponse) GetFailures() int32`

GetFailures returns the Failures field if non-nil, zero value otherwise.

### GetFailuresOk

`func (o *CIRunStatusResponse) GetFailuresOk() (*int32, bool)`

GetFailuresOk returns a tuple with the Failures field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailures

`func (o *CIRunStatusResponse) SetFailures(v int32)`

SetFailures sets Failures field to given value.


### GetTopFailingTools

`func (o *CIRunStatusResponse) GetTopFailingTools() []ToolCount`

GetTopFailingTools returns the TopFailingTools field if non-nil, zero value otherwise.

### GetTopFailingToolsOk

`func (o *CIRunStatusResponse) GetTopFailingToolsOk() (*[]ToolCount, bool)`

GetTopFailingToolsOk returns a tuple with the TopFailingTools field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopFailingTools

`func (o *CIRunStatusResponse) SetTopFailingTools(v []ToolCount)`

SetTopFailingTools sets TopFailingTools field to given value.


### GetMutationCategories

`func (o *CIRunStatusResponse) GetMutationCategories() []string`

GetMutationCategories returns the MutationCategories field if non-nil, zero value otherwise.

### GetMutationCategoriesOk

`func (o *CIRunStatusResponse) GetMutationCategoriesOk() (*[]string, bool)`

GetMutationCategoriesOk returns a tuple with the MutationCategories field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationCategories

`func (o *CIRunStatusResponse) SetMutationCategories(v []string)`

SetMutationCategories sets MutationCategories field to given value.

### HasMutationCategories

`func (o *CIRunStatusResponse) HasMutationCategories() bool`

HasMutationCategories returns a boolean if a field has been set.

### GetMutationCoverageScore

`func (o *CIRunStatusResponse) GetMutationCoverageScore() int32`

GetMutationCoverageScore returns the MutationCoverageScore field if non-nil, zero value otherwise.

### GetMutationCoverageScoreOk

`func (o *CIRunStatusResponse) GetMutationCoverageScoreOk() (*int32, bool)`

GetMutationCoverageScoreOk returns a tuple with the MutationCoverageScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationCoverageScore

`func (o *CIRunStatusResponse) SetMutationCoverageScore(v int32)`

SetMutationCoverageScore sets MutationCoverageScore field to given value.

### HasMutationCoverageScore

`func (o *CIRunStatusResponse) HasMutationCoverageScore() bool`

HasMutationCoverageScore returns a boolean if a field has been set.

### SetMutationCoverageScoreNil

`func (o *CIRunStatusResponse) SetMutationCoverageScoreNil(b bool)`

 SetMutationCoverageScoreNil sets the value for MutationCoverageScore to be an explicit nil

### UnsetMutationCoverageScore
`func (o *CIRunStatusResponse) UnsetMutationCoverageScore()`

UnsetMutationCoverageScore ensures that no value is present for MutationCoverageScore, not even an explicit nil
### GetDashboardUrl

`func (o *CIRunStatusResponse) GetDashboardUrl() string`

GetDashboardUrl returns the DashboardUrl field if non-nil, zero value otherwise.

### GetDashboardUrlOk

`func (o *CIRunStatusResponse) GetDashboardUrlOk() (*string, bool)`

GetDashboardUrlOk returns a tuple with the DashboardUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDashboardUrl

`func (o *CIRunStatusResponse) SetDashboardUrl(v string)`

SetDashboardUrl sets DashboardUrl field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


