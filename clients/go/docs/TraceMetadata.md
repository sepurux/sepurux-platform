# TraceMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TraceId** | **string** |  | 
**Source** | **string** |  | 
**S3Key** | **string** |  | 
**Payload** | Pointer to [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewTraceMetadata

`func NewTraceMetadata(traceId string, source string, s3Key string, createdAt time.Time, ) *TraceMetadata`

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


