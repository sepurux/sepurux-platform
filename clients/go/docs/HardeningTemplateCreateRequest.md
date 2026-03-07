# HardeningTemplateCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** |  | 
**Type** | **string** |  | 
**Config** | **interface{}** |  | 

## Methods

### NewHardeningTemplateCreateRequest

`func NewHardeningTemplateCreateRequest(name string, type_ string, config interface{}, ) *HardeningTemplateCreateRequest`

NewHardeningTemplateCreateRequest instantiates a new HardeningTemplateCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewHardeningTemplateCreateRequestWithDefaults

`func NewHardeningTemplateCreateRequestWithDefaults() *HardeningTemplateCreateRequest`

NewHardeningTemplateCreateRequestWithDefaults instantiates a new HardeningTemplateCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *HardeningTemplateCreateRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *HardeningTemplateCreateRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *HardeningTemplateCreateRequest) SetName(v string)`

SetName sets Name field to given value.


### GetType

`func (o *HardeningTemplateCreateRequest) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *HardeningTemplateCreateRequest) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *HardeningTemplateCreateRequest) SetType(v string)`

SetType sets Type field to given value.


### GetConfig

`func (o *HardeningTemplateCreateRequest) GetConfig() interface{}`

GetConfig returns the Config field if non-nil, zero value otherwise.

### GetConfigOk

`func (o *HardeningTemplateCreateRequest) GetConfigOk() (*interface{}, bool)`

GetConfigOk returns a tuple with the Config field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfig

`func (o *HardeningTemplateCreateRequest) SetConfig(v interface{})`

SetConfig sets Config field to given value.


### SetConfigNil

`func (o *HardeningTemplateCreateRequest) SetConfigNil(b bool)`

 SetConfigNil sets the value for Config to be an explicit nil

### UnsetConfig
`func (o *HardeningTemplateCreateRequest) UnsetConfig()`

UnsetConfig ensures that no value is present for Config, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


