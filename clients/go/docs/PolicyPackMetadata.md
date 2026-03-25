# PolicyPackMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**PolicyPackId** | **string** |  | 
**ProjectId** | **string** |  | 
**Name** | **string** |  | 
**Engine** | **string** |  | 
**Policy** | **interface{}** |  | 
**IsArchived** | Pointer to **bool** |  | [optional] [default to false]
**ActiveVersionId** | Pointer to **NullableString** |  | [optional] 
**ActiveVersionNumber** | Pointer to **NullableInt32** |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewPolicyPackMetadata

`func NewPolicyPackMetadata(policyPackId string, projectId string, name string, engine string, policy interface{}, createdAt time.Time, ) *PolicyPackMetadata`

NewPolicyPackMetadata instantiates a new PolicyPackMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPolicyPackMetadataWithDefaults

`func NewPolicyPackMetadataWithDefaults() *PolicyPackMetadata`

NewPolicyPackMetadataWithDefaults instantiates a new PolicyPackMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPolicyPackId

`func (o *PolicyPackMetadata) GetPolicyPackId() string`

GetPolicyPackId returns the PolicyPackId field if non-nil, zero value otherwise.

### GetPolicyPackIdOk

`func (o *PolicyPackMetadata) GetPolicyPackIdOk() (*string, bool)`

GetPolicyPackIdOk returns a tuple with the PolicyPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyPackId

`func (o *PolicyPackMetadata) SetPolicyPackId(v string)`

SetPolicyPackId sets PolicyPackId field to given value.


### GetProjectId

`func (o *PolicyPackMetadata) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *PolicyPackMetadata) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *PolicyPackMetadata) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetName

`func (o *PolicyPackMetadata) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *PolicyPackMetadata) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *PolicyPackMetadata) SetName(v string)`

SetName sets Name field to given value.


### GetEngine

`func (o *PolicyPackMetadata) GetEngine() string`

GetEngine returns the Engine field if non-nil, zero value otherwise.

### GetEngineOk

`func (o *PolicyPackMetadata) GetEngineOk() (*string, bool)`

GetEngineOk returns a tuple with the Engine field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEngine

`func (o *PolicyPackMetadata) SetEngine(v string)`

SetEngine sets Engine field to given value.


### GetPolicy

`func (o *PolicyPackMetadata) GetPolicy() interface{}`

GetPolicy returns the Policy field if non-nil, zero value otherwise.

### GetPolicyOk

`func (o *PolicyPackMetadata) GetPolicyOk() (*interface{}, bool)`

GetPolicyOk returns a tuple with the Policy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicy

`func (o *PolicyPackMetadata) SetPolicy(v interface{})`

SetPolicy sets Policy field to given value.


### SetPolicyNil

`func (o *PolicyPackMetadata) SetPolicyNil(b bool)`

 SetPolicyNil sets the value for Policy to be an explicit nil

### UnsetPolicy
`func (o *PolicyPackMetadata) UnsetPolicy()`

UnsetPolicy ensures that no value is present for Policy, not even an explicit nil
### GetIsArchived

`func (o *PolicyPackMetadata) GetIsArchived() bool`

GetIsArchived returns the IsArchived field if non-nil, zero value otherwise.

### GetIsArchivedOk

`func (o *PolicyPackMetadata) GetIsArchivedOk() (*bool, bool)`

GetIsArchivedOk returns a tuple with the IsArchived field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsArchived

`func (o *PolicyPackMetadata) SetIsArchived(v bool)`

SetIsArchived sets IsArchived field to given value.

### HasIsArchived

`func (o *PolicyPackMetadata) HasIsArchived() bool`

HasIsArchived returns a boolean if a field has been set.

### GetActiveVersionId

`func (o *PolicyPackMetadata) GetActiveVersionId() string`

GetActiveVersionId returns the ActiveVersionId field if non-nil, zero value otherwise.

### GetActiveVersionIdOk

`func (o *PolicyPackMetadata) GetActiveVersionIdOk() (*string, bool)`

GetActiveVersionIdOk returns a tuple with the ActiveVersionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetActiveVersionId

`func (o *PolicyPackMetadata) SetActiveVersionId(v string)`

SetActiveVersionId sets ActiveVersionId field to given value.

### HasActiveVersionId

`func (o *PolicyPackMetadata) HasActiveVersionId() bool`

HasActiveVersionId returns a boolean if a field has been set.

### SetActiveVersionIdNil

`func (o *PolicyPackMetadata) SetActiveVersionIdNil(b bool)`

 SetActiveVersionIdNil sets the value for ActiveVersionId to be an explicit nil

### UnsetActiveVersionId
`func (o *PolicyPackMetadata) UnsetActiveVersionId()`

UnsetActiveVersionId ensures that no value is present for ActiveVersionId, not even an explicit nil
### GetActiveVersionNumber

`func (o *PolicyPackMetadata) GetActiveVersionNumber() int32`

GetActiveVersionNumber returns the ActiveVersionNumber field if non-nil, zero value otherwise.

### GetActiveVersionNumberOk

`func (o *PolicyPackMetadata) GetActiveVersionNumberOk() (*int32, bool)`

GetActiveVersionNumberOk returns a tuple with the ActiveVersionNumber field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetActiveVersionNumber

`func (o *PolicyPackMetadata) SetActiveVersionNumber(v int32)`

SetActiveVersionNumber sets ActiveVersionNumber field to given value.

### HasActiveVersionNumber

`func (o *PolicyPackMetadata) HasActiveVersionNumber() bool`

HasActiveVersionNumber returns a boolean if a field has been set.

### SetActiveVersionNumberNil

`func (o *PolicyPackMetadata) SetActiveVersionNumberNil(b bool)`

 SetActiveVersionNumberNil sets the value for ActiveVersionNumber to be an explicit nil

### UnsetActiveVersionNumber
`func (o *PolicyPackMetadata) UnsetActiveVersionNumber()`

UnsetActiveVersionNumber ensures that no value is present for ActiveVersionNumber, not even an explicit nil
### GetCreatedAt

`func (o *PolicyPackMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *PolicyPackMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *PolicyPackMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


