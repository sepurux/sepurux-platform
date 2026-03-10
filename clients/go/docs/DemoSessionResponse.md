# DemoSessionResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ApiKey** | **string** |  | 
**ProjectId** | **string** |  | 
**ProjectName** | **string** |  | 
**DemoCampaign** | **string** |  | 
**DemoMutationPack** | **string** |  | 
**ExpiresAt** | **time.Time** |  | 
**RateLimitPerMinute** | **int32** |  | 
**Limits** | [**DemoLimits**](DemoLimits.md) |  | 

## Methods

### NewDemoSessionResponse

`func NewDemoSessionResponse(apiKey string, projectId string, projectName string, demoCampaign string, demoMutationPack string, expiresAt time.Time, rateLimitPerMinute int32, limits DemoLimits, ) *DemoSessionResponse`

NewDemoSessionResponse instantiates a new DemoSessionResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewDemoSessionResponseWithDefaults

`func NewDemoSessionResponseWithDefaults() *DemoSessionResponse`

NewDemoSessionResponseWithDefaults instantiates a new DemoSessionResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetApiKey

`func (o *DemoSessionResponse) GetApiKey() string`

GetApiKey returns the ApiKey field if non-nil, zero value otherwise.

### GetApiKeyOk

`func (o *DemoSessionResponse) GetApiKeyOk() (*string, bool)`

GetApiKeyOk returns a tuple with the ApiKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetApiKey

`func (o *DemoSessionResponse) SetApiKey(v string)`

SetApiKey sets ApiKey field to given value.


### GetProjectId

`func (o *DemoSessionResponse) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *DemoSessionResponse) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *DemoSessionResponse) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetProjectName

`func (o *DemoSessionResponse) GetProjectName() string`

GetProjectName returns the ProjectName field if non-nil, zero value otherwise.

### GetProjectNameOk

`func (o *DemoSessionResponse) GetProjectNameOk() (*string, bool)`

GetProjectNameOk returns a tuple with the ProjectName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectName

`func (o *DemoSessionResponse) SetProjectName(v string)`

SetProjectName sets ProjectName field to given value.


### GetDemoCampaign

`func (o *DemoSessionResponse) GetDemoCampaign() string`

GetDemoCampaign returns the DemoCampaign field if non-nil, zero value otherwise.

### GetDemoCampaignOk

`func (o *DemoSessionResponse) GetDemoCampaignOk() (*string, bool)`

GetDemoCampaignOk returns a tuple with the DemoCampaign field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDemoCampaign

`func (o *DemoSessionResponse) SetDemoCampaign(v string)`

SetDemoCampaign sets DemoCampaign field to given value.


### GetDemoMutationPack

`func (o *DemoSessionResponse) GetDemoMutationPack() string`

GetDemoMutationPack returns the DemoMutationPack field if non-nil, zero value otherwise.

### GetDemoMutationPackOk

`func (o *DemoSessionResponse) GetDemoMutationPackOk() (*string, bool)`

GetDemoMutationPackOk returns a tuple with the DemoMutationPack field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDemoMutationPack

`func (o *DemoSessionResponse) SetDemoMutationPack(v string)`

SetDemoMutationPack sets DemoMutationPack field to given value.


### GetExpiresAt

`func (o *DemoSessionResponse) GetExpiresAt() time.Time`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *DemoSessionResponse) GetExpiresAtOk() (*time.Time, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *DemoSessionResponse) SetExpiresAt(v time.Time)`

SetExpiresAt sets ExpiresAt field to given value.


### GetRateLimitPerMinute

`func (o *DemoSessionResponse) GetRateLimitPerMinute() int32`

GetRateLimitPerMinute returns the RateLimitPerMinute field if non-nil, zero value otherwise.

### GetRateLimitPerMinuteOk

`func (o *DemoSessionResponse) GetRateLimitPerMinuteOk() (*int32, bool)`

GetRateLimitPerMinuteOk returns a tuple with the RateLimitPerMinute field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRateLimitPerMinute

`func (o *DemoSessionResponse) SetRateLimitPerMinute(v int32)`

SetRateLimitPerMinute sets RateLimitPerMinute field to given value.


### GetLimits

`func (o *DemoSessionResponse) GetLimits() DemoLimits`

GetLimits returns the Limits field if non-nil, zero value otherwise.

### GetLimitsOk

`func (o *DemoSessionResponse) GetLimitsOk() (*DemoLimits, bool)`

GetLimitsOk returns a tuple with the Limits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLimits

`func (o *DemoSessionResponse) SetLimits(v DemoLimits)`

SetLimits sets Limits field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


