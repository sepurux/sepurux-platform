# UserSubscriptionMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SubscriptionId** | **string** |  | 
**PlanId** | **string** |  | 
**PlanName** | Pointer to **NullableString** |  | [optional] 
**MonthlyPrice** | Pointer to **NullableInt32** |  | [optional] 
**MonthlyCredits** | Pointer to **NullableInt32** |  | [optional] 
**QueuePriority** | Pointer to **string** |  | [optional] [default to "normal"]
**Status** | **string** |  | 
**StartDate** | **time.Time** |  | 
**RenewalDate** | **time.Time** |  | 

## Methods

### NewUserSubscriptionMetadata

`func NewUserSubscriptionMetadata(subscriptionId string, planId string, status string, startDate time.Time, renewalDate time.Time, ) *UserSubscriptionMetadata`

NewUserSubscriptionMetadata instantiates a new UserSubscriptionMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUserSubscriptionMetadataWithDefaults

`func NewUserSubscriptionMetadataWithDefaults() *UserSubscriptionMetadata`

NewUserSubscriptionMetadataWithDefaults instantiates a new UserSubscriptionMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSubscriptionId

`func (o *UserSubscriptionMetadata) GetSubscriptionId() string`

GetSubscriptionId returns the SubscriptionId field if non-nil, zero value otherwise.

### GetSubscriptionIdOk

`func (o *UserSubscriptionMetadata) GetSubscriptionIdOk() (*string, bool)`

GetSubscriptionIdOk returns a tuple with the SubscriptionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSubscriptionId

`func (o *UserSubscriptionMetadata) SetSubscriptionId(v string)`

SetSubscriptionId sets SubscriptionId field to given value.


### GetPlanId

`func (o *UserSubscriptionMetadata) GetPlanId() string`

GetPlanId returns the PlanId field if non-nil, zero value otherwise.

### GetPlanIdOk

`func (o *UserSubscriptionMetadata) GetPlanIdOk() (*string, bool)`

GetPlanIdOk returns a tuple with the PlanId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlanId

`func (o *UserSubscriptionMetadata) SetPlanId(v string)`

SetPlanId sets PlanId field to given value.


### GetPlanName

`func (o *UserSubscriptionMetadata) GetPlanName() string`

GetPlanName returns the PlanName field if non-nil, zero value otherwise.

### GetPlanNameOk

`func (o *UserSubscriptionMetadata) GetPlanNameOk() (*string, bool)`

GetPlanNameOk returns a tuple with the PlanName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlanName

`func (o *UserSubscriptionMetadata) SetPlanName(v string)`

SetPlanName sets PlanName field to given value.

### HasPlanName

`func (o *UserSubscriptionMetadata) HasPlanName() bool`

HasPlanName returns a boolean if a field has been set.

### SetPlanNameNil

`func (o *UserSubscriptionMetadata) SetPlanNameNil(b bool)`

 SetPlanNameNil sets the value for PlanName to be an explicit nil

### UnsetPlanName
`func (o *UserSubscriptionMetadata) UnsetPlanName()`

UnsetPlanName ensures that no value is present for PlanName, not even an explicit nil
### GetMonthlyPrice

`func (o *UserSubscriptionMetadata) GetMonthlyPrice() int32`

GetMonthlyPrice returns the MonthlyPrice field if non-nil, zero value otherwise.

### GetMonthlyPriceOk

`func (o *UserSubscriptionMetadata) GetMonthlyPriceOk() (*int32, bool)`

GetMonthlyPriceOk returns a tuple with the MonthlyPrice field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMonthlyPrice

`func (o *UserSubscriptionMetadata) SetMonthlyPrice(v int32)`

SetMonthlyPrice sets MonthlyPrice field to given value.

### HasMonthlyPrice

`func (o *UserSubscriptionMetadata) HasMonthlyPrice() bool`

HasMonthlyPrice returns a boolean if a field has been set.

### SetMonthlyPriceNil

`func (o *UserSubscriptionMetadata) SetMonthlyPriceNil(b bool)`

 SetMonthlyPriceNil sets the value for MonthlyPrice to be an explicit nil

### UnsetMonthlyPrice
`func (o *UserSubscriptionMetadata) UnsetMonthlyPrice()`

UnsetMonthlyPrice ensures that no value is present for MonthlyPrice, not even an explicit nil
### GetMonthlyCredits

`func (o *UserSubscriptionMetadata) GetMonthlyCredits() int32`

GetMonthlyCredits returns the MonthlyCredits field if non-nil, zero value otherwise.

### GetMonthlyCreditsOk

`func (o *UserSubscriptionMetadata) GetMonthlyCreditsOk() (*int32, bool)`

GetMonthlyCreditsOk returns a tuple with the MonthlyCredits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMonthlyCredits

`func (o *UserSubscriptionMetadata) SetMonthlyCredits(v int32)`

SetMonthlyCredits sets MonthlyCredits field to given value.

### HasMonthlyCredits

`func (o *UserSubscriptionMetadata) HasMonthlyCredits() bool`

HasMonthlyCredits returns a boolean if a field has been set.

### SetMonthlyCreditsNil

`func (o *UserSubscriptionMetadata) SetMonthlyCreditsNil(b bool)`

 SetMonthlyCreditsNil sets the value for MonthlyCredits to be an explicit nil

### UnsetMonthlyCredits
`func (o *UserSubscriptionMetadata) UnsetMonthlyCredits()`

UnsetMonthlyCredits ensures that no value is present for MonthlyCredits, not even an explicit nil
### GetQueuePriority

`func (o *UserSubscriptionMetadata) GetQueuePriority() string`

GetQueuePriority returns the QueuePriority field if non-nil, zero value otherwise.

### GetQueuePriorityOk

`func (o *UserSubscriptionMetadata) GetQueuePriorityOk() (*string, bool)`

GetQueuePriorityOk returns a tuple with the QueuePriority field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQueuePriority

`func (o *UserSubscriptionMetadata) SetQueuePriority(v string)`

SetQueuePriority sets QueuePriority field to given value.

### HasQueuePriority

`func (o *UserSubscriptionMetadata) HasQueuePriority() bool`

HasQueuePriority returns a boolean if a field has been set.

### GetStatus

`func (o *UserSubscriptionMetadata) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *UserSubscriptionMetadata) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *UserSubscriptionMetadata) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetStartDate

`func (o *UserSubscriptionMetadata) GetStartDate() time.Time`

GetStartDate returns the StartDate field if non-nil, zero value otherwise.

### GetStartDateOk

`func (o *UserSubscriptionMetadata) GetStartDateOk() (*time.Time, bool)`

GetStartDateOk returns a tuple with the StartDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartDate

`func (o *UserSubscriptionMetadata) SetStartDate(v time.Time)`

SetStartDate sets StartDate field to given value.


### GetRenewalDate

`func (o *UserSubscriptionMetadata) GetRenewalDate() time.Time`

GetRenewalDate returns the RenewalDate field if non-nil, zero value otherwise.

### GetRenewalDateOk

`func (o *UserSubscriptionMetadata) GetRenewalDateOk() (*time.Time, bool)`

GetRenewalDateOk returns a tuple with the RenewalDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRenewalDate

`func (o *UserSubscriptionMetadata) SetRenewalDate(v time.Time)`

SetRenewalDate sets RenewalDate field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


