# CIRunCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TraceId** | **string** |  | 
**CampaignId** | **string** |  | 
**Thresholds** | [**CIRunThresholds**](CIRunThresholds.md) |  | 

## Methods

### NewCIRunCreateRequest

`func NewCIRunCreateRequest(traceId string, campaignId string, thresholds CIRunThresholds, ) *CIRunCreateRequest`

NewCIRunCreateRequest instantiates a new CIRunCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCIRunCreateRequestWithDefaults

`func NewCIRunCreateRequestWithDefaults() *CIRunCreateRequest`

NewCIRunCreateRequestWithDefaults instantiates a new CIRunCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTraceId

`func (o *CIRunCreateRequest) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *CIRunCreateRequest) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *CIRunCreateRequest) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.


### GetCampaignId

`func (o *CIRunCreateRequest) GetCampaignId() string`

GetCampaignId returns the CampaignId field if non-nil, zero value otherwise.

### GetCampaignIdOk

`func (o *CIRunCreateRequest) GetCampaignIdOk() (*string, bool)`

GetCampaignIdOk returns a tuple with the CampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignId

`func (o *CIRunCreateRequest) SetCampaignId(v string)`

SetCampaignId sets CampaignId field to given value.


### GetThresholds

`func (o *CIRunCreateRequest) GetThresholds() CIRunThresholds`

GetThresholds returns the Thresholds field if non-nil, zero value otherwise.

### GetThresholdsOk

`func (o *CIRunCreateRequest) GetThresholdsOk() (*CIRunThresholds, bool)`

GetThresholdsOk returns a tuple with the Thresholds field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetThresholds

`func (o *CIRunCreateRequest) SetThresholds(v CIRunThresholds)`

SetThresholds sets Thresholds field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


