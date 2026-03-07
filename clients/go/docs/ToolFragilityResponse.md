# ToolFragilityResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**WindowDays** | **int32** |  | 
**GeneratedAt** | **time.Time** |  | 
**AttemptsDefinition** | **string** |  | 
**Tools** | [**[]ToolFragilityItem**](ToolFragilityItem.md) |  | 

## Methods

### NewToolFragilityResponse

`func NewToolFragilityResponse(windowDays int32, generatedAt time.Time, attemptsDefinition string, tools []ToolFragilityItem, ) *ToolFragilityResponse`

NewToolFragilityResponse instantiates a new ToolFragilityResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewToolFragilityResponseWithDefaults

`func NewToolFragilityResponseWithDefaults() *ToolFragilityResponse`

NewToolFragilityResponseWithDefaults instantiates a new ToolFragilityResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetWindowDays

`func (o *ToolFragilityResponse) GetWindowDays() int32`

GetWindowDays returns the WindowDays field if non-nil, zero value otherwise.

### GetWindowDaysOk

`func (o *ToolFragilityResponse) GetWindowDaysOk() (*int32, bool)`

GetWindowDaysOk returns a tuple with the WindowDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWindowDays

`func (o *ToolFragilityResponse) SetWindowDays(v int32)`

SetWindowDays sets WindowDays field to given value.


### GetGeneratedAt

`func (o *ToolFragilityResponse) GetGeneratedAt() time.Time`

GetGeneratedAt returns the GeneratedAt field if non-nil, zero value otherwise.

### GetGeneratedAtOk

`func (o *ToolFragilityResponse) GetGeneratedAtOk() (*time.Time, bool)`

GetGeneratedAtOk returns a tuple with the GeneratedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGeneratedAt

`func (o *ToolFragilityResponse) SetGeneratedAt(v time.Time)`

SetGeneratedAt sets GeneratedAt field to given value.


### GetAttemptsDefinition

`func (o *ToolFragilityResponse) GetAttemptsDefinition() string`

GetAttemptsDefinition returns the AttemptsDefinition field if non-nil, zero value otherwise.

### GetAttemptsDefinitionOk

`func (o *ToolFragilityResponse) GetAttemptsDefinitionOk() (*string, bool)`

GetAttemptsDefinitionOk returns a tuple with the AttemptsDefinition field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttemptsDefinition

`func (o *ToolFragilityResponse) SetAttemptsDefinition(v string)`

SetAttemptsDefinition sets AttemptsDefinition field to given value.


### GetTools

`func (o *ToolFragilityResponse) GetTools() []ToolFragilityItem`

GetTools returns the Tools field if non-nil, zero value otherwise.

### GetToolsOk

`func (o *ToolFragilityResponse) GetToolsOk() (*[]ToolFragilityItem, bool)`

GetToolsOk returns a tuple with the Tools field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTools

`func (o *ToolFragilityResponse) SetTools(v []ToolFragilityItem)`

SetTools sets Tools field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


