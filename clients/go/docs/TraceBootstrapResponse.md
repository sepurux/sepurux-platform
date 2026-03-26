# TraceBootstrapResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TraceId** | **string** |  | 
**ToolsDiscovered** | Pointer to **[]string** |  | [optional] 
**ToolZonesCreated** | Pointer to **int32** |  | [optional] [default to 0]
**ToolZonesUpdated** | Pointer to **int32** |  | [optional] [default to 0]
**PolicyPackId** | Pointer to **NullableString** |  | [optional] 
**PolicyPackName** | Pointer to **NullableString** |  | [optional] 
**PolicyPackCreated** | Pointer to **bool** |  | [optional] [default to false]
**Campaigns** | Pointer to [**[]TraceBootstrapCampaign**](TraceBootstrapCampaign.md) |  | [optional] 

## Methods

### NewTraceBootstrapResponse

`func NewTraceBootstrapResponse(traceId string, ) *TraceBootstrapResponse`

NewTraceBootstrapResponse instantiates a new TraceBootstrapResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTraceBootstrapResponseWithDefaults

`func NewTraceBootstrapResponseWithDefaults() *TraceBootstrapResponse`

NewTraceBootstrapResponseWithDefaults instantiates a new TraceBootstrapResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTraceId

`func (o *TraceBootstrapResponse) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *TraceBootstrapResponse) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *TraceBootstrapResponse) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.


### GetToolsDiscovered

`func (o *TraceBootstrapResponse) GetToolsDiscovered() []string`

GetToolsDiscovered returns the ToolsDiscovered field if non-nil, zero value otherwise.

### GetToolsDiscoveredOk

`func (o *TraceBootstrapResponse) GetToolsDiscoveredOk() (*[]string, bool)`

GetToolsDiscoveredOk returns a tuple with the ToolsDiscovered field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToolsDiscovered

`func (o *TraceBootstrapResponse) SetToolsDiscovered(v []string)`

SetToolsDiscovered sets ToolsDiscovered field to given value.

### HasToolsDiscovered

`func (o *TraceBootstrapResponse) HasToolsDiscovered() bool`

HasToolsDiscovered returns a boolean if a field has been set.

### GetToolZonesCreated

`func (o *TraceBootstrapResponse) GetToolZonesCreated() int32`

GetToolZonesCreated returns the ToolZonesCreated field if non-nil, zero value otherwise.

### GetToolZonesCreatedOk

`func (o *TraceBootstrapResponse) GetToolZonesCreatedOk() (*int32, bool)`

GetToolZonesCreatedOk returns a tuple with the ToolZonesCreated field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToolZonesCreated

`func (o *TraceBootstrapResponse) SetToolZonesCreated(v int32)`

SetToolZonesCreated sets ToolZonesCreated field to given value.

### HasToolZonesCreated

`func (o *TraceBootstrapResponse) HasToolZonesCreated() bool`

HasToolZonesCreated returns a boolean if a field has been set.

### GetToolZonesUpdated

`func (o *TraceBootstrapResponse) GetToolZonesUpdated() int32`

GetToolZonesUpdated returns the ToolZonesUpdated field if non-nil, zero value otherwise.

### GetToolZonesUpdatedOk

`func (o *TraceBootstrapResponse) GetToolZonesUpdatedOk() (*int32, bool)`

GetToolZonesUpdatedOk returns a tuple with the ToolZonesUpdated field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetToolZonesUpdated

`func (o *TraceBootstrapResponse) SetToolZonesUpdated(v int32)`

SetToolZonesUpdated sets ToolZonesUpdated field to given value.

### HasToolZonesUpdated

`func (o *TraceBootstrapResponse) HasToolZonesUpdated() bool`

HasToolZonesUpdated returns a boolean if a field has been set.

### GetPolicyPackId

`func (o *TraceBootstrapResponse) GetPolicyPackId() string`

GetPolicyPackId returns the PolicyPackId field if non-nil, zero value otherwise.

### GetPolicyPackIdOk

`func (o *TraceBootstrapResponse) GetPolicyPackIdOk() (*string, bool)`

GetPolicyPackIdOk returns a tuple with the PolicyPackId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyPackId

`func (o *TraceBootstrapResponse) SetPolicyPackId(v string)`

SetPolicyPackId sets PolicyPackId field to given value.

### HasPolicyPackId

`func (o *TraceBootstrapResponse) HasPolicyPackId() bool`

HasPolicyPackId returns a boolean if a field has been set.

### SetPolicyPackIdNil

`func (o *TraceBootstrapResponse) SetPolicyPackIdNil(b bool)`

 SetPolicyPackIdNil sets the value for PolicyPackId to be an explicit nil

### UnsetPolicyPackId
`func (o *TraceBootstrapResponse) UnsetPolicyPackId()`

UnsetPolicyPackId ensures that no value is present for PolicyPackId, not even an explicit nil
### GetPolicyPackName

`func (o *TraceBootstrapResponse) GetPolicyPackName() string`

GetPolicyPackName returns the PolicyPackName field if non-nil, zero value otherwise.

### GetPolicyPackNameOk

`func (o *TraceBootstrapResponse) GetPolicyPackNameOk() (*string, bool)`

GetPolicyPackNameOk returns a tuple with the PolicyPackName field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyPackName

`func (o *TraceBootstrapResponse) SetPolicyPackName(v string)`

SetPolicyPackName sets PolicyPackName field to given value.

### HasPolicyPackName

`func (o *TraceBootstrapResponse) HasPolicyPackName() bool`

HasPolicyPackName returns a boolean if a field has been set.

### SetPolicyPackNameNil

`func (o *TraceBootstrapResponse) SetPolicyPackNameNil(b bool)`

 SetPolicyPackNameNil sets the value for PolicyPackName to be an explicit nil

### UnsetPolicyPackName
`func (o *TraceBootstrapResponse) UnsetPolicyPackName()`

UnsetPolicyPackName ensures that no value is present for PolicyPackName, not even an explicit nil
### GetPolicyPackCreated

`func (o *TraceBootstrapResponse) GetPolicyPackCreated() bool`

GetPolicyPackCreated returns the PolicyPackCreated field if non-nil, zero value otherwise.

### GetPolicyPackCreatedOk

`func (o *TraceBootstrapResponse) GetPolicyPackCreatedOk() (*bool, bool)`

GetPolicyPackCreatedOk returns a tuple with the PolicyPackCreated field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyPackCreated

`func (o *TraceBootstrapResponse) SetPolicyPackCreated(v bool)`

SetPolicyPackCreated sets PolicyPackCreated field to given value.

### HasPolicyPackCreated

`func (o *TraceBootstrapResponse) HasPolicyPackCreated() bool`

HasPolicyPackCreated returns a boolean if a field has been set.

### GetCampaigns

`func (o *TraceBootstrapResponse) GetCampaigns() []TraceBootstrapCampaign`

GetCampaigns returns the Campaigns field if non-nil, zero value otherwise.

### GetCampaignsOk

`func (o *TraceBootstrapResponse) GetCampaignsOk() (*[]TraceBootstrapCampaign, bool)`

GetCampaignsOk returns a tuple with the Campaigns field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaigns

`func (o *TraceBootstrapResponse) SetCampaigns(v []TraceBootstrapCampaign)`

SetCampaigns sets Campaigns field to given value.

### HasCampaigns

`func (o *TraceBootstrapResponse) HasCampaigns() bool`

HasCampaigns returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


