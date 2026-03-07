# ToolRegistryCreateRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** |  | 
**Zone** | Pointer to **string** |  | [optional] [default to "untrusted"]

## Methods

### NewToolRegistryCreateRequest

`func NewToolRegistryCreateRequest(name string, ) *ToolRegistryCreateRequest`

NewToolRegistryCreateRequest instantiates a new ToolRegistryCreateRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewToolRegistryCreateRequestWithDefaults

`func NewToolRegistryCreateRequestWithDefaults() *ToolRegistryCreateRequest`

NewToolRegistryCreateRequestWithDefaults instantiates a new ToolRegistryCreateRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *ToolRegistryCreateRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *ToolRegistryCreateRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *ToolRegistryCreateRequest) SetName(v string)`

SetName sets Name field to given value.


### GetZone

`func (o *ToolRegistryCreateRequest) GetZone() string`

GetZone returns the Zone field if non-nil, zero value otherwise.

### GetZoneOk

`func (o *ToolRegistryCreateRequest) GetZoneOk() (*string, bool)`

GetZoneOk returns a tuple with the Zone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetZone

`func (o *ToolRegistryCreateRequest) SetZone(v string)`

SetZone sets Zone field to given value.

### HasZone

`func (o *ToolRegistryCreateRequest) HasZone() bool`

HasZone returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


