# SubscriptionPlanMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**PlanId** | **string** |  | 
**Name** | **string** |  | 
**MonthlyPrice** | **int32** |  | 
**MonthlyCredits** | **int32** |  | 
**CheckoutEnabled** | Pointer to **bool** |  | [optional] [default to false]
**Features** | **map[string]interface{}** |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewSubscriptionPlanMetadata

`func NewSubscriptionPlanMetadata(planId string, name string, monthlyPrice int32, monthlyCredits int32, features map[string]interface{}, createdAt time.Time, ) *SubscriptionPlanMetadata`

NewSubscriptionPlanMetadata instantiates a new SubscriptionPlanMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSubscriptionPlanMetadataWithDefaults

`func NewSubscriptionPlanMetadataWithDefaults() *SubscriptionPlanMetadata`

NewSubscriptionPlanMetadataWithDefaults instantiates a new SubscriptionPlanMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPlanId

`func (o *SubscriptionPlanMetadata) GetPlanId() string`

GetPlanId returns the PlanId field if non-nil, zero value otherwise.

### GetPlanIdOk

`func (o *SubscriptionPlanMetadata) GetPlanIdOk() (*string, bool)`

GetPlanIdOk returns a tuple with the PlanId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlanId

`func (o *SubscriptionPlanMetadata) SetPlanId(v string)`

SetPlanId sets PlanId field to given value.


### GetName

`func (o *SubscriptionPlanMetadata) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *SubscriptionPlanMetadata) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *SubscriptionPlanMetadata) SetName(v string)`

SetName sets Name field to given value.


### GetMonthlyPrice

`func (o *SubscriptionPlanMetadata) GetMonthlyPrice() int32`

GetMonthlyPrice returns the MonthlyPrice field if non-nil, zero value otherwise.

### GetMonthlyPriceOk

`func (o *SubscriptionPlanMetadata) GetMonthlyPriceOk() (*int32, bool)`

GetMonthlyPriceOk returns a tuple with the MonthlyPrice field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMonthlyPrice

`func (o *SubscriptionPlanMetadata) SetMonthlyPrice(v int32)`

SetMonthlyPrice sets MonthlyPrice field to given value.


### GetMonthlyCredits

`func (o *SubscriptionPlanMetadata) GetMonthlyCredits() int32`

GetMonthlyCredits returns the MonthlyCredits field if non-nil, zero value otherwise.

### GetMonthlyCreditsOk

`func (o *SubscriptionPlanMetadata) GetMonthlyCreditsOk() (*int32, bool)`

GetMonthlyCreditsOk returns a tuple with the MonthlyCredits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMonthlyCredits

`func (o *SubscriptionPlanMetadata) SetMonthlyCredits(v int32)`

SetMonthlyCredits sets MonthlyCredits field to given value.


### GetCheckoutEnabled

`func (o *SubscriptionPlanMetadata) GetCheckoutEnabled() bool`

GetCheckoutEnabled returns the CheckoutEnabled field if non-nil, zero value otherwise.

### GetCheckoutEnabledOk

`func (o *SubscriptionPlanMetadata) GetCheckoutEnabledOk() (*bool, bool)`

GetCheckoutEnabledOk returns a tuple with the CheckoutEnabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCheckoutEnabled

`func (o *SubscriptionPlanMetadata) SetCheckoutEnabled(v bool)`

SetCheckoutEnabled sets CheckoutEnabled field to given value.

### HasCheckoutEnabled

`func (o *SubscriptionPlanMetadata) HasCheckoutEnabled() bool`

HasCheckoutEnabled returns a boolean if a field has been set.

### GetFeatures

`func (o *SubscriptionPlanMetadata) GetFeatures() map[string]interface{}`

GetFeatures returns the Features field if non-nil, zero value otherwise.

### GetFeaturesOk

`func (o *SubscriptionPlanMetadata) GetFeaturesOk() (*map[string]interface{}, bool)`

GetFeaturesOk returns a tuple with the Features field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFeatures

`func (o *SubscriptionPlanMetadata) SetFeatures(v map[string]interface{})`

SetFeatures sets Features field to given value.


### GetCreatedAt

`func (o *SubscriptionPlanMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *SubscriptionPlanMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *SubscriptionPlanMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


