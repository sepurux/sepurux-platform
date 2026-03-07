# AuditEventListItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**AuditEventId** | **string** |  | 
**ProjectId** | **string** |  | 
**EventType** | **string** |  | 
**Actor** | Pointer to **NullableString** |  | [optional] 
**Metadata** | **interface{}** |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewAuditEventListItem

`func NewAuditEventListItem(auditEventId string, projectId string, eventType string, metadata interface{}, createdAt time.Time, ) *AuditEventListItem`

NewAuditEventListItem instantiates a new AuditEventListItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAuditEventListItemWithDefaults

`func NewAuditEventListItemWithDefaults() *AuditEventListItem`

NewAuditEventListItemWithDefaults instantiates a new AuditEventListItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetAuditEventId

`func (o *AuditEventListItem) GetAuditEventId() string`

GetAuditEventId returns the AuditEventId field if non-nil, zero value otherwise.

### GetAuditEventIdOk

`func (o *AuditEventListItem) GetAuditEventIdOk() (*string, bool)`

GetAuditEventIdOk returns a tuple with the AuditEventId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditEventId

`func (o *AuditEventListItem) SetAuditEventId(v string)`

SetAuditEventId sets AuditEventId field to given value.


### GetProjectId

`func (o *AuditEventListItem) GetProjectId() string`

GetProjectId returns the ProjectId field if non-nil, zero value otherwise.

### GetProjectIdOk

`func (o *AuditEventListItem) GetProjectIdOk() (*string, bool)`

GetProjectIdOk returns a tuple with the ProjectId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProjectId

`func (o *AuditEventListItem) SetProjectId(v string)`

SetProjectId sets ProjectId field to given value.


### GetEventType

`func (o *AuditEventListItem) GetEventType() string`

GetEventType returns the EventType field if non-nil, zero value otherwise.

### GetEventTypeOk

`func (o *AuditEventListItem) GetEventTypeOk() (*string, bool)`

GetEventTypeOk returns a tuple with the EventType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventType

`func (o *AuditEventListItem) SetEventType(v string)`

SetEventType sets EventType field to given value.


### GetActor

`func (o *AuditEventListItem) GetActor() string`

GetActor returns the Actor field if non-nil, zero value otherwise.

### GetActorOk

`func (o *AuditEventListItem) GetActorOk() (*string, bool)`

GetActorOk returns a tuple with the Actor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetActor

`func (o *AuditEventListItem) SetActor(v string)`

SetActor sets Actor field to given value.

### HasActor

`func (o *AuditEventListItem) HasActor() bool`

HasActor returns a boolean if a field has been set.

### SetActorNil

`func (o *AuditEventListItem) SetActorNil(b bool)`

 SetActorNil sets the value for Actor to be an explicit nil

### UnsetActor
`func (o *AuditEventListItem) UnsetActor()`

UnsetActor ensures that no value is present for Actor, not even an explicit nil
### GetMetadata

`func (o *AuditEventListItem) GetMetadata() interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *AuditEventListItem) GetMetadataOk() (*interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *AuditEventListItem) SetMetadata(v interface{})`

SetMetadata sets Metadata field to given value.


### SetMetadataNil

`func (o *AuditEventListItem) SetMetadataNil(b bool)`

 SetMetadataNil sets the value for Metadata to be an explicit nil

### UnsetMetadata
`func (o *AuditEventListItem) UnsetMetadata()`

UnsetMetadata ensures that no value is present for Metadata, not even an explicit nil
### GetCreatedAt

`func (o *AuditEventListItem) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *AuditEventListItem) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *AuditEventListItem) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


