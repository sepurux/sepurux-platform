# DemoInfoResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**DemoApiKey** | **string** |  | 
**DemoCampaign** | **string** |  | 
**DemoProject** | Pointer to **NullableString** |  | [optional] 
**DemoMutationPack** | Pointer to **NullableString** |  | [optional] 
**Limits** | [**DemoLimits**](DemoLimits.md) |  | 
**RecommendedFlow** | Pointer to **string** |  | [optional] [default to "session"]
**SessionTtlMinutes** | Pointer to **NullableInt32** |  | [optional] 

## Methods

### NewDemoInfoResponse

`func NewDemoInfoResponse(demoApiKey string, demoCampaign string, limits DemoLimits, ) *DemoInfoResponse`

NewDemoInfoResponse instantiates a new DemoInfoResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewDemoInfoResponseWithDefaults

`func NewDemoInfoResponseWithDefaults() *DemoInfoResponse`

NewDemoInfoResponseWithDefaults instantiates a new DemoInfoResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDemoApiKey

`func (o *DemoInfoResponse) GetDemoApiKey() string`

GetDemoApiKey returns the DemoApiKey field if non-nil, zero value otherwise.

### GetDemoApiKeyOk

`func (o *DemoInfoResponse) GetDemoApiKeyOk() (*string, bool)`

GetDemoApiKeyOk returns a tuple with the DemoApiKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDemoApiKey

`func (o *DemoInfoResponse) SetDemoApiKey(v string)`

SetDemoApiKey sets DemoApiKey field to given value.


### GetDemoCampaign

`func (o *DemoInfoResponse) GetDemoCampaign() string`

GetDemoCampaign returns the DemoCampaign field if non-nil, zero value otherwise.

### GetDemoCampaignOk

`func (o *DemoInfoResponse) GetDemoCampaignOk() (*string, bool)`

GetDemoCampaignOk returns a tuple with the DemoCampaign field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDemoCampaign

`func (o *DemoInfoResponse) SetDemoCampaign(v string)`

SetDemoCampaign sets DemoCampaign field to given value.


### GetDemoProject

`func (o *DemoInfoResponse) GetDemoProject() string`

GetDemoProject returns the DemoProject field if non-nil, zero value otherwise.

### GetDemoProjectOk

`func (o *DemoInfoResponse) GetDemoProjectOk() (*string, bool)`

GetDemoProjectOk returns a tuple with the DemoProject field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDemoProject

`func (o *DemoInfoResponse) SetDemoProject(v string)`

SetDemoProject sets DemoProject field to given value.

### HasDemoProject

`func (o *DemoInfoResponse) HasDemoProject() bool`

HasDemoProject returns a boolean if a field has been set.

### SetDemoProjectNil

`func (o *DemoInfoResponse) SetDemoProjectNil(b bool)`

 SetDemoProjectNil sets the value for DemoProject to be an explicit nil

### UnsetDemoProject
`func (o *DemoInfoResponse) UnsetDemoProject()`

UnsetDemoProject ensures that no value is present for DemoProject, not even an explicit nil
### GetDemoMutationPack

`func (o *DemoInfoResponse) GetDemoMutationPack() string`

GetDemoMutationPack returns the DemoMutationPack field if non-nil, zero value otherwise.

### GetDemoMutationPackOk

`func (o *DemoInfoResponse) GetDemoMutationPackOk() (*string, bool)`

GetDemoMutationPackOk returns a tuple with the DemoMutationPack field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDemoMutationPack

`func (o *DemoInfoResponse) SetDemoMutationPack(v string)`

SetDemoMutationPack sets DemoMutationPack field to given value.

### HasDemoMutationPack

`func (o *DemoInfoResponse) HasDemoMutationPack() bool`

HasDemoMutationPack returns a boolean if a field has been set.

### SetDemoMutationPackNil

`func (o *DemoInfoResponse) SetDemoMutationPackNil(b bool)`

 SetDemoMutationPackNil sets the value for DemoMutationPack to be an explicit nil

### UnsetDemoMutationPack
`func (o *DemoInfoResponse) UnsetDemoMutationPack()`

UnsetDemoMutationPack ensures that no value is present for DemoMutationPack, not even an explicit nil
### GetLimits

`func (o *DemoInfoResponse) GetLimits() DemoLimits`

GetLimits returns the Limits field if non-nil, zero value otherwise.

### GetLimitsOk

`func (o *DemoInfoResponse) GetLimitsOk() (*DemoLimits, bool)`

GetLimitsOk returns a tuple with the Limits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLimits

`func (o *DemoInfoResponse) SetLimits(v DemoLimits)`

SetLimits sets Limits field to given value.


### GetRecommendedFlow

`func (o *DemoInfoResponse) GetRecommendedFlow() string`

GetRecommendedFlow returns the RecommendedFlow field if non-nil, zero value otherwise.

### GetRecommendedFlowOk

`func (o *DemoInfoResponse) GetRecommendedFlowOk() (*string, bool)`

GetRecommendedFlowOk returns a tuple with the RecommendedFlow field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecommendedFlow

`func (o *DemoInfoResponse) SetRecommendedFlow(v string)`

SetRecommendedFlow sets RecommendedFlow field to given value.

### HasRecommendedFlow

`func (o *DemoInfoResponse) HasRecommendedFlow() bool`

HasRecommendedFlow returns a boolean if a field has been set.

### GetSessionTtlMinutes

`func (o *DemoInfoResponse) GetSessionTtlMinutes() int32`

GetSessionTtlMinutes returns the SessionTtlMinutes field if non-nil, zero value otherwise.

### GetSessionTtlMinutesOk

`func (o *DemoInfoResponse) GetSessionTtlMinutesOk() (*int32, bool)`

GetSessionTtlMinutesOk returns a tuple with the SessionTtlMinutes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSessionTtlMinutes

`func (o *DemoInfoResponse) SetSessionTtlMinutes(v int32)`

SetSessionTtlMinutes sets SessionTtlMinutes field to given value.

### HasSessionTtlMinutes

`func (o *DemoInfoResponse) HasSessionTtlMinutes() bool`

HasSessionTtlMinutes returns a boolean if a field has been set.

### SetSessionTtlMinutesNil

`func (o *DemoInfoResponse) SetSessionTtlMinutesNil(b bool)`

 SetSessionTtlMinutesNil sets the value for SessionTtlMinutes to be an explicit nil

### UnsetSessionTtlMinutes
`func (o *DemoInfoResponse) UnsetSessionTtlMinutes()`

UnsetSessionTtlMinutes ensures that no value is present for SessionTtlMinutes, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


