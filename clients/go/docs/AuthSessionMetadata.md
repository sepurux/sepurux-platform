# AuthSessionMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TenantId** | **string** |  | 
**ProjectId** | **string** |  | 
**ProjectName** | **string** |  | 
**ProjectScoped** | Pointer to **bool** |  | [optional] [default to true]
**PricingTier** | Pointer to **string** |  | [optional] [default to "credits"]
**PlanName** | **string** |  | 
**RoleName** | **string** |  | 
**UserId** | Pointer to **NullableString** |  | [optional] 
**Email** | Pointer to **NullableString** |  | [optional] 
**Name** | Pointer to **NullableString** |  | [optional] 
**IsDemo** | Pointer to **bool** |  | [optional] [default to false]
**IsSuperAdmin** | Pointer to **bool** |  | [optional] [default to false]
**BillingPlanName** | Pointer to **NullableString** |  | [optional] 
**CreditsBalance** | Pointer to **NullableInt32** |  | [optional] 
**MonthlyCredits** | Pointer to **NullableInt32** |  | [optional] 
**TopupCredits** | Pointer to **NullableInt32** |  | [optional] 
**QueuePriority** | Pointer to **NullableString** |  | [optional] 
**LowCreditThreshold** | Pointer to **NullableInt32** |  | [optional] 
**IsLowCredit** | Pointer to **bool** |  | [optional] [default to false]
**Permissions** | [**AuthPermissionSet**](AuthPermissionSet.md) |  | 

## Methods

### NewAuthSessionMetadata

`func NewAuthSessionMetadata(tenantId string, projectId string, projectName string, planName string, roleName string, permissions AuthPermissionSet, ) *AuthSessionMetadata`

NewAuthSessionMetadata instantiates a new AuthSessionMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuthSessionMetadataWithDefaults

`func NewAuthSessionMetadataWithDefaults() *AuthSessionMetadata`

NewAuthSessionMetadataWithDefaults instantiates a new AuthSessionMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTenantId

`func (o *AuthSessionMetadata) GetTenantId() string`

GetTenantId returns the TenantId field if non-nil, zero value otherwise.

### GetTenantIdOk

`func (o *AuthSessionMetadata) GetTenantIdOk() (*string, bool)`

GetTenantIdOk returns a tuple with the TenantId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTenantId

`func (o *AuthSessionMetadata) SetTenantId(v string)`

SetTenantId sets TenantId field to given value.


### GetProjectId

