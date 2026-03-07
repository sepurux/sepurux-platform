# MutationSummaryItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MutationId** | **string** |  | 
**Failures** | **int32** |  | 
**TopTools** | [**[]MutationSummaryTopTool**](MutationSummaryTopTool.md) |  | 
**TopReasons** | [**[]MutationSummaryTopReason**](MutationSummaryTopReason.md) |  | 

## Methods

### NewMutationSummaryItem

`func NewMutationSummaryItem(mutationId string, failures int32, topTools []MutationSummaryTopTool, topReasons []MutationSummaryTopReason, ) *MutationSummaryItem`

NewMutationSummaryItem instantiates a new MutationSummaryItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMutationSummaryItemWithDefaults

`func NewMutationSummaryItemWithDefaults() *MutationSummaryItem`

NewMutationSummaryItemWithDefaults instantiates a new MutationSummaryItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMutationId

`func (o *MutationSummaryItem) GetMutationId() string`

GetMutationId returns the MutationId field if non-nil, zero value otherwise.

### GetMutationIdOk

`func (o *MutationSummaryItem) GetMutationIdOk() (*string, bool)`

GetMutationIdOk returns a tuple with the MutationId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationId

`func (o *MutationSummaryItem) SetMutationId(v string)`

SetMutationId sets MutationId field to given value.


### GetFailures

`func (o *MutationSummaryItem) GetFailures() int32`

GetFailures returns the Failures field if non-nil, zero value otherwise.

### GetFailuresOk

`func (o *MutationSummaryItem) GetFailuresOk() (*int32, bool)`

GetFailuresOk returns a tuple with the Failures field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailures

`func (o *MutationSummaryItem) SetFailures(v int32)`

SetFailures sets Failures field to given value.


### GetTopTools

`func (o *MutationSummaryItem) GetTopTools() []MutationSummaryTopTool`

GetTopTools returns the TopTools field if non-nil, zero value otherwise.

### GetTopToolsOk

`func (o *MutationSummaryItem) GetTopToolsOk() (*[]MutationSummaryTopTool, bool)`

GetTopToolsOk returns a tuple with the TopTools field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopTools

`func (o *MutationSummaryItem) SetTopTools(v []MutationSummaryTopTool)`

SetTopTools sets TopTools field to given value.


### GetTopReasons

`func (o *MutationSummaryItem) GetTopReasons() []MutationSummaryTopReason`

GetTopReasons returns the TopReasons field if non-nil, zero value otherwise.

### GetTopReasonsOk

`func (o *MutationSummaryItem) GetTopReasonsOk() (*[]MutationSummaryTopReason, bool)`

GetTopReasonsOk returns a tuple with the TopReasons field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopReasons

`func (o *MutationSummaryItem) SetTopReasons(v []MutationSummaryTopReason)`

SetTopReasons sets TopReasons field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


