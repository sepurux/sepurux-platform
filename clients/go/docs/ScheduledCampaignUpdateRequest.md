# ScheduledCampaignUpdateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Enabled** | Pointer to **NullableBool** |  | [optional] 
**CronSchedule** | Pointer to **NullableString** |  | [optional] 

## Methods

### NewScheduledCampaignUpdateRequest

`func NewScheduledCampaignUpdateRequest() *ScheduledCampaignUpdateRequest`

NewScheduledCampaignUpdateRequest instantiates a new ScheduledCampaignUpdateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewScheduledCampaignUpdateRequestWithDefaults

`func NewScheduledCampaignUpdateRequestWithDefaults() *ScheduledCampaignUpdateRequest`

NewScheduledCampaignUpdateRequestWithDefaults instantiates a new ScheduledCampaignUpdateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEnabled

`func (o *ScheduledCampaignUpdateRequest) GetEnabled() bool`

GetEnabled returns the Enabled field if non-nil, zero value otherwise.

### GetEnabledOk

`func (o *ScheduledCampaignUpdateRequest) GetEnabledOk() (*bool, bool)`

GetEnabledOk returns a tuple with the Enabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEnabled

`func (o *ScheduledCampaignUpdateRequest) SetEnabled(v bool)`

SetEnabled sets Enabled field to given value.

### HasEnabled

`func (o *ScheduledCampaignUpdateRequest) HasEnabled() bool`

HasEnabled returns a boolean if a field has been set.

### SetEnabledNil

`func (o *ScheduledCampaignUpdateRequest) SetEnabledNil(b bool)`

 SetEnabledNil sets the value for Enabled to be an explicit nil

### UnsetEnabled
`func (o *ScheduledCampaignUpdateRequest) UnsetEnabled()`

UnsetEnabled ensures that no value is present for Enabled, not even an explicit nil
### GetCronSchedule

`func (o *ScheduledCampaignUpdateRequest) GetCronSchedule() string`

GetCronSchedule returns the CronSchedule field if non-nil, zero value otherwise.

### GetCronScheduleOk

`func (o *ScheduledCampaignUpdateRequest) GetCronScheduleOk() (*string, bool)`

GetCronScheduleOk returns a tuple with the CronSchedule field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCronSchedule

`func (o *ScheduledCampaignUpdateRequest) SetCronSchedule(v string)`

SetCronSchedule sets CronSchedule field to given value.

### HasCronSchedule

`func (o *ScheduledCampaignUpdateRequest) HasCronSchedule() bool`

HasCronSchedule returns a boolean if a field has been set.

### SetCronScheduleNil

`func (o *ScheduledCampaignUpdateRequest) SetCronScheduleNil(b bool)`

 SetCronScheduleNil sets the value for CronSchedule to be an explicit nil

### UnsetCronSchedule
`func (o *ScheduledCampaignUpdateRequest) UnsetCronSchedule()`

UnsetCronSchedule ensures that no value is present for CronSchedule, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


