# PolicyEventListItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**PolicyEventId** | **string** |  | 
**RunId** | **string** |  | 
**AttemptId** | **NullableString** |  | 
**EventIndex** | **NullableInt32** |  | 
**Tool** | **string** |  | 
**Action** | **string** |  | 
**Decision** | **string** |  | 
**Reason** | **NullableString** |  | 
**Input** | Pointer to [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewPolicyEventListItem

`func NewPolicyEventListItem(policyEventId string, runId string, attemptId NullableString, eventIndex NullableInt32, tool string, action string, decision string, reason NullableString, createdAt time.Time, ) *PolicyEventListItem`

NewPolicyEventListItem instantiates a new PolicyEventListItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewPolicyEventListItemWithDefaults

`func NewPolicyEventListItemWithDefaults() *PolicyEventListItem`

NewPolicyEventListItemWithDefaults instantiates a new PolicyEventListItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPolicyEventId

`func (o *PolicyEventListItem) GetPolicyEventId() string`

GetPolicyEventId returns the PolicyEventId field if non-nil, zero value otherwise.

### GetPolicyEventIdOk

`func (o *PolicyEventListItem) GetPolicyEventIdOk() (*string, bool)`

GetPolicyEventIdOk returns a tuple with the PolicyEventId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyEventId

`func (o *PolicyEventListItem) SetPolicyEventId(v string)`

SetPolicyEventId sets PolicyEventId field to given value.


### GetRunId

`func (o *PolicyEventListItem) GetRunId() string`

GetRunId returns the RunId field if non-nil, zero value otherwise.

### GetRunIdOk

`func (o *PolicyEventListItem) GetRunIdOk() (*string, bool)`

GetRunIdOk returns a tuple with the RunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRunId

`func (o *PolicyEventListItem) SetRunId(v string)`

SetRunId sets RunId field to given value.


### GetAttemptId

`func (o *PolicyEventListItem) GetAttemptId() string`

GetAttemptId returns the AttemptId field if non-nil, zero value otherwise.

### GetAttemptIdOk

`func (o *PolicyEventListItem) GetAttemptIdOk() (*string, bool)`

GetAttemptIdOk returns a tuple with the AttemptId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttemptId

`func (o *PolicyEventListItem) SetAttemptId(v string)`

SetAttemptId sets AttemptId field to given value.


### SetAttemptIdNil

`func (o *PolicyEventListItem) SetAttemptIdNil(b bool)`

 SetAttemptIdNil sets the value for AttemptId to be an explicit nil

### UnsetAttemptId
`func (o *PolicyEventListItem) UnsetAttemptId()`

UnsetAttemptId ensures that no value is present for AttemptId, not even an explicit nil
### GetEventIndex

`func (o *PolicyEventListItem) GetEventIndex() int32`

GetEventIndex returns the EventIndex field if non-nil, zero value otherwise.

### GetEventIndexOk

`func (o *PolicyEventListItem) GetEventIndexOk() (*int32, bool)`

GetEventIndexOk returns a tuple with the EventIndex field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventIndex

`func (o *PolicyEventListItem) SetEventIndex(v int32)`

SetEventIndex sets EventIndex field to given value.


### SetEventIndexNil

`func (o *PolicyEventListItem) SetEventIndexNil(b bool)`

 SetEventIndexNil sets the value for EventIndex to be an explicit nil

### UnsetEventIndex
`func (o *PolicyEventListItem) UnsetEventIndex()`

UnsetEventIndex ensures that no value is present for EventIndex, not even an explicit nil
### GetTool

`func (o *PolicyEventListItem) GetTool() string`

GetTool returns the Tool field if non-nil, zero value otherwise.

### GetToolOk

`func (o *PolicyEventListItem) GetToolOk() (*string, bool)`

GetToolOk returns a tuple with the Tool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTool

`func (o *PolicyEventListItem) SetTool(v string)`

SetTool sets Tool field to given value.


### GetAction

`func (o *PolicyEventListItem) GetAction() string`

GetAction returns the Action field if non-nil, zero value otherwise.

### GetActionOk

`func (o *PolicyEventListItem) GetActionOk() (*string, bool)`

GetActionOk returns a tuple with the Action field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAction

`func (o *PolicyEventListItem) SetAction(v string)`

SetAction sets Action field to given value.


### GetDecision

`func (o *PolicyEventListItem) GetDecision() string`

GetDecision returns the Decision field if non-nil, zero value otherwise.

### GetDecisionOk

`func (o *PolicyEventListItem) GetDecisionOk() (*string, bool)`

GetDecisionOk returns a tuple with the Decision field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDecision

`func (o *PolicyEventListItem) SetDecision(v string)`

SetDecision sets Decision field to given value.


### GetReason

`func (o *PolicyEventListItem) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *PolicyEventListItem) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *PolicyEventListItem) SetReason(v string)`

SetReason sets Reason field to given value.


### SetReasonNil

`func (o *PolicyEventListItem) SetReasonNil(b bool)`

 SetReasonNil sets the value for Reason to be an explicit nil

### UnsetReason
`func (o *PolicyEventListItem) UnsetReason()`

UnsetReason ensures that no value is present for Reason, not even an explicit nil
### GetInput

`func (o *PolicyEventListItem) GetInput() AnyOf`

GetInput returns the Input field if non-nil, zero value otherwise.

### GetInputOk

`func (o *PolicyEventListItem) GetInputOk() (*AnyOf, bool)`

GetInputOk returns a tuple with the Input field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetInput

`func (o *PolicyEventListItem) SetInput(v AnyOf)`

SetInput sets Input field to given value.

### HasInput

`func (o *PolicyEventListItem) HasInput() bool`

HasInput returns a boolean if a field has been set.

### SetInputNil

`func (o *PolicyEventListItem) SetInputNil(b bool)`

 SetInputNil sets the value for Input to be an explicit nil

### UnsetInput
`func (o *PolicyEventListItem) UnsetInput()`

UnsetInput ensures that no value is present for Input, not even an explicit nil
### GetCreatedAt

`func (o *PolicyEventListItem) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *PolicyEventListItem) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *PolicyEventListItem) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


