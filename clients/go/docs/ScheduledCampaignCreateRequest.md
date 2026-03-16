# ScheduledCampaignCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**CampaignId** | **string** |  | 
**MutationPackId** | **string** |  | 
**CronSchedule** | **string** |  | 
**Enabled** | Pointer to **bool** |  | [optional] [default to true]

## Methods

### NewScheduledCampaignCreateRequest

`func NewScheduledCampaignCreateRequest(campaignId string, mutationPackId string, cronSchedule string, ) *ScheduledCampaignCreateRequest`

NewScheduledCampaignCreateRequest instantiates a new ScheduledCampaignCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewScheduledCampaignCreateRequestWithDefaults

`func NewScheduledCampaignCreateRequestWithDefaults() *ScheduledCampaignCreateRequest`

NewScheduledCampaignCreateRequestWithDefaults instantiates a new ScheduledCampaignCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetCampaignId

`func (o *ScheduledCampaignCreateRequest) GetCampaignId() string`

GetCampaignId returns the CampaignId field if non-nil, zero value otherwise.

### GetCampaignIdOk

`func (o *ScheduledCampaignCreateRequest) GetCampaignIdOk() (*string, bool)`

GetCampaignIdOk returns a tuple with the CampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignId

`func (o *ScheduledCampaignCreateRequest) SetCampaignId(v string)`

SetCampaignId sets CampaignId field to given value.


### GetMutationPackId

`func (o *ScheduledCampaignCreateRequest) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *ScheduledCampaignCreateRequest) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *ScheduledCampaignCreateRequest) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.


### GetCronSchedule

`func (o *ScheduledCampaignCreateRequest) GetCronSchedule() string`

GetCronSchedule returns the CronSchedule field if non-nil, zero value otherwise.

### GetCronScheduleOk

`func (o *ScheduledCampaignCreateRequest) GetCronScheduleOk() (*string, bool)`

GetCronScheduleOk returns a tuple with the CronSchedule field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCronSchedule

`func (o *ScheduledCampaignCreateRequest) SetCronSchedule(v string)`

SetCronSchedule sets CronSchedule field to given value.


### GetEnabled

`func (o *ScheduledCampaignCreateRequest) GetEnabled() bool`

GetEnabled returns the Enabled field if non-nil, zero value otherwise.

### GetEnabledOk

`func (o *ScheduledCampaignCreateRequest) GetEnabledOk() (*bool, bool)`

GetEnabledOk returns a tuple with the Enabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEnabled

`func (o *ScheduledCampaignCreateRequest) SetEnabled(v bool)`

SetEnabled sets Enabled field to given value.

### HasEnabled

`func (o *ScheduledCampaignCreateRequest) HasEnabled() bool`

HasEnabled returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


