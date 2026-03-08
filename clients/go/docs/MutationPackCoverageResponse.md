# MutationPackCoverageResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MutationPackId** | **string** |  | 
**CoverageScore** | **int32** |  | 
**Categories** | Pointer to **[]string** |  | [optional] 
**Warning** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewMutationPackCoverageResponse

`func NewMutationPackCoverageResponse(mutationPackId string, coverageScore int32, ) *MutationPackCoverageResponse`

NewMutationPackCoverageResponse instantiates a new MutationPackCoverageResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMutationPackCoverageResponseWithDefaults

`func NewMutationPackCoverageResponseWithDefaults() *MutationPackCoverageResponse`

NewMutationPackCoverageResponseWithDefaults instantiates a new MutationPackCoverageResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMutationPackId

`func (o *MutationPackCoverageResponse) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *MutationPackCoverageResponse) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *MutationPackCoverageResponse) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.


### GetCoverageScore

`func (o *MutationPackCoverageResponse) GetCoverageScore() int32`

GetCoverageScore returns the CoverageScore field if non-nil, zero value otherwise.

### GetCoverageScoreOk

`func (o *MutationPackCoverageResponse) GetCoverageScoreOk() (*int32, bool)`

GetCoverageScoreOk returns a tuple with the CoverageScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCoverageScore

`func (o *MutationPackCoverageResponse) SetCoverageScore(v int32)`

SetCoverageScore sets CoverageScore field to given value.


### GetCategories

`func (o *MutationPackCoverageResponse) GetCategories() []string`

GetCategories returns the Categories field if non-nil, zero value otherwise.

### GetCategoriesOk

`func (o *MutationPackCoverageResponse) GetCategoriesOk() (*[]string, bool)`

GetCategoriesOk returns a tuple with the Categories field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCategories

`func (o *MutationPackCoverageResponse) SetCategories(v []string)`

SetCategories sets Categories field to given value.

### HasCategories

`func (o *MutationPackCoverageResponse) HasCategories() bool`

HasCategories returns a boolean if a field has been set.

### GetWarning

`func (o *MutationPackCoverageResponse) GetWarning() string`

GetWarning returns the Warning field if non-nil, zero value otherwise.

### GetWarningOk

`func (o *MutationPackCoverageResponse) GetWarningOk() (*string, bool)`

GetWarningOk returns a tuple with the Warning field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWarning

`func (o *MutationPackCoverageResponse) SetWarning(v string)`

SetWarning sets Warning field to given value.

### HasWarning

`func (o *MutationPackCoverageResponse) HasWarning() bool`

HasWarning returns a boolean if a field has been set.

### SetWarningNil

`func (o *MutationPackCoverageResponse) SetWarningNil(b bool)`

 SetWarningNil sets the value for Warning to be an explicit nil

### UnsetWarning
`func (o *MutationPackCoverageResponse) UnsetWarning()`

UnsetWarning ensures that no value is present for Warning, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


