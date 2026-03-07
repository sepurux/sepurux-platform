# PolicyPackVersionMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**VersionId** | **string** |  | 
**PolicyPackId** | **string** |  | 
**VersionNumber** | **int32** |  | 
**Policy** | **interface{}** |  | 
**CreatedBy** | Pointer to **NullableString** |  | [optional] 
**CreatedAt** | **time.Time** |  | 
**IsActive** | Pointer to **bool** |  | [optional] [default to false]

## Methods

### NewPolicyPackVersionMetadata

`func NewPolicyPackVersionMetadata(versionId string, policyPackId string, versionNumber int32, policy interface{}, createdAt time.Time, ) *PolicyPackVersionMetadata`

NewPolicyPackVersionMetadata instantiates a new PolicyPackVersionMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPolicyPackVersionMetadataWithDefaults

`func NewPolicyPackVersionMetadataWithDefaults() *PolicyPackVersionMetadata`

NewPolicyPackVersionMetadataWithDefaults instantiates a new PolicyPackVersionMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetVersionId

`func (o *PolicyPackVersionMetadata) GetVersionId() string`

GetVersionId returns the VersionId field if non-nil, zero value otherwise.

### GetVersionIdOk

`func (o *PolicyPackVersionMetadata) GetVersionIdOk() (*string, bool)`

GetVersionIdOk returns a tuple with the VersionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVersionId

`func (o *PolicyPackVersionMetadata) SetVersionId(v string)`

SetVersionId sets VersionId field to given value.


### GetPolicyPackId

`func (o *PolicyPackVersionMetadata) GetPolicyPackId() string`

GetPolicyPackId returns the PolicyPackId field if non-nil, zero value otherwise.

### GetPolicyPackIdOk

`func (o *PolicyPackVersionMetadata) GetPolicyPackIdOk() (*string, bool)`

GetPolicyPackIdOk returns a tuple with the PolicyPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyPackId

`func (o *PolicyPackVersionMetadata) SetPolicyPackId(v string)`

SetPolicyPackId sets PolicyPackId field to given value.


### GetVersionNumber

`func (o *PolicyPackVersionMetadata) GetVersionNumber() int32`

GetVersionNumber returns the VersionNumber field if non-nil, zero value otherwise.

### GetVersionNumberOk

`func (o *PolicyPackVersionMetadata) GetVersionNumberOk() (*int32, bool)`

GetVersionNumberOk returns a tuple with the VersionNumber field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVersionNumber

`func (o *PolicyPackVersionMetadata) SetVersionNumber(v int32)`

SetVersionNumber sets VersionNumber field to given value.


### GetPolicy

`func (o *PolicyPackVersionMetadata) GetPolicy() interface{}`

GetPolicy returns the Policy field if non-nil, zero value otherwise.

### GetPolicyOk

`func (o *PolicyPackVersionMetadata) GetPolicyOk() (*interface{}, bool)`

GetPolicyOk returns a tuple with the Policy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicy

`func (o *PolicyPackVersionMetadata) SetPolicy(v interface{})`

SetPolicy sets Policy field to given value.


### SetPolicyNil

`func (o *PolicyPackVersionMetadata) SetPolicyNil(b bool)`

 SetPolicyNil sets the value for Policy to be an explicit nil

### UnsetPolicy
`func (o *PolicyPackVersionMetadata) UnsetPolicy()`

UnsetPolicy ensures that no value is present for Policy, not even an explicit nil
### GetCreatedBy

`func (o *PolicyPackVersionMetadata) GetCreatedBy() string`

GetCreatedBy returns the CreatedBy field if non-nil, zero value otherwise.

### GetCreatedByOk

`func (o *PolicyPackVersionMetadata) GetCreatedByOk() (*string, bool)`

GetCreatedByOk returns a tuple with the CreatedBy field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedBy

`func (o *PolicyPackVersionMetadata) SetCreatedBy(v string)`

SetCreatedBy sets CreatedBy field to given value.

### HasCreatedBy

`func (o *PolicyPackVersionMetadata) HasCreatedBy() bool`

HasCreatedBy returns a boolean if a field has been set.

### SetCreatedByNil

`func (o *PolicyPackVersionMetadata) SetCreatedByNil(b bool)`

 SetCreatedByNil sets the value for CreatedBy to be an explicit nil

### UnsetCreatedBy
`func (o *PolicyPackVersionMetadata) UnsetCreatedBy()`

UnsetCreatedBy ensures that no value is present for CreatedBy, not even an explicit nil
### GetCreatedAt

`func (o *PolicyPackVersionMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *PolicyPackVersionMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *PolicyPackVersionMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.


### GetIsActive

`func (o *PolicyPackVersionMetadata) GetIsActive() bool`

GetIsActive returns the IsActive field if non-nil, zero value otherwise.

### GetIsActiveOk

`func (o *PolicyPackVersionMetadata) GetIsActiveOk() (*bool, bool)`

GetIsActiveOk returns a tuple with the IsActive field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsActive

`func (o *PolicyPackVersionMetadata) SetIsActive(v bool)`

SetIsActive sets IsActive field to given value.

### HasIsActive

`func (o *PolicyPackVersionMetadata) HasIsActive() bool`

HasIsActive returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


