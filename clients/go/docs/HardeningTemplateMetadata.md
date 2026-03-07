# HardeningTemplateMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TemplateId** | **string** |  | 
**ProjectId** | **string** |  | 
**Name** | **string** |  | 
**Type** | **string** |  | 
**Config** | **interface{}** |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewHardeningTemplateMetadata

`func NewHardeningTemplateMetadata(templateId string, projectId string, name string, type_ string, config interface{}, createdAt time.Time, ) *HardeningTemplateMetadata`

NewHardeningTemplateMetadata instantiates a new HardeningTemplateMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewHardeningTemplateMetadataWithDefaults

`func NewHardeningTemplateMetadataWithDefaults() *HardeningTemplateMetadata`

NewHardeningTemplateMetadataWithDefaults instantiates a new HardeningTemplateMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTemplateId

`func (o *HardeningTemplateMetadata) GetTemplateId() string`

GetTemplateId returns the TemplateId field if non-nil, zero value otherwise.

### GetTemplateIdOk

`func (o *HardeningTemplateMetadata) GetTemplateIdOk() (*string, bool)`

GetTemplateIdOk returns a tuple with the TemplateId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTemplateId

`func (o *HardeningTemplateMetadata) SetTemplateId(v string)`

SetTemplateId sets TemplateId field to given value.


### GetProjectId

`func (o *HardeningTemplateMetadata) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *HardeningTemplateMetadata) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *HardeningTemplateMetadata) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetName

`func (o *HardeningTemplateMetadata) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *HardeningTemplateMetadata) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *HardeningTemplateMetadata) SetName(v string)`

SetName sets Name field to given value.


### GetType

`func (o *HardeningTemplateMetadata) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *HardeningTemplateMetadata) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *HardeningTemplateMetadata) SetType(v string)`

SetType sets Type field to given value.


### GetConfig

`func (o *HardeningTemplateMetadata) GetConfig() interface{}`

GetConfig returns the Config field if non-nil, zero value otherwise.

### GetConfigOk

`func (o *HardeningTemplateMetadata) GetConfigOk() (*interface{}, bool)`

GetConfigOk returns a tuple with the Config field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfig

`func (o *HardeningTemplateMetadata) SetConfig(v interface{})`

SetConfig sets Config field to given value.


### SetConfigNil

`func (o *HardeningTemplateMetadata) SetConfigNil(b bool)`

 SetConfigNil sets the value for Config to be an explicit nil

### UnsetConfig
`func (o *HardeningTemplateMetadata) UnsetConfig()`

UnsetConfig ensures that no value is present for Config, not even an explicit nil
### GetCreatedAt

`func (o *HardeningTemplateMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *HardeningTemplateMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *HardeningTemplateMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


