# CampaignReliabilityResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ReliabilityScore** | **float32** |  | 
**Status** | **string** |  | 
**ClassifiedFailures** | Pointer to **int32** |  | [optional] [default to 0]
**FailureBreakdown** | Pointer to [**[]CampaignFailureBreakdownItem**](CampaignFailureBreakdownItem.md) |  | [optional] 

## Methods

### NewCampaignReliabilityResponse

`func NewCampaignReliabilityResponse(reliabilityScore float32, status string, ) *CampaignReliabilityResponse`

NewCampaignReliabilityResponse instantiates a new CampaignReliabilityResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCampaignReliabilityResponseWithDefaults

`func NewCampaignReliabilityResponseWithDefaults() *CampaignReliabilityResponse`

NewCampaignReliabilityResponseWithDefaults instantiates a new CampaignReliabilityResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetReliabilityScore

`func (o *CampaignReliabilityResponse) GetReliabilityScore() float32`

GetReliabilityScore returns the ReliabilityScore field if non-nil, zero value otherwise.

### GetReliabilityScoreOk

`func (o *CampaignReliabilityResponse) GetReliabilityScoreOk() (*float32, bool)`

GetReliabilityScoreOk returns a tuple with the ReliabilityScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReliabilityScore

`func (o *CampaignReliabilityResponse) SetReliabilityScore(v float32)`

SetReliabilityScore sets ReliabilityScore field to given value.


### GetStatus

`func (o *CampaignReliabilityResponse) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *CampaignReliabilityResponse) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *CampaignReliabilityResponse) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetClassifiedFailures

`func (o *CampaignReliabilityResponse) GetClassifiedFailures() int32`

GetClassifiedFailures returns the ClassifiedFailures field if non-nil, zero value otherwise.

### GetClassifiedFailuresOk

`func (o *CampaignReliabilityResponse) GetClassifiedFailuresOk() (*int32, bool)`

GetClassifiedFailuresOk returns a tuple with the ClassifiedFailures field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetClassifiedFailures

`func (o *CampaignReliabilityResponse) SetClassifiedFailures(v int32)`

SetClassifiedFailures sets ClassifiedFailures field to given value.

### HasClassifiedFailures

`func (o *CampaignReliabilityResponse) HasClassifiedFailures() bool`

HasClassifiedFailures returns a boolean if a field has been set.

### GetFailureBreakdown

`func (o *CampaignReliabilityResponse) GetFailureBreakdown() []CampaignFailureBreakdownItem`

GetFailureBreakdown returns the FailureBreakdown field if non-nil, zero value otherwise.

### GetFailureBreakdownOk

`func (o *CampaignReliabilityResponse) GetFailureBreakdownOk() (*[]CampaignFailureBreakdownItem, bool)`

GetFailureBreakdownOk returns a tuple with the FailureBreakdown field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureBreakdown

`func (o *CampaignReliabilityResponse) SetFailureBreakdown(v []CampaignFailureBreakdownItem)`

SetFailureBreakdown sets FailureBreakdown field to given value.

### HasFailureBreakdown

`func (o *CampaignReliabilityResponse) HasFailureBreakdown() bool`

HasFailureBreakdown returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


