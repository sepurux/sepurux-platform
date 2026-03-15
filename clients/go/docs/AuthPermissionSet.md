# AuthPermissionSet

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**VisibleSections** | Pointer to **[]string** |  | [optional] 
**CanUploadTraces** | Pointer to **bool** |  | [optional] [default to false]
**CanCreateCampaigns** | Pointer to **bool** |  | [optional] [default to false]
**CanRunCampaigns** | Pointer to **bool** |  | [optional] [default to false]
**CanManageMutationPacks** | Pointer to **bool** |  | [optional] [default to false]
**CanManagePolicyPacks** | Pointer to **bool** |  | [optional] [default to false]
**CanManageSecurityConfig** | Pointer to **bool** |  | [optional] [default to false]
**CanManageWorkspace** | Pointer to **bool** |  | [optional] [default to false]
**CanManageApiKeys** | Pointer to **bool** |  | [optional] [default to false]
**CanManageBilling** | Pointer to **bool** |  | [optional] [default to false]

## Methods

### NewAuthPermissionSet

`func NewAuthPermissionSet() *AuthPermissionSet`

NewAuthPermissionSet instantiates a new AuthPermissionSet object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuthPermissionSetWithDefaults

`func NewAuthPermissionSetWithDefaults() *AuthPermissionSet`

NewAuthPermissionSetWithDefaults instantiates a new AuthPermissionSet object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetVisibleSections

`func (o *AuthPermissionSet) GetVisibleSections() []string`

GetVisibleSections returns the VisibleSections field if non-nil, zero value otherwise.

### GetVisibleSectionsOk

`func (o *AuthPermissionSet) GetVisibleSectionsOk() (*[]string, bool)`

GetVisibleSectionsOk returns a tuple with the VisibleSections field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVisibleSections

`func (o *AuthPermissionSet) SetVisibleSections(v []string)`

SetVisibleSections sets VisibleSections field to given value.

### HasVisibleSections

`func (o *AuthPermissionSet) HasVisibleSections() bool`

HasVisibleSections returns a boolean if a field has been set.

### GetCanUploadTraces

`func (o *AuthPermissionSet) GetCanUploadTraces() bool`

GetCanUploadTraces returns the CanUploadTraces field if non-nil, zero value otherwise.

### GetCanUploadTracesOk

`func (o *AuthPermissionSet) GetCanUploadTracesOk() (*bool, bool)`

GetCanUploadTracesOk returns a tuple with the CanUploadTraces field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanUploadTraces

`func (o *AuthPermissionSet) SetCanUploadTraces(v bool)`

SetCanUploadTraces sets CanUploadTraces field to given value.

### HasCanUploadTraces

`func (o *AuthPermissionSet) HasCanUploadTraces() bool`

HasCanUploadTraces returns a boolean if a field has been set.

### GetCanCreateCampaigns

`func (o *AuthPermissionSet) GetCanCreateCampaigns() bool`

GetCanCreateCampaigns returns the CanCreateCampaigns field if non-nil, zero value otherwise.

### GetCanCreateCampaignsOk

`func (o *AuthPermissionSet) GetCanCreateCampaignsOk() (*bool, bool)`

GetCanCreateCampaignsOk returns a tuple with the CanCreateCampaigns field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanCreateCampaigns

`func (o *AuthPermissionSet) SetCanCreateCampaigns(v bool)`

SetCanCreateCampaigns sets CanCreateCampaigns field to given value.

### HasCanCreateCampaigns

`func (o *AuthPermissionSet) HasCanCreateCampaigns() bool`

HasCanCreateCampaigns returns a boolean if a field has been set.

### GetCanRunCampaigns

`func (o *AuthPermissionSet) GetCanRunCampaigns() bool`

GetCanRunCampaigns returns the CanRunCampaigns field if non-nil, zero value otherwise.

### GetCanRunCampaignsOk

`func (o *AuthPermissionSet) GetCanRunCampaignsOk() (*bool, bool)`

GetCanRunCampaignsOk returns a tuple with the CanRunCampaigns field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanRunCampaigns

`func (o *AuthPermissionSet) SetCanRunCampaigns(v bool)`

SetCanRunCampaigns sets CanRunCampaigns field to given value.

### HasCanRunCampaigns

`func (o *AuthPermissionSet) HasCanRunCampaigns() bool`

HasCanRunCampaigns returns a boolean if a field has been set.

### GetCanManageMutationPacks

`func (o *AuthPermissionSet) GetCanManageMutationPacks() bool`

GetCanManageMutationPacks returns the CanManageMutationPacks field if non-nil, zero value otherwise.

