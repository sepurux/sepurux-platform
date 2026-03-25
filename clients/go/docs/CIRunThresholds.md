# CIRunThresholds

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MinPassRate** | **float32** |  | 
**MaxUnsafe** | **int32** |  | 
**MaxFailures** | Pointer to **NullableInt32** |  | [optional] 
**MinReliabilityScore** | Pointer to **NullableFloat32** |  | [optional] 
**MinMutationCategories** | Pointer to **NullableInt32** |  | [optional] 
**RequiredMutationCategories** | Pointer to **[]string** |  | [optional] 

## Methods

### NewCIRunThresholds

`func NewCIRunThresholds(minPassRate float32, maxUnsafe int32, ) *CIRunThresholds`

NewCIRunThresholds instantiates a new CIRunThresholds object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCIRunThresholdsWithDefaults

`func NewCIRunThresholdsWithDefaults() *CIRunThresholds`

NewCIRunThresholdsWithDefaults instantiates a new CIRunThresholds object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMinPassRate

`func (o *CIRunThresholds) GetMinPassRate() float32`

GetMinPassRate returns the MinPassRate field if non-nil, zero value otherwise.

### GetMinPassRateOk

`func (o *CIRunThresholds) GetMinPassRateOk() (*float32, bool)`

GetMinPassRateOk returns a tuple with the MinPassRate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMinPassRate

`func (o *CIRunThresholds) SetMinPassRate(v float32)`

SetMinPassRate sets MinPassRate field to given value.


### GetMaxUnsafe

`func (o *CIRunThresholds) GetMaxUnsafe() int32`

GetMaxUnsafe returns the MaxUnsafe field if non-nil, zero value otherwise.

### GetMaxUnsafeOk

`func (o *CIRunThresholds) GetMaxUnsafeOk() (*int32, bool)`

GetMaxUnsafeOk returns a tuple with the MaxUnsafe field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMaxUnsafe

`func (o *CIRunThresholds) SetMaxUnsafe(v int32)`

SetMaxUnsafe sets MaxUnsafe field to given value.


### GetMaxFailures

`func (o *CIRunThresholds) GetMaxFailures() int32`

GetMaxFailures returns the MaxFailures field if non-nil, zero value otherwise.

### GetMaxFailuresOk

`func (o *CIRunThresholds) GetMaxFailuresOk() (*int32, bool)`

GetMaxFailuresOk returns a tuple with the MaxFailures field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMaxFailures

`func (o *CIRunThresholds) SetMaxFailures(v int32)`

SetMaxFailures sets MaxFailures field to given value.

### HasMaxFailures

`func (o *CIRunThresholds) HasMaxFailures() bool`

HasMaxFailures returns a boolean if a field has been set.

### SetMaxFailuresNil

`func (o *CIRunThresholds) SetMaxFailuresNil(b bool)`

 SetMaxFailuresNil sets the value for MaxFailures to be an explicit nil

### UnsetMaxFailures
`func (o *CIRunThresholds) UnsetMaxFailures()`

UnsetMaxFailures ensures that no value is present for MaxFailures, not even an explicit nil
### GetMinReliabilityScore

`func (o *CIRunThresholds) GetMinReliabilityScore() float32`

GetMinReliabilityScore returns the MinReliabilityScore field if non-nil, zero value otherwise.

### GetMinReliabilityScoreOk

`func (o *CIRunThresholds) GetMinReliabilityScoreOk() (*float32, bool)`

GetMinReliabilityScoreOk returns a tuple with the MinReliabilityScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMinReliabilityScore

`func (o *CIRunThresholds) SetMinReliabilityScore(v float32)`

SetMinReliabilityScore sets MinReliabilityScore field to given value.

### HasMinReliabilityScore

`func (o *CIRunThresholds) HasMinReliabilityScore() bool`

HasMinReliabilityScore returns a boolean if a field has been set.

### SetMinReliabilityScoreNil

`func (o *CIRunThresholds) SetMinReliabilityScoreNil(b bool)`

 SetMinReliabilityScoreNil sets the value for MinReliabilityScore to be an explicit nil

### UnsetMinReliabilityScore
`func (o *CIRunThresholds) UnsetMinReliabilityScore()`

UnsetMinReliabilityScore ensures that no value is present for MinReliabilityScore, not even an explicit nil
### GetMinMutationCategories

`func (o *CIRunThresholds) GetMinMutationCategories() int32`

GetMinMutationCategories returns the MinMutationCategories field if non-nil, zero value otherwise.

### GetMinMutationCategoriesOk

`func (o *CIRunThresholds) GetMinMutationCategoriesOk() (*int32, bool)`

GetMinMutationCategoriesOk returns a tuple with the MinMutationCategories field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMinMutationCategories

`func (o *CIRunThresholds) SetMinMutationCategories(v int32)`

SetMinMutationCategories sets MinMutationCategories field to given value.

### HasMinMutationCategories

`func (o *CIRunThresholds) HasMinMutationCategories() bool`

HasMinMutationCategories returns a boolean if a field has been set.

### SetMinMutationCategoriesNil

`func (o *CIRunThresholds) SetMinMutationCategoriesNil(b bool)`

 SetMinMutationCategoriesNil sets the value for MinMutationCategories to be an explicit nil

### UnsetMinMutationCategories
`func (o *CIRunThresholds) UnsetMinMutationCategories()`

UnsetMinMutationCategories ensures that no value is present for MinMutationCategories, not even an explicit nil
### GetRequiredMutationCategories

`func (o *CIRunThresholds) GetRequiredMutationCategories() []string`

GetRequiredMutationCategories returns the RequiredMutationCategories field if non-nil, zero value otherwise.

### GetRequiredMutationCategoriesOk

`func (o *CIRunThresholds) GetRequiredMutationCategoriesOk() (*[]string, bool)`

GetRequiredMutationCategoriesOk returns a tuple with the RequiredMutationCategories field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRequiredMutationCategories

`func (o *CIRunThresholds) SetRequiredMutationCategories(v []string)`

SetRequiredMutationCategories sets RequiredMutationCategories field to given value.

### HasRequiredMutationCategories

`func (o *CIRunThresholds) HasRequiredMutationCategories() bool`

HasRequiredMutationCategories returns a boolean if a field has been set.

### SetRequiredMutationCategoriesNil

`func (o *CIRunThresholds) SetRequiredMutationCategoriesNil(b bool)`

 SetRequiredMutationCategoriesNil sets the value for RequiredMutationCategories to be an explicit nil

### UnsetRequiredMutationCategories
`func (o *CIRunThresholds) UnsetRequiredMutationCategories()`

UnsetRequiredMutationCategories ensures that no value is present for RequiredMutationCategories, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