`func (o *AuthSessionMetadata) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *AuthSessionMetadata) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *AuthSessionMetadata) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetProjectName

`func (o *AuthSessionMetadata) GetProjectName() string`

GetProjectName returns the ProjectName field if non-nil, zero value otherwise.

### GetProjectNameOk

`func (o *AuthSessionMetadata) GetProjectNameOk() (*string, bool)`

GetProjectNameOk returns a tuple with the ProjectName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectName

`func (o *AuthSessionMetadata) SetProjectName(v string)`

SetProjectName sets ProjectName field to given value.


### GetProjectScoped

`func (o *AuthSessionMetadata) GetProjectScoped() bool`

GetProjectScoped returns the ProjectScoped field if non-nil, zero value otherwise.

### GetProjectScopedOk

`func (o *AuthSessionMetadata) GetProjectScopedOk() (*bool, bool)`

GetProjectScopedOk returns a tuple with the ProjectScoped field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectScoped

`func (o *AuthSessionMetadata) SetProjectScoped(v bool)`

SetProjectScoped sets ProjectScoped field to given value.

### HasProjectScoped

`func (o *AuthSessionMetadata) HasProjectScoped() bool`

HasProjectScoped returns a boolean if a field has been set.

### GetPricingTier

`func (o *AuthSessionMetadata) GetPricingTier() string`

GetPricingTier returns the PricingTier field if non-nil, zero value otherwise.

### GetPricingTierOk

`func (o *AuthSessionMetadata) GetPricingTierOk() (*string, bool)`

GetPricingTierOk returns a tuple with the PricingTier field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPricingTier

`func (o *AuthSessionMetadata) SetPricingTier(v string)`

SetPricingTier sets PricingTier field to given value.

### HasPricingTier

`func (o *AuthSessionMetadata) HasPricingTier() bool`

HasPricingTier returns a boolean if a field has been set.

### GetPlanName

`func (o *AuthSessionMetadata) GetPlanName() string`

GetPlanName returns the PlanName field if non-nil, zero value otherwise.

### GetPlanNameOk

`func (o *AuthSessionMetadata) GetPlanNameOk() (*string, bool)`

GetPlanNameOk returns a tuple with the PlanName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlanName

`func (o *AuthSessionMetadata) SetPlanName(v string)`

SetPlanName sets PlanName field to given value.


### GetRoleName

`func (o *AuthSessionMetadata) GetRoleName() string`

GetRoleName returns the RoleName field if non-nil, zero value otherwise.

### GetRoleNameOk

`func (o *AuthSessionMetadata) GetRoleNameOk() (*string, bool)`

GetRoleNameOk returns a tuple with the RoleName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRoleName

`func (o *AuthSessionMetadata) SetRoleName(v string)`

SetRoleName sets RoleName field to given value.


### GetUserId

`func (o *AuthSessionMetadata) GetUserId() string`

GetUserId returns the UserId field if non-nil, zero value otherwise.

### GetUserIdOk

`func (o *AuthSessionMetadata) GetUserIdOk() (*string, bool)`

GetUserIdOk returns a tuple with the UserId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUserId

`func (o *AuthSessionMetadata) SetUserId(v string)`

SetUserId sets UserId field to given value.

### HasUserId

`func (o *AuthSessionMetadata) HasUserId() bool`

HasUserId returns a boolean if a field has been set.

### SetUserIdNil

`func (o *AuthSessionMetadata) SetUserIdNil(b bool)`

 SetUserIdNil sets the value for UserId to be an explicit nil

### UnsetUserId
`func (o *AuthSessionMetadata) UnsetUserId()`

UnsetUserId ensures that no value is present for UserId, not even an explicit nil
### GetEmail

`func (o *AuthSessionMetadata) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *AuthSessionMetadata) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *AuthSessionMetadata) SetEmail(v string)`

SetEmail sets Email field to given value.

### HasEmail

`func (o *AuthSessionMetadata) HasEmail() bool`

HasEmail returns a boolean if a field has been set.

### SetEmailNil

`func (o *AuthSessionMetadata) SetEmailNil(b bool)`

 SetEmailNil sets the value for Email to be an explicit nil

### UnsetEmail
`func (o *AuthSessionMetadata) UnsetEmail()`

UnsetEmail ensures that no value is present for Email, not even an explicit nil
### GetName

`func (o *AuthSessionMetadata) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *AuthSessionMetadata) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *AuthSessionMetadata) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *AuthSessionMetadata) HasName() bool`

HasName returns a boolean if a field has been set.

### SetNameNil

`func (o *AuthSessionMetadata) SetNameNil(b bool)`

 SetNameNil sets the value for Name to be an explicit nil

### UnsetName
`func (o *AuthSessionMetadata) UnsetName()`

UnsetName ensures that no value is present for Name, not even an explicit nil
### GetIsDemo

`func (o *AuthSessionMetadata) GetIsDemo() bool`

GetIsDemo returns the IsDemo field if non-nil, zero value otherwise.

### GetIsDemoOk

`func (o *AuthSessionMetadata) GetIsDemoOk() (*bool, bool)`

GetIsDemoOk returns a tuple with the IsDemo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsDemo

`func (o *AuthSessionMetadata) SetIsDemo(v bool)`

SetIsDemo sets IsDemo field to given value.

### HasIsDemo

`func (o *AuthSessionMetadata) HasIsDemo() bool`

HasIsDemo returns a boolean if a field has been set.

### GetIsSuperAdmin

`func (o *AuthSessionMetadata) GetIsSuperAdmin() bool`

GetIsSuperAdmin returns the IsSuperAdmin field if non-nil, zero value otherwise.

### GetIsSuperAdminOk

`func (o *AuthSessionMetadata) GetIsSuperAdminOk() (*bool, bool)`

GetIsSuperAdminOk returns a tuple with the IsSuperAdmin field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsSuperAdmin

`func (o *AuthSessionMetadata) SetIsSuperAdmin(v bool)`

SetIsSuperAdmin sets IsSuperAdmin field to given value.

### HasIsSuperAdmin

`func (o *AuthSessionMetadata) HasIsSuperAdmin() bool`

HasIsSuperAdmin returns a boolean if a field has been set.

### GetBillingPlanName

`func (o *AuthSessionMetadata) GetBillingPlanName() string`

GetBillingPlanName returns the BillingPlanName field if non-nil, zero value otherwise.

### GetBillingPlanNameOk

`func (o *AuthSessionMetadata) GetBillingPlanNameOk() (*string, bool)`

GetBillingPlanNameOk returns a tuple with the BillingPlanName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBillingPlanName

`func (o *AuthSessionMetadata) SetBillingPlanName(v string)`

SetBillingPlanName sets BillingPlanName field to given value.

### HasBillingPlanName

`func (o *AuthSessionMetadata) HasBillingPlanName() bool`

HasBillingPlanName returns a boolean if a field has been set.

### SetBillingPlanNameNil

`func (o *AuthSessionMetadata) SetBillingPlanNameNil(b bool)`

 SetBillingPlanNameNil sets the value for BillingPlanName to be an explicit nil

### UnsetBillingPlanName
`func (o *AuthSessionMetadata) UnsetBillingPlanName()`

UnsetBillingPlanName ensures that no value is present for BillingPlanName, not even an explicit nil
### GetCreditsBalance

`func (o *AuthSessionMetadata) GetCreditsBalance() int32`

GetCreditsBalance returns the CreditsBalance field if non-nil, zero value otherwise.

### GetCreditsBalanceOk

`func (o *AuthSessionMetadata) GetCreditsBalanceOk() (*int32, bool)`

GetCreditsBalanceOk returns a tuple with the CreditsBalance field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreditsBalance

`func (o *AuthSessionMetadata) SetCreditsBalance(v int32)`

SetCreditsBalance sets CreditsBalance field to given value.

### HasCreditsBalance

`func (o *AuthSessionMetadata) HasCreditsBalance() bool`

HasCreditsBalance returns a boolean if a field has been set.

### SetCreditsBalanceNil

`func (o *AuthSessionMetadata) SetCreditsBalanceNil(b bool)`

 SetCreditsBalanceNil sets the value for CreditsBalance to be an explicit nil

### UnsetCreditsBalance
`func (o *AuthSessionMetadata) UnsetCreditsBalance()`

UnsetCreditsBalance ensures that no value is present for CreditsBalance, not even an explicit nil
### GetMonthlyCredits

`func (o *AuthSessionMetadata) GetMonthlyCredits() int32`

GetMonthlyCredits returns the MonthlyCredits field if non-nil, zero value otherwise.

### GetMonthlyCreditsOk

`func (o *AuthSessionMetadata) GetMonthlyCreditsOk() (*int32, bool)`

GetMonthlyCreditsOk returns a tuple with the MonthlyCredits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMonthlyCredits

`func (o *AuthSessionMetadata) SetMonthlyCredits(v int32)`

SetMonthlyCredits sets MonthlyCredits field to given value.

### HasMonthlyCredits

`func (o *AuthSessionMetadata) HasMonthlyCredits() bool`

HasMonthlyCredits returns a boolean if a field has been set.

### SetMonthlyCreditsNil

`func (o *AuthSessionMetadata) SetMonthlyCreditsNil(b bool)`

 SetMonthlyCreditsNil sets the value for MonthlyCredits to be an explicit nil

### UnsetMonthlyCredits
`func (o *AuthSessionMetadata) UnsetMonthlyCredits()`

UnsetMonthlyCredits ensures that no value is present for MonthlyCredits, not even an explicit nil
### GetTopupCredits

`func (o *AuthSessionMetadata) GetTopupCredits() int32`

GetTopupCredits returns the TopupCredits field if non-nil, zero value otherwise.

### GetTopupCreditsOk

`func (o *AuthSessionMetadata) GetTopupCreditsOk() (*int32, bool)`

GetTopupCreditsOk returns a tuple with the TopupCredits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopupCredits

`func (o *AuthSessionMetadata) SetTopupCredits(v int32)`

SetTopupCredits sets TopupCredits field to given value.

### HasTopupCredits

`func (o *AuthSessionMetadata) HasTopupCredits() bool`

HasTopupCredits returns a boolean if a field has been set.

### SetTopupCreditsNil

`func (o *AuthSessionMetadata) SetTopupCreditsNil(b bool)`

 SetTopupCreditsNil sets the value for TopupCredits to be an explicit nil

### UnsetTopupCredits
`func (o *AuthSessionMetadata) UnsetTopupCredits()`

UnsetTopupCredits ensures that no value is present for TopupCredits, not even an explicit nil
### GetQueuePriority

`func (o *AuthSessionMetadata) GetQueuePriority() string`

GetQueuePriority returns the QueuePriority field if non-nil, zero value otherwise.

### GetQueuePriorityOk

`func (o *AuthSessionMetadata) GetQueuePriorityOk() (*string, bool)`

GetQueuePriorityOk returns a tuple with the QueuePriority field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQueuePriority

`func (o *AuthSessionMetadata) SetQueuePriority(v string)`

SetQueuePriority sets QueuePriority field to given value.

### HasQueuePriority

`func (o *AuthSessionMetadata) HasQueuePriority() bool`

HasQueuePriority returns a boolean if a field has been set.

### SetQueuePriorityNil

`func (o *AuthSessionMetadata) SetQueuePriorityNil(b bool)`

 SetQueuePriorityNil sets the value for QueuePriority to be an explicit nil

### UnsetQueuePriority
`func (o *AuthSessionMetadata) UnsetQueuePriority()`

UnsetQueuePriority ensures that no value is present for QueuePriority, not even an explicit nil
### GetLowCreditThreshold

`func (o *AuthSessionMetadata) GetLowCreditThreshold() int32`

GetLowCreditThreshold returns the LowCreditThreshold field if non-nil, zero value otherwise.

### GetLowCreditThresholdOk

`func (o *AuthSessionMetadata) GetLowCreditThresholdOk() (*int32, bool)`

GetLowCreditThresholdOk returns a tuple with the LowCreditThreshold field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLowCreditThreshold

`func (o *AuthSessionMetadata) SetLowCreditThreshold(v int32)`

SetLowCreditThreshold sets LowCreditThreshold field to given value.

### HasLowCreditThreshold

`func (o *AuthSessionMetadata) HasLowCreditThreshold() bool`

HasLowCreditThreshold returns a boolean if a field has been set.

### SetLowCreditThresholdNil

`func (o *AuthSessionMetadata) SetLowCreditThresholdNil(b bool)`

 SetLowCreditThresholdNil sets the value for LowCreditThreshold to be an explicit nil

### UnsetLowCreditThreshold
`func (o *AuthSessionMetadata) UnsetLowCreditThreshold()`

UnsetLowCreditThreshold ensures that no value is present for LowCreditThreshold, not even an explicit nil
### GetIsLowCredit

`func (o *AuthSessionMetadata) GetIsLowCredit() bool`

GetIsLowCredit returns the IsLowCredit field if non-nil, zero value otherwise.

### GetIsLowCreditOk

`func (o *AuthSessionMetadata) GetIsLowCreditOk() (*bool, bool)`

GetIsLowCreditOk returns a tuple with the IsLowCredit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsLowCredit

`func (o *AuthSessionMetadata) SetIsLowCredit(v bool)`

SetIsLowCredit sets IsLowCredit field to given value.

### HasIsLowCredit

`func (o *AuthSessionMetadata) HasIsLowCredit() bool`

HasIsLowCredit returns a boolean if a field has been set.

### GetPermissions

`func (o *AuthSessionMetadata) GetPermissions() AuthPermissionSet`

GetPermissions returns the Permissions field if non-nil, zero value otherwise.

### GetPermissionsOk

`func (o *AuthSessionMetadata) GetPermissionsOk() (*AuthPermissionSet, bool)`

GetPermissionsOk returns a tuple with the Permissions field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPermissions

`func (o *AuthSessionMetadata) SetPermissions(v AuthPermissionSet)`

SetPermissions sets Permissions field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