### GetCanManageMutationPacksOk

`func (o *AuthPermissionSet) GetCanManageMutationPacksOk() (*bool, bool)`

GetCanManageMutationPacksOk returns a tuple with the CanManageMutationPacks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanManageMutationPacks

`func (o *AuthPermissionSet) SetCanManageMutationPacks(v bool)`

SetCanManageMutationPacks sets CanManageMutationPacks field to given value.

### HasCanManageMutationPacks

`func (o *AuthPermissionSet) HasCanManageMutationPacks() bool`

HasCanManageMutationPacks returns a boolean if a field has been set.

### GetCanManagePolicyPacks

`func (o *AuthPermissionSet) GetCanManagePolicyPacks() bool`

GetCanManagePolicyPacks returns the CanManagePolicyPacks field if non-nil, zero value otherwise.

### GetCanManagePolicyPacksOk

`func (o *AuthPermissionSet) GetCanManagePolicyPacksOk() (*bool, bool)`

GetCanManagePolicyPacksOk returns a tuple with the CanManagePolicyPacks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanManagePolicyPacks

`func (o *AuthPermissionSet) SetCanManagePolicyPacks(v bool)`

SetCanManagePolicyPacks sets CanManagePolicyPacks field to given value.

### HasCanManagePolicyPacks

`func (o *AuthPermissionSet) HasCanManagePolicyPacks() bool`

HasCanManagePolicyPacks returns a boolean if a field has been set.

### GetCanManageSecurityConfig

`func (o *AuthPermissionSet) GetCanManageSecurityConfig() bool`

GetCanManageSecurityConfig returns the CanManageSecurityConfig field if non-nil, zero value otherwise.

### GetCanManageSecurityConfigOk

`func (o *AuthPermissionSet) GetCanManageSecurityConfigOk() (*bool, bool)`

GetCanManageSecurityConfigOk returns a tuple with the CanManageSecurityConfig field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanManageSecurityConfig

`func (o *AuthPermissionSet) SetCanManageSecurityConfig(v bool)`

SetCanManageSecurityConfig sets CanManageSecurityConfig field to given value.

### HasCanManageSecurityConfig

`func (o *AuthPermissionSet) HasCanManageSecurityConfig() bool`

HasCanManageSecurityConfig returns a boolean if a field has been set.

### GetCanManageWorkspace

`func (o *AuthPermissionSet) GetCanManageWorkspace() bool`

GetCanManageWorkspace returns the CanManageWorkspace field if non-nil, zero value otherwise.

### GetCanManageWorkspaceOk

`func (o *AuthPermissionSet) GetCanManageWorkspaceOk() (*bool, bool)`

GetCanManageWorkspaceOk returns a tuple with the CanManageWorkspace field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanManageWorkspace

`func (o *AuthPermissionSet) SetCanManageWorkspace(v bool)`

SetCanManageWorkspace sets CanManageWorkspace field to given value.

### HasCanManageWorkspace

`func (o *AuthPermissionSet) HasCanManageWorkspace() bool`

HasCanManageWorkspace returns a boolean if a field has been set.

### GetCanManageApiKeys

`func (o *AuthPermissionSet) GetCanManageApiKeys() bool`

GetCanManageApiKeys returns the CanManageApiKeys field if non-nil, zero value otherwise.

### GetCanManageApiKeysOk

`func (o *AuthPermissionSet) GetCanManageApiKeysOk() (*bool, bool)`

GetCanManageApiKeysOk returns a tuple with the CanManageApiKeys field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanManageApiKeys

`func (o *AuthPermissionSet) SetCanManageApiKeys(v bool)`

SetCanManageApiKeys sets CanManageApiKeys field to given value.

### HasCanManageApiKeys

`func (o *AuthPermissionSet) HasCanManageApiKeys() bool`

HasCanManageApiKeys returns a boolean if a field has been set.

### GetCanManageBilling

`func (o *AuthPermissionSet) GetCanManageBilling() bool`

GetCanManageBilling returns the CanManageBilling field if non-nil, zero value otherwise.

### GetCanManageBillingOk

`func (o *AuthPermissionSet) GetCanManageBillingOk() (*bool, bool)`

GetCanManageBillingOk returns a tuple with the CanManageBilling field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCanManageBilling

`func (o *AuthPermissionSet) SetCanManageBilling(v bool)`

SetCanManageBilling sets CanManageBilling field to given value.

### HasCanManageBilling

`func (o *AuthPermissionSet) HasCanManageBilling() bool`

HasCanManageBilling returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


