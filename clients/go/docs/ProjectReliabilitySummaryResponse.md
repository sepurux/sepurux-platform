# ProjectReliabilitySummaryResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ReliabilityScore** | **float32** |  | 
**Status** | **string** |  | 
**CampaignsRun** | **int32** |  | 
**CreditsUsed** | **int32** |  | 
**FailureBreakdown** | Pointer to [**[]CampaignFailureBreakdownItem**](CampaignFailureBreakdownItem.md) |  | [optional] 

## Methods

### NewProjectReliabilitySummaryResponse

`func NewProjectReliabilitySummaryResponse(reliabilityScore float32, status string, campaignsRun int32, creditsUsed int32, ) *ProjectReliabilitySummaryResponse`

NewProjectReliabilitySummaryResponse instantiates a new ProjectReliabilitySummaryResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewProjectReliabilitySummaryResponseWithDefaults

`func NewProjectReliabilitySummaryResponseWithDefaults() *ProjectReliabilitySummaryResponse`

NewProjectReliabilitySummaryResponseWithDefaults instantiates a new ProjectReliabilitySummaryResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetReliabilityScore

`func (o *ProjectReliabilitySummaryResponse) GetReliabilityScore() float32`

GetReliabilityScore returns the ReliabilityScore field if non-nil, zero value otherwise.

### GetReliabilityScoreOk

`func (o *ProjectReliabilitySummaryResponse) GetReliabilityScoreOk() (*float32, bool)`

GetReliabilityScoreOk returns a tuple with the ReliabilityScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReliabilityScore

`func (o *ProjectReliabilitySummaryResponse) SetReliabilityScore(v float32)`

SetReliabilityScore sets ReliabilityScore field to given value.


### GetStatus

`func (o *ProjectReliabilitySummaryResponse) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *ProjectReliabilitySummaryResponse) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *ProjectReliabilitySummaryResponse) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetCampaignsRun

`func (o *ProjectReliabilitySummaryResponse) GetCampaignsRun() int32`

GetCampaignsRun returns the CampaignsRun field if non-nil, zero value otherwise.

### GetCampaignsRunOk

`func (o *ProjectReliabilitySummaryResponse) GetCampaignsRunOk() (*int32, bool)`

GetCampaignsRunOk returns a tuple with the CampaignsRun field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignsRun

`func (o *ProjectReliabilitySummaryResponse) SetCampaignsRun(v int32)`

SetCampaignsRun sets CampaignsRun field to given value.


### GetCreditsUsed

`func (o *ProjectReliabilitySummaryResponse) GetCreditsUsed() int32`

GetCreditsUsed returns the CreditsUsed field if non-nil, zero value otherwise.

### GetCreditsUsedOk

`func (o *ProjectReliabilitySummaryResponse) GetCreditsUsedOk() (*int32, bool)`

GetCreditsUsedOk returns a tuple with the CreditsUsed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreditsUsed

`func (o *ProjectReliabilitySummaryResponse) SetCreditsUsed(v int32)`

SetCreditsUsed sets CreditsUsed field to given value.


### GetFailureBreakdown

`func (o *ProjectReliabilitySummaryResponse) GetFailureBreakdown() []CampaignFailureBreakdownItem`

GetFailureBreakdown returns the FailureBreakdown field if non-nil, zero value otherwise.

### GetFailureBreakdownOk

`func (o *ProjectReliabilitySummaryResponse) GetFailureBreakdownOk() (*[]CampaignFailureBreakdownItem, bool)`

GetFailureBreakdownOk returns a tuple with the FailureBreakdown field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureBreakdown

`func (o *ProjectReliabilitySummaryResponse) SetFailureBreakdown(v []CampaignFailureBreakdownItem)`

SetFailureBreakdown sets FailureBreakdown field to given value.

### HasFailureBreakdown

`func (o *ProjectReliabilitySummaryResponse) HasFailureBreakdown() bool`

HasFailureBreakdown returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


