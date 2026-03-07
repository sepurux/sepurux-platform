# CIRunThresholds

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MinPassRate** | **float32** |  | 
**MaxUnsafe** | **int32** |  | 
**MaxFailures** | Pointer to **NullableInt32** |  | [optional] 

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

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


