# PolicyPackCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** |  | 
**Engine** | Pointer to **string** |  | [optional] [default to "builtin"]
**Policy** | **interface{}** |  | 

## Methods

### NewPolicyPackCreateRequest

`func NewPolicyPackCreateRequest(name string, policy interface{}, ) *PolicyPackCreateRequest`

NewPolicyPackCreateRequest instantiates a new PolicyPackCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPolicyPackCreateRequestWithDefaults

`func NewPolicyPackCreateRequestWithDefaults() *PolicyPackCreateRequest`

NewPolicyPackCreateRequestWithDefaults instantiates a new PolicyPackCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *PolicyPackCreateRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *PolicyPackCreateRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *PolicyPackCreateRequest) SetName(v string)`

SetName sets Name field to given value.


### GetEngine

`func (o *PolicyPackCreateRequest) GetEngine() string`

GetEngine returns the Engine field if non-nil, zero value otherwise.

### GetEngineOk

`func (o *PolicyPackCreateRequest) GetEngineOk() (*string, bool)`

GetEngineOk returns a tuple with the Engine field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEngine

`func (o *PolicyPackCreateRequest) SetEngine(v string)`

SetEngine sets Engine field to given value.

### HasEngine

`func (o *PolicyPackCreateRequest) HasEngine() bool`

HasEngine returns a boolean if a field has been set.

### GetPolicy

`func (o *PolicyPackCreateRequest) GetPolicy() interface{}`

GetPolicy returns the Policy field if non-nil, zero value otherwise.

### GetPolicyOk

`func (o *PolicyPackCreateRequest) GetPolicyOk() (*interface{}, bool)`

GetPolicyOk returns a tuple with the Policy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicy

`func (o *PolicyPackCreateRequest) SetPolicy(v interface{})`

SetPolicy sets Policy field to given value.


### SetPolicyNil

`func (o *PolicyPackCreateRequest) SetPolicyNil(b bool)`

 SetPolicyNil sets the value for Policy to be an explicit nil

### UnsetPolicy
`func (o *PolicyPackCreateRequest) UnsetPolicy()`

UnsetPolicy ensures that no value is present for Policy, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


