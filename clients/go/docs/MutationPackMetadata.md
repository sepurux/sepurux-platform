# MutationPackMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MutationPackId** | **string** |  | 
**ProjectId** | **string** |  | 
**Name** | **string** |  | 
**Description** | Pointer to **NullableString** |  | [optional] 
**Config** | **interface{}** |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewMutationPackMetadata

`func NewMutationPackMetadata(mutationPackId string, projectId string, name string, config interface{}, createdAt time.Time, ) *MutationPackMetadata`

NewMutationPackMetadata instantiates a new MutationPackMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMutationPackMetadataWithDefaults

`func NewMutationPackMetadataWithDefaults() *MutationPackMetadata`

NewMutationPackMetadataWithDefaults instantiates a new MutationPackMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMutationPackId

`func (o *MutationPackMetadata) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *MutationPackMetadata) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *MutationPackMetadata) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.


### GetProjectId

`func (o *MutationPackMetadata) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *MutationPackMetadata) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *MutationPackMetadata) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetName

`func (o *MutationPackMetadata) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *MutationPackMetadata) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *MutationPackMetadata) SetName(v string)`

SetName sets Name field to given value.


### GetDescription

`func (o *MutationPackMetadata) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *MutationPackMetadata) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *MutationPackMetadata) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *MutationPackMetadata) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### SetDescriptionNil

`func (o *MutationPackMetadata) SetDescriptionNil(b bool)`

 SetDescriptionNil sets the value for Description to be an explicit nil

### UnsetDescription
`func (o *MutationPackMetadata) UnsetDescription()`

UnsetDescription ensures that no value is present for Description, not even an explicit nil
### GetConfig

`func (o *MutationPackMetadata) GetConfig() interface{}`

GetConfig returns the Config field if non-nil, zero value otherwise.

### GetConfigOk

`func (o *MutationPackMetadata) GetConfigOk() (*interface{}, bool)`

GetConfigOk returns a tuple with the Config field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfig

`func (o *MutationPackMetadata) SetConfig(v interface{})`

SetConfig sets Config field to given value.


### SetConfigNil

`func (o *MutationPackMetadata) SetConfigNil(b bool)`

 SetConfigNil sets the value for Config to be an explicit nil

### UnsetConfig
`func (o *MutationPackMetadata) UnsetConfig()`

UnsetConfig ensures that no value is present for Config, not even an explicit nil
### GetCreatedAt

`func (o *MutationPackMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *MutationPackMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *MutationPackMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


