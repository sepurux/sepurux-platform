# PolicyPackUpdateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | Pointer to **NullableString** |  | [optional] 
**Engine** | Pointer to **NullableString** |  | [optional] 
**Policy** | **interface{}** |  | 
**CreatedBy** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewPolicyPackUpdateRequest

`func NewPolicyPackUpdateRequest(policy interface{}, ) *PolicyPackUpdateRequest`

NewPolicyPackUpdateRequest instantiates a new PolicyPackUpdateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPolicyPackUpdateRequestWithDefaults

`func NewPolicyPackUpdateRequestWithDefaults() *PolicyPackUpdateRequest`

NewPolicyPackUpdateRequestWithDefaults instantiates a new PolicyPackUpdateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *PolicyPackUpdateRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *PolicyPackUpdateRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *PolicyPackUpdateRequest) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *PolicyPackUpdateRequest) HasName() bool`

HasName returns a boolean if a field has been set.

### SetNameNil

`func (o *PolicyPackUpdateRequest) SetNameNil(b bool)`

 SetNameNil sets the value for Name to be an explicit nil

### UnsetName
`func (o *PolicyPackUpdateRequest) UnsetName()`

UnsetName ensures that no value is present for Name, not even an explicit nil
### GetEngine

`func (o *PolicyPackUpdateRequest) GetEngine() string`

GetEngine returns the Engine field if non-nil, zero value otherwise.

### GetEngineOk

`func (o *PolicyPackUpdateRequest) GetEngineOk() (*string, bool)`

GetEngineOk returns a tuple with the Engine field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEngine

`func (o *PolicyPackUpdateRequest) SetEngine(v string)`

SetEngine sets Engine field to given value.

### HasEngine

`func (o *PolicyPackUpdateRequest) HasEngine() bool`

HasEngine returns a boolean if a field has been set.

### SetEngineNil

`func (o *PolicyPackUpdateRequest) SetEngineNil(b bool)`

 SetEngineNil sets the value for Engine to be an explicit nil

### UnsetEngine
`func (o *PolicyPackUpdateRequest) UnsetEngine()`

UnsetEngine ensures that no value is present for Engine, not even an explicit nil
### GetPolicy

`func (o *PolicyPackUpdateRequest) GetPolicy() interface{}`

GetPolicy returns the Policy field if non-nil, zero value otherwise.

### GetPolicyOk

`func (o *PolicyPackUpdateRequest) GetPolicyOk() (*interface{}, bool)`

GetPolicyOk returns a tuple with the Policy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicy

`func (o *PolicyPackUpdateRequest) SetPolicy(v interface{})`

SetPolicy sets Policy field to given value.


### SetPolicyNil

`func (o *PolicyPackUpdateRequest) SetPolicyNil(b bool)`

 SetPolicyNil sets the value for Policy to be an explicit nil

### UnsetPolicy
`func (o *PolicyPackUpdateRequest) UnsetPolicy()`

UnsetPolicy ensures that no value is present for Policy, not even an explicit nil
### GetCreatedBy

`func (o *PolicyPackUpdateRequest) GetCreatedBy() string`

GetCreatedBy returns the CreatedBy field if non-nil, zero value otherwise.

### GetCreatedByOk

`func (o *PolicyPackUpdateRequest) GetCreatedByOk() (*string, bool)`

GetCreatedByOk returns a tuple with the CreatedBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedBy

`func (o *PolicyPackUpdateRequest) SetCreatedBy(v string)`

SetCreatedBy sets CreatedBy field to given value.

### HasCreatedBy

`func (o *PolicyPackUpdateRequest) HasCreatedBy() bool`

HasCreatedBy returns a boolean if a field has been set.

### SetCreatedByNil

`func (o *PolicyPackUpdateRequest) SetCreatedByNil(b bool)`

 SetCreatedByNil sets the value for CreatedBy to be an explicit nil

### UnsetCreatedBy
`func (o *PolicyPackUpdateRequest) UnsetCreatedBy()`

UnsetCreatedBy ensures that no value is present for CreatedBy, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


