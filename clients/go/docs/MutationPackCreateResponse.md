# MutationPackCreateResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**MutationPackId** | **string** |  | 
**ProjectId** | **string** |  | 
**Name** | **string** |  | 
**Description** | Pointer to **NullableString** |  | [optional] 
**Config** | **interface{}** |  | 
**IsSystem** | Pointer to **bool** |  | [optional] [default to false]
**CoverageScore** | Pointer to **int32** |  | [optional] [default to 0]
**CreditCost** | Pointer to **int32** |  | [optional] [default to 20]
**CreatedAt** | **time.Time** |  | 
**Warning** | Pointer to **NullableString** |  | [optional] 
**ValidationIssues** | Pointer to **[]string** |  | [optional] 

## Methods

### NewMutationPackCreateResponse

`func NewMutationPackCreateResponse(mutationPackId string, projectId string, name string, config interface{}, createdAt time.Time, ) *MutationPackCreateResponse`

NewMutationPackCreateResponse instantiates a new MutationPackCreateResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMutationPackCreateResponseWithDefaults

`func NewMutationPackCreateResponseWithDefaults() *MutationPackCreateResponse`

NewMutationPackCreateResponseWithDefaults instantiates a new MutationPackCreateResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetMutationPackId

`func (o *MutationPackCreateResponse) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *MutationPackCreateResponse) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *MutationPackCreateResponse) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.


### GetProjectId

`func (o *MutationPackCreateResponse) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *MutationPackCreateResponse) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *MutationPackCreateResponse) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetName

`func (o *MutationPackCreateResponse) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *MutationPackCreateResponse) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *MutationPackCreateResponse) SetName(v string)`

SetName sets Name field to given value.


### GetDescription

`func (o *MutationPackCreateResponse) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *MutationPackCreateResponse) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *MutationPackCreateResponse) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *MutationPackCreateResponse) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### SetDescriptionNil

`func (o *MutationPackCreateResponse) SetDescriptionNil(b bool)`

 SetDescriptionNil sets the value for Description to be an explicit nil

### UnsetDescription
`func (o *MutationPackCreateResponse) UnsetDescription()`

UnsetDescription ensures that no value is present for Description, not even an explicit nil
### GetConfig

`func (o *MutationPackCreateResponse) GetConfig() interface{}`

GetConfig returns the Config field if non-nil, zero value otherwise.

### GetConfigOk

`func (o *MutationPackCreateResponse) GetConfigOk() (*interface{}, bool)`

GetConfigOk returns a tuple with the Config field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfig

`func (o *MutationPackCreateResponse) SetConfig(v interface{})`

SetConfig sets Config field to given value.


### SetConfigNil

`func (o *MutationPackCreateResponse) SetConfigNil(b bool)`

 SetConfigNil sets the value for Config to be an explicit nil

### UnsetConfig
`func (o *MutationPackCreateResponse) UnsetConfig()`

UnsetConfig ensures that no value is present for Config, not even an explicit nil
### GetIsSystem

`func (o *MutationPackCreateResponse) GetIsSystem() bool`

GetIsSystem returns the IsSystem field if non-nil, zero value otherwise.

### GetIsSystemOk

`func (o *MutationPackCreateResponse) GetIsSystemOk() (*bool, bool)`

GetIsSystemOk returns a tuple with the IsSystem field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsSystem

`func (o *MutationPackCreateResponse) SetIsSystem(v bool)`

SetIsSystem sets IsSystem field to given value.

### HasIsSystem

`func (o *MutationPackCreateResponse) HasIsSystem() bool`

HasIsSystem returns a boolean if a field has been set.

### GetCoverageScore

`func (o *MutationPackCreateResponse) GetCoverageScore() int32`

GetCoverageScore returns the CoverageScore field if non-nil, zero value otherwise.

### GetCoverageScoreOk

`func (o *MutationPackCreateResponse) GetCoverageScoreOk() (*int32, bool)`

GetCoverageScoreOk returns a tuple with the CoverageScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCoverageScore

`func (o *MutationPackCreateResponse) SetCoverageScore(v int32)`

SetCoverageScore sets CoverageScore field to given value.

### HasCoverageScore

`func (o *MutationPackCreateResponse) HasCoverageScore() bool`

HasCoverageScore returns a boolean if a field has been set.

### GetCreditCost

`func (o *MutationPackCreateResponse) GetCreditCost() int32`

GetCreditCost returns the CreditCost field if non-nil, zero value otherwise.

### GetCreditCostOk

`func (o *MutationPackCreateResponse) GetCreditCostOk() (*int32, bool)`

GetCreditCostOk returns a tuple with the CreditCost field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreditCost

`func (o *MutationPackCreateResponse) SetCreditCost(v int32)`

SetCreditCost sets CreditCost field to given value.

### HasCreditCost

`func (o *MutationPackCreateResponse) HasCreditCost() bool`

HasCreditCost returns a boolean if a field has been set.

### GetCreatedAt

`func (o *MutationPackCreateResponse) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *MutationPackCreateResponse) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *MutationPackCreateResponse) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.


### GetWarning

`func (o *MutationPackCreateResponse) GetWarning() string`

GetWarning returns the Warning field if non-nil, zero value otherwise.

### GetWarningOk

`func (o *MutationPackCreateResponse) GetWarningOk() (*string, bool)`

GetWarningOk returns a tuple with the Warning field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWarning

`func (o *MutationPackCreateResponse) SetWarning(v string)`

SetWarning sets Warning field to given value.

### HasWarning

`func (o *MutationPackCreateResponse) HasWarning() bool`

HasWarning returns a boolean if a field has been set.

### SetWarningNil

`func (o *MutationPackCreateResponse) SetWarningNil(b bool)`

 SetWarningNil sets the value for Warning to be an explicit nil

### UnsetWarning
`func (o *MutationPackCreateResponse) UnsetWarning()`

UnsetWarning ensures that no value is present for Warning, not even an explicit nil
### GetValidationIssues

`func (o *MutationPackCreateResponse) GetValidationIssues() []string`

GetValidationIssues returns the ValidationIssues field if non-nil, zero value otherwise.

### GetValidationIssuesOk

`func (o *MutationPackCreateResponse) GetValidationIssuesOk() (*[]string, bool)`

GetValidationIssuesOk returns a tuple with the ValidationIssues field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetValidationIssues

`func (o *MutationPackCreateResponse) SetValidationIssues(v []string)`

SetValidationIssues sets ValidationIssues field to given value.

### HasValidationIssues

`func (o *MutationPackCreateResponse) HasValidationIssues() bool`

HasValidationIssues returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


