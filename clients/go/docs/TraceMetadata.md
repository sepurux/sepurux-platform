# TraceMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TraceId** | **string** |  | 
**Source** | **string** |  | 
**TraceVersion** | **string** |  | 
**SdkMeta** | Pointer to **NullableString** |  | [optional] 
**ValidationStatus** | **string** |  | 
**ValidationErrors** | Pointer to **[]map[string]string** |  | [optional] 
**NormalizedSummary** | Pointer to **map[string]interface{}** |  | [optional] 
**S3Key** | **string** |  | 
**Payload** | Pointer to [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewTraceMetadata

`func NewTraceMetadata(traceId string, source string, traceVersion string, validationStatus string, s3Key string, createdAt time.Time, ) *TraceMetadata`

NewTraceMetadata instantiates a new TraceMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewTraceMetadataWithDefaults

`func NewTraceMetadataWithDefaults() *TraceMetadata`

NewTraceMetadataWithDefaults instantiates a new TraceMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTraceId

`func (o *TraceMetadata) GetTraceId() string`

GetTraceId returns the TraceId field if non-nil, zero value otherwise.

### GetTraceIdOk

`func (o *TraceMetadata) GetTraceIdOk() (*string, bool)`

GetTraceIdOk returns a tuple with the TraceId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceId

`func (o *TraceMetadata) SetTraceId(v string)`

SetTraceId sets TraceId field to given value.


### GetSource

`func (o *TraceMetadata) GetSource() string`

GetSource returns the Source field if non-nil, zero value otherwise.

### GetSourceOk

`func (o *TraceMetadata) GetSourceOk() (*string, bool)`

GetSourceOk returns a tuple with the Source field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSource

`func (o *TraceMetadata) SetSource(v string)`

SetSource sets Source field to given value.


### GetTraceVersion

`func (o *TraceMetadata) GetTraceVersion() string`

GetTraceVersion returns the TraceVersion field if non-nil, zero value otherwise.

### GetTraceVersionOk

`func (o *TraceMetadata) GetTraceVersionOk() (*string, bool)`

GetTraceVersionOk returns a tuple with the TraceVersion field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTraceVersion

`func (o *TraceMetadata) SetTraceVersion(v string)`

SetTraceVersion sets TraceVersion field to given value.


### GetSdkMeta

`func (o *TraceMetadata) GetSdkMeta() string`

GetSdkMeta returns the SdkMeta field if non-nil, zero value otherwise.

### GetSdkMetaOk

`func (o *TraceMetadata) GetSdkMetaOk() (*string, bool)`

GetSdkMetaOk returns a tuple with the SdkMeta field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSdkMeta

`func (o *TraceMetadata) SetSdkMeta(v string)`

SetSdkMeta sets SdkMeta field to given value.

### HasSdkMeta

`func (o *TraceMetadata) HasSdkMeta() bool`

HasSdkMeta returns a boolean if a field has been set.

### SetSdkMetaNil

`func (o *TraceMetadata) SetSdkMetaNil(b bool)`

 SetSdkMetaNil sets the value for SdkMeta to be an explicit nil

### UnsetSdkMeta
`func (o *TraceMetadata) UnsetSdkMeta()`

UnsetSdkMeta ensures that no value is present for SdkMeta, not even an explicit nil
### GetValidationStatus

`func (o *TraceMetadata) GetValidationStatus() string`

GetValidationStatus returns the ValidationStatus field if non-nil, zero value otherwise.

### GetValidationStatusOk

`func (o *TraceMetadata) GetValidationStatusOk() (*string, bool)`

GetValidationStatusOk returns a tuple with the ValidationStatus field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetValidationStatus

`func (o *TraceMetadata) SetValidationStatus(v string)`

SetValidationStatus sets ValidationStatus field to given value.


### GetValidationErrors

`func (o *TraceMetadata) GetValidationErrors() []map[string]string`

GetValidationErrors returns the ValidationErrors field if non-nil, zero value otherwise.

### GetValidationErrorsOk

`func (o *TraceMetadata) GetValidationErrorsOk() (*[]map[string]string, bool)`

GetValidationErrorsOk returns a tuple with the ValidationErrors field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetValidationErrors

`func (o *TraceMetadata) SetValidationErrors(v []map[string]string)`

SetValidationErrors sets ValidationErrors field to given value.

### HasValidationErrors

`func (o *TraceMetadata) HasValidationErrors() bool`

HasValidationErrors returns a boolean if a field has been set.

### SetValidationErrorsNil

`func (o *TraceMetadata) SetValidationErrorsNil(b bool)`

 SetValidationErrorsNil sets the value for ValidationErrors to be an explicit nil

### UnsetValidationErrors
`func (o *TraceMetadata) UnsetValidationErrors()`

UnsetValidationErrors ensures that no value is present for ValidationErrors, not even an explicit nil
### GetNormalizedSummary

`func (o *TraceMetadata) GetNormalizedSummary() map[string]interface{}`

GetNormalizedSummary returns the NormalizedSummary field if non-nil, zero value otherwise.

### GetNormalizedSummaryOk

`func (o *TraceMetadata) GetNormalizedSummaryOk() (*map[string]interface{}, bool)`

GetNormalizedSummaryOk returns a tuple with the NormalizedSummary field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetNormalizedSummary

`func (o *TraceMetadata) SetNormalizedSummary(v map[string]interface{})`

SetNormalizedSummary sets NormalizedSummary field to given value.

### HasNormalizedSummary

`func (o *TraceMetadata) HasNormalizedSummary() bool`

HasNormalizedSummary returns a boolean if a field has been set.

### SetNormalizedSummaryNil

`func (o *TraceMetadata) SetNormalizedSummaryNil(b bool)`

 SetNormalizedSummaryNil sets the value for NormalizedSummary to be an explicit nil

### UnsetNormalizedSummary
`func (o *TraceMetadata) UnsetNormalizedSummary()`

UnsetNormalizedSummary ensures that no value is present for NormalizedSummary, not even an explicit nil
### GetS3Key

`func (o *TraceMetadata) GetS3Key() string`

GetS3Key returns the S3Key field if non-nil, zero value otherwise.

### GetS3KeyOk

`func (o *TraceMetadata) GetS3KeyOk() (*string, bool)`

GetS3KeyOk returns a tuple with the S3Key field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetS3Key

`func (o *TraceMetadata) SetS3Key(v string)`

SetS3Key sets S3Key field to given value.


### GetPayload

`func (o *TraceMetadata) GetPayload() AnyOf`

GetPayload returns the Payload field if non-nil, zero value otherwise.

### GetPayloadOk

`func (o *TraceMetadata) GetPayloadOk() (*AnyOf, bool)`

GetPayloadOk returns a tuple with the Payload field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayload

`func (o *TraceMetadata) SetPayload(v AnyOf)`

SetPayload sets Payload field to given value.

### HasPayload

`func (o *TraceMetadata) HasPayload() bool`

HasPayload returns a boolean if a field has been set.

### SetPayloadNil

`func (o *TraceMetadata) SetPayloadNil(b bool)`

 SetPayloadNil sets the value for Payload to be an explicit nil

### UnsetPayload
`func (o *TraceMetadata) UnsetPayload()`

UnsetPayload ensures that no value is present for Payload, not even an explicit nil
### GetCreatedAt

`func (o *TraceMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *TraceMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *TraceMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


