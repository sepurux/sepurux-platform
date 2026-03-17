# ScheduledCampaignMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ScheduledCampaignId** | **string** |  | 
**ProjectId** | **string** |  | 
**CampaignId** | **string** |  | 
**MutationPackId** | **string** |  | 
**CronSchedule** | **string** |  | 
**Enabled** | **bool** |  | 
**LastRunAt** | Pointer to **NullableTime** |  | [optional] 
**LastRunStatus** | Pointer to **NullableString** |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewScheduledCampaignMetadata

`func NewScheduledCampaignMetadata(scheduledCampaignId string, projectId string, campaignId string, mutationPackId string, cronSchedule string, enabled bool, createdAt time.Time, ) *ScheduledCampaignMetadata`

NewScheduledCampaignMetadata instantiates a new ScheduledCampaignMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewScheduledCampaignMetadataWithDefaults

`func NewScheduledCampaignMetadataWithDefaults() *ScheduledCampaignMetadata`

NewScheduledCampaignMetadataWithDefaults instantiates a new ScheduledCampaignMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetScheduledCampaignId

`func (o *ScheduledCampaignMetadata) GetScheduledCampaignId() string`

GetScheduledCampaignId returns the ScheduledCampaignId field if non-nil, zero value otherwise.

### GetScheduledCampaignIdOk

`func (o *ScheduledCampaignMetadata) GetScheduledCampaignIdOk() (*string, bool)`

GetScheduledCampaignIdOk returns a tuple with the ScheduledCampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScheduledCampaignId

`func (o *ScheduledCampaignMetadata) SetScheduledCampaignId(v string)`

SetScheduledCampaignId sets ScheduledCampaignId field to given value.


### GetProjectId

`func (o *ScheduledCampaignMetadata) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *ScheduledCampaignMetadata) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *ScheduledCampaignMetadata) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetCampaignId

`func (o *ScheduledCampaignMetadata) GetCampaignId() string`

GetCampaignId returns the CampaignId field if non-nil, zero value otherwise.

### GetCampaignIdOk

`func (o *ScheduledCampaignMetadata) GetCampaignIdOk() (*string, bool)`

GetCampaignIdOk returns a tuple with the CampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignId

`func (o *ScheduledCampaignMetadata) SetCampaignId(v string)`

SetCampaignId sets CampaignId field to given value.


### GetMutationPackId

`func (o *ScheduledCampaignMetadata) GetMutationPackId() string`

GetMutationPackId returns the MutationPackId field if non-nil, zero value otherwise.

### GetMutationPackIdOk

`func (o *ScheduledCampaignMetadata) GetMutationPackIdOk() (*string, bool)`

GetMutationPackIdOk returns a tuple with the MutationPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutationPackId

`func (o *ScheduledCampaignMetadata) SetMutationPackId(v string)`

SetMutationPackId sets MutationPackId field to given value.


### GetCronSchedule

`func (o *ScheduledCampaignMetadata) GetCronSchedule() string`

GetCronSchedule returns the CronSchedule field if non-nil, zero value otherwise.

### GetCronScheduleOk

`func (o *ScheduledCampaignMetadata) GetCronScheduleOk() (*string, bool)`

GetCronScheduleOk returns a tuple with the CronSchedule field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCronSchedule

`func (o *ScheduledCampaignMetadata) SetCronSchedule(v string)`

SetCronSchedule sets CronSchedule field to given value.


### GetEnabled

`func (o *ScheduledCampaignMetadata) GetEnabled() bool`

GetEnabled returns the Enabled field if non-nil, zero value otherwise.

### GetEnabledOk

`func (o *ScheduledCampaignMetadata) GetEnabledOk() (*bool, bool)`

GetEnabledOk returns a tuple with the Enabled field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEnabled

`func (o *ScheduledCampaignMetadata) SetEnabled(v bool)`

SetEnabled sets Enabled field to given value.


### GetLastRunAt

`func (o *ScheduledCampaignMetadata) GetLastRunAt() time.Time`

GetLastRunAt returns the LastRunAt field if non-nil, zero value otherwise.

### GetLastRunAtOk

`func (o *ScheduledCampaignMetadata) GetLastRunAtOk() (*time.Time, bool)`

GetLastRunAtOk returns a tuple with the LastRunAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastRunAt

`func (o *ScheduledCampaignMetadata) SetLastRunAt(v time.Time)`

SetLastRunAt sets LastRunAt field to given value.

### HasLastRunAt

`func (o *ScheduledCampaignMetadata) HasLastRunAt() bool`

HasLastRunAt returns a boolean if a field has been set.

### SetLastRunAtNil

`func (o *ScheduledCampaignMetadata) SetLastRunAtNil(b bool)`

 SetLastRunAtNil sets the value for LastRunAt to be an explicit nil

### UnsetLastRunAt
`func (o *ScheduledCampaignMetadata) UnsetLastRunAt()`

UnsetLastRunAt ensures that no value is present for LastRunAt, not even an explicit nil
### GetLastRunStatus

`func (o *ScheduledCampaignMetadata) GetLastRunStatus() string`

GetLastRunStatus returns the LastRunStatus field if non-nil, zero value otherwise.

### GetLastRunStatusOk

`func (o *ScheduledCampaignMetadata) GetLastRunStatusOk() (*string, bool)`

GetLastRunStatusOk returns a tuple with the LastRunStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastRunStatus

`func (o *ScheduledCampaignMetadata) SetLastRunStatus(v string)`

SetLastRunStatus sets LastRunStatus field to given value.

### HasLastRunStatus

`func (o *ScheduledCampaignMetadata) HasLastRunStatus() bool`

HasLastRunStatus returns a boolean if a field has been set.

### SetLastRunStatusNil

`func (o *ScheduledCampaignMetadata) SetLastRunStatusNil(b bool)`

 SetLastRunStatusNil sets the value for LastRunStatus to be an explicit nil

### UnsetLastRunStatus
`func (o *ScheduledCampaignMetadata) UnsetLastRunStatus()`

UnsetLastRunStatus ensures that no value is present for LastRunStatus, not even an explicit nil
### GetCreatedAt

`func (o *ScheduledCampaignMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *ScheduledCampaignMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *ScheduledCampaignMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


