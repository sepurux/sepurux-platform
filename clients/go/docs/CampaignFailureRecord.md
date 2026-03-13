# CampaignFailureRecord

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**FailureId** | **string** |  | 
**RunId** | **string** |  | 
**CampaignId** | **string** |  | 
**TraceId** | **string** |  | 
**Mutation** | **string** |  | 
**Type** | **string** |  | 
**Severity** | **string** |  | 
**Description** | **string** |  | 
**Metadata** | Pointer to **map[string]interface{}** |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewCampaignFailureRecord

`func NewCampaignFailureRecord(failureId string, runId string, campaignId string, traceId string, mutation string, type_ string, severity string, description string, createdAt time.Time, ) *CampaignFailureRecord`

NewCampaignFailureRecord instantiates a new CampaignFailureRecord object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCampaignFailureRecordWithDefaults

`func NewCampaignFailureRecordWithDefaults() *CampaignFailureRecord`

NewCampaignFailureRecordWithDefaults instantiates a new CampaignFailureRecord object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetFailureId

`func (o *CampaignFailureRecord) GetFailureId() string`

GetFailureId returns the FailureId field if non-nil, zero value otherwise.

### GetFailureIdOk

`func (o *CampaignFailureRecord) GetFailureIdOk() (*string, bool)`

GetFailureIdOk returns a tuple with the FailureId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetFailureId

`func (o *CampaignFailureRecord) SetFailureId(v string)`

SetFailureId sets FailureId field to given value.


### GetRunId

`func (o *CampaignFailureRecord) GetRunId() string`

GetRunId returns the RunId field if non-nil, zero value otherwise.

### GetRunIdOk

`func (o *CampaignFailureRecord) GetRunIdOk() (*string, bool)`

GetRunIdOk returns a tuple with the RunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRunId

`func (o *CampaignFailureRecord) SetRunId(v string)`

SetRunId sets RunId field to given value.


### GetCampaignId

`func (o *CampaignFailureRecord) GetCampaignId() string`

GetCampaignId returns the CampaignId field if non-nil, zero value otherwise.

### GetCampaignIdOk

`func (o *CampaignFailureRecord) GetCampaignIdOk() (*string, bool)`

GetCampaignIdOk returns a tuple with the CampaignId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCampaignId

`func (o *CampaignFailureRecord) SetCampaignId(v string)`

SetCampaignId sets CampaignId field to given value.


### GetTraceId

`func (o *CampaignFailureRecord) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *CampaignFailureRecord) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *CampaignFailureRecord) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.


### GetMutation

`func (o *CampaignFailureRecord) GetMutation() string`

GetMutation returns the Mutation field if non-nil, zero value otherwise.

### GetMutationOk

`func (o *CampaignFailureRecord) GetMutationOk() (*string, bool)`

GetMutationOk returns a tuple with the Mutation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMutation

`func (o *CampaignFailureRecord) SetMutation(v string)`

SetMutation sets Mutation field to given value.


### GetType

`func (o *CampaignFailureRecord) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CampaignFailureRecord) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CampaignFailureRecord) SetType(v string)`

SetType sets Type field to given value.


### GetSeverity

`func (o *CampaignFailureRecord) GetSeverity() string`

GetSeverity returns the Severity field if non-nil, zero value otherwise.

### GetSeverityOk

`func (o *CampaignFailureRecord) GetSeverityOk() (*string, bool)`

GetSeverityOk returns a tuple with the Severity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeverity

`func (o *CampaignFailureRecord) SetSeverity(v string)`

SetSeverity sets Severity field to given value.


### GetDescription

`func (o *CampaignFailureRecord) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *CampaignFailureRecord) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *CampaignFailureRecord) SetDescription(v string)`

SetDescription sets Description field to given value.


### GetMetadata

`func (o *CampaignFailureRecord) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *CampaignFailureRecord) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *CampaignFailureRecord) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *CampaignFailureRecord) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### SetMetadataNil

`func (o *CampaignFailureRecord) SetMetadataNil(b bool)`

 SetMetadataNil sets the value for Metadata to be an explicit nil

### UnsetMetadata
`func (o *CampaignFailureRecord) UnsetMetadata()`

UnsetMetadata ensures that no value is present for Metadata, not even an explicit nil
### GetCreatedAt

`func (o *CampaignFailureRecord) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CampaignFailureRecord) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CampaignFailureRecord) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


