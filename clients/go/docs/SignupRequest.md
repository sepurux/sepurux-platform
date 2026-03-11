# SignupRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Email** | **string** |  | 
**Password** | **string** |  | 
**Name** | Pointer to **NullableString** |  | [optional] 
**ProjectName** | Pointer to **NullableString** |  | [optional] 
**PricingTier** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewSignupRequest

`func NewSignupRequest(email string, password string, ) *SignupRequest`

NewSignupRequest instantiates a new SignupRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSignupRequestWithDefaults

`func NewSignupRequestWithDefaults() *SignupRequest`

NewSignupRequestWithDefaults instantiates a new SignupRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEmail

`func (o *SignupRequest) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *SignupRequest) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *SignupRequest) SetEmail(v string)`

SetEmail sets Email field to given value.


### GetPassword

`func (o *SignupRequest) GetPassword() string`

GetPassword returns the Password field if non-nil, zero value otherwise.

### GetPasswordOk

`func (o *SignupRequest) GetPasswordOk() (*string, bool)`

GetPasswordOk returns a tuple with the Password field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPassword

`func (o *SignupRequest) SetPassword(v string)`

SetPassword sets Password field to given value.


### GetName

`func (o *SignupRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *SignupRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *SignupRequest) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *SignupRequest) HasName() bool`

HasName returns a boolean if a field has been set.

### SetNameNil

`func (o *SignupRequest) SetNameNil(b bool)`

 SetNameNil sets the value for Name to be an explicit nil

### UnsetName
`func (o *SignupRequest) UnsetName()`

UnsetName ensures that no value is present for Name, not even an explicit nil
### GetProjectName

`func (o *SignupRequest) GetProjectName() string`

GetProjectName returns the ProjectName field if non-nil, zero value otherwise.

### GetProjectNameOk

`func (o *SignupRequest) GetProjectNameOk() (*string, bool)`

GetProjectNameOk returns a tuple with the ProjectName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectName

`func (o *SignupRequest) SetProjectName(v string)`

SetProjectName sets ProjectName field to given value.

### HasProjectName

`func (o *SignupRequest) HasProjectName() bool`

HasProjectName returns a boolean if a field has been set.

### SetProjectNameNil

`func (o *SignupRequest) SetProjectNameNil(b bool)`

 SetProjectNameNil sets the value for ProjectName to be an explicit nil

### UnsetProjectName
`func (o *SignupRequest) UnsetProjectName()`

UnsetProjectName ensures that no value is present for ProjectName, not even an explicit nil
### GetPricingTier

`func (o *SignupRequest) GetPricingTier() string`

GetPricingTier returns the PricingTier field if non-nil, zero value otherwise.

### GetPricingTierOk

`func (o *SignupRequest) GetPricingTierOk() (*string, bool)`

GetPricingTierOk returns a tuple with the PricingTier field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPricingTier

`func (o *SignupRequest) SetPricingTier(v string)`

SetPricingTier sets PricingTier field to given value.

### HasPricingTier

`func (o *SignupRequest) HasPricingTier() bool`

HasPricingTier returns a boolean if a field has been set.

### SetPricingTierNil

`func (o *SignupRequest) SetPricingTierNil(b bool)`

 SetPricingTierNil sets the value for PricingTier to be an explicit nil

### UnsetPricingTier
`func (o *SignupRequest) UnsetPricingTier()`

UnsetPricingTier ensures that no value is present for PricingTier, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


