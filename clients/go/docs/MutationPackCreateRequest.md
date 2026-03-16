# MutationPackCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** |  | 
**Description** | Pointer to **NullableString** |  | [optional] 
**Config** | **interface{}** |  | 
**CreditCost** | Pointer to **int32** |  | [optional] [default to 20]

## Methods

### NewMutationPackCreateRequest

`func NewMutationPackCreateRequest(name string, config interface{}, ) *MutationPackCreateRequest`

NewMutationPackCreateRequest instantiates a new MutationPackCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMutationPackCreateRequestWithDefaults

`func NewMutationPackCreateRequestWithDefaults() *MutationPackCreateRequest`

NewMutationPackCreateRequestWithDefaults instantiates a new MutationPackCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *MutationPackCreateRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *MutationPackCreateRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *MutationPackCreateRequest) SetName(v string)`

SetName sets Name field to given value.


### GetDescription

`func (o *MutationPackCreateRequest) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *MutationPackCreateRequest) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *MutationPackCreateRequest) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *MutationPackCreateRequest) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### SetDescriptionNil

`func (o *MutationPackCreateRequest) SetDescriptionNil(b bool)`

 SetDescriptionNil sets the value for Description to be an explicit nil

### UnsetDescription
`func (o *MutationPackCreateRequest) UnsetDescription()`

UnsetDescription ensures that no value is present for Description, not even an explicit nil
### GetConfig

`func (o *MutationPackCreateRequest) GetConfig() interface{}`

GetConfig returns the Config field if non-nil, zero value otherwise.

### GetConfigOk

`func (o *MutationPackCreateRequest) GetConfigOk() (*interface{}, bool)`

GetConfigOk returns a tuple with the Config field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfig

`func (o *MutationPackCreateRequest) SetConfig(v interface{})`

SetConfig sets Config field to given value.


### SetConfigNil

`func (o *MutationPackCreateRequest) SetConfigNil(b bool)`

 SetConfigNil sets the value for Config to be an explicit nil

### UnsetConfig
`func (o *MutationPackCreateRequest) UnsetConfig()`

UnsetConfig ensures that no value is present for Config, not even an explicit nil
### GetCreditCost

`func (o *MutationPackCreateRequest) GetCreditCost() int32`

GetCreditCost returns the CreditCost field if non-nil, zero value otherwise.

### GetCreditCostOk

`func (o *MutationPackCreateRequest) GetCreditCostOk() (*int32, bool)`

GetCreditCostOk returns a tuple with the CreditCost field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreditCost

`func (o *MutationPackCreateRequest) SetCreditCost(v int32)`

SetCreditCost sets CreditCost field to given value.

### HasCreditCost

`func (o *MutationPackCreateRequest) HasCreditCost() bool`

HasCreditCost returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


