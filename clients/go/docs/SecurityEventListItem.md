# SecurityEventListItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SecurityEventId** | **string** |  | 
**RunId** | **string** |  | 
**AttemptId** | **string** |  | 
**EventIndex** | **int32** |  | 
**Tool** | **string** |  | 
**Zone** | **string** |  | 
**RiskScore** | **float32** |  | 
**Action** | **string** |  | 
**Matches** | Pointer to [**NullableAnyOf**](anyOf&lt;&gt;.md) |  | [optional] 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewSecurityEventListItem

`func NewSecurityEventListItem(securityEventId string, runId string, attemptId string, eventIndex int32, tool string, zone string, riskScore float32, action string, createdAt time.Time, ) *SecurityEventListItem`

NewSecurityEventListItem instantiates a new SecurityEventListItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewSecurityEventListItemWithDefaults

`func NewSecurityEventListItemWithDefaults() *SecurityEventListItem`

NewSecurityEventListItemWithDefaults instantiates a new SecurityEventListItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSecurityEventId

`func (o *SecurityEventListItem) GetSecurityEventId() string`

GetSecurityEventId returns the SecurityEventId field if non-nil, zero value otherwise.

### GetSecurityEventIdOk

`func (o *SecurityEventListItem) GetSecurityEventIdOk() (*string, bool)`

GetSecurityEventIdOk returns a tuple with the SecurityEventId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecurityEventId

`func (o *SecurityEventListItem) SetSecurityEventId(v string)`

SetSecurityEventId sets SecurityEventId field to given value.


### GetRunId

`func (o *SecurityEventListItem) GetRunId() string`

GetRunId returns the RunId field if non-nil, zero value otherwise.

### GetRunIdOk

`func (o *SecurityEventListItem) GetRunIdOk() (*string, bool)`

GetRunIdOk returns a tuple with the RunId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRunId

`func (o *SecurityEventListItem) SetRunId(v string)`

SetRunId sets RunId field to given value.


### GetAttemptId

`func (o *SecurityEventListItem) GetAttemptId() string`

GetAttemptId returns the AttemptId field if non-nil, zero value otherwise.

### GetAttemptIdOk

`func (o *SecurityEventListItem) GetAttemptIdOk() (*string, bool)`

GetAttemptIdOk returns a tuple with the AttemptId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttemptId

`func (o *SecurityEventListItem) SetAttemptId(v string)`

SetAttemptId sets AttemptId field to given value.


### GetEventIndex

`func (o *SecurityEventListItem) GetEventIndex() int32`

GetEventIndex returns the EventIndex field if non-nil, zero value otherwise.

### GetEventIndexOk

`func (o *SecurityEventListItem) GetEventIndexOk() (*int32, bool)`

GetEventIndexOk returns a tuple with the EventIndex field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventIndex

`func (o *SecurityEventListItem) SetEventIndex(v int32)`

SetEventIndex sets EventIndex field to given value.


### GetTool

`func (o *SecurityEventListItem) GetTool() string`

GetTool returns the Tool field if non-nil, zero value otherwise.

### GetToolOk

`func (o *SecurityEventListItem) GetToolOk() (*string, bool)`

GetToolOk returns a tuple with the Tool field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTool

`func (o *SecurityEventListItem) SetTool(v string)`

SetTool sets Tool field to given value.


### GetZone

`func (o *SecurityEventListItem) GetZone() string`

GetZone returns the Zone field if non-nil, zero value otherwise.

### GetZoneOk

`func (o *SecurityEventListItem) GetZoneOk() (*string, bool)`

GetZoneOk returns a tuple with the Zone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetZone

`func (o *SecurityEventListItem) SetZone(v string)`

SetZone sets Zone field to given value.


### GetRiskScore

`func (o *SecurityEventListItem) GetRiskScore() float32`

GetRiskScore returns the RiskScore field if non-nil, zero value otherwise.

### GetRiskScoreOk

`func (o *SecurityEventListItem) GetRiskScoreOk() (*float32, bool)`

GetRiskScoreOk returns a tuple with the RiskScore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRiskScore

`func (o *SecurityEventListItem) SetRiskScore(v float32)`

SetRiskScore sets RiskScore field to given value.


### GetAction

`func (o *SecurityEventListItem) GetAction() string`

GetAction returns the Action field if non-nil, zero value otherwise.

### GetActionOk

`func (o *SecurityEventListItem) GetActionOk() (*string, bool)`

GetActionOk returns a tuple with the Action field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAction

`func (o *SecurityEventListItem) SetAction(v string)`

SetAction sets Action field to given value.


### GetMatches

`func (o *SecurityEventListItem) GetMatches() AnyOf`

GetMatches returns the Matches field if non-nil, zero value otherwise.

### GetMatchesOk

`func (o *SecurityEventListItem) GetMatchesOk() (*AnyOf, bool)`

GetMatchesOk returns a tuple with the Matches field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMatches

`func (o *SecurityEventListItem) SetMatches(v AnyOf)`

SetMatches sets Matches field to given value.

### HasMatches

`func (o *SecurityEventListItem) HasMatches() bool`

HasMatches returns a boolean if a field has been set.

### SetMatchesNil

`func (o *SecurityEventListItem) SetMatchesNil(b bool)`

 SetMatchesNil sets the value for Matches to be an explicit nil

### UnsetMatches
`func (o *SecurityEventListItem) UnsetMatches()`

UnsetMatches ensures that no value is present for Matches, not even an explicit nil
### GetCreatedAt

`func (o *SecurityEventListItem) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *SecurityEventListItem) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *SecurityEventListItem) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


