# MutationSummaryResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**WindowDays** | **int32** |  | 
**Mutations** | [**[]MutationSummaryItem**](MutationSummaryItem.md) |  | 

## Methods

### NewMutationSummaryResponse

`func NewMutationSummaryResponse(windowDays int32, mutations []MutationSummaryItem, ) *MutationSummaryResponse`

NewMutationSummaryResponse instantiates a new MutationSummaryResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMutationSummaryResponseWithDefaults

`func NewMutationSummaryResponseWithDefaults() *MutationSummaryResponse`

NewMutationSummaryResponseWithDefaults instantiates a new MutationSummaryResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetWindowDays

`func (o *MutationSummaryResponse) GetWindowDays() int32`

GetWindowDays returns the WindowDays field if non-nil, zero value otherwise.

### GetWindowDaysOk

`func (o *MutationSummaryResponse) GetWindowDaysOk() (*int32, bool)`

GetWindowDaysOk returns a tuple with the WindowDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWindowDays

`func (o *MutationSummaryResponse) SetWindowDays(v int32)`

SetWindowDays sets WindowDays field to given value.


### GetMutations

`func (o *MutationSummaryResponse) GetMutations() []MutationSummaryItem`

GetMutations returns the Mutations field if non-nil, zero value otherwise.

### GetMutationsOk

`func (o *MutationSummaryResponse) GetMutationsOk() (*[]MutationSummaryItem, bool)`

GetMutationsOk returns a tuple with the Mutations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutations

`func (o *MutationSummaryResponse) SetMutations(v []MutationSummaryItem)`

SetMutations sets Mutations field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


