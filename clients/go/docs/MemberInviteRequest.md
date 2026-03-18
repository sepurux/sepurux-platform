# MemberInviteRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Email** | **string** |  | 
**Name** | Pointer to **NullableString** |  | [optional] 
**Role** | Pointer to **string** |  | [optional] [default to "developer"]

## Methods

### NewMemberInviteRequest

`func NewMemberInviteRequest(email string, ) *MemberInviteRequest`

NewMemberInviteRequest instantiates a new MemberInviteRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewMemberInviteRequestWithDefaults

`func NewMemberInviteRequestWithDefaults() *MemberInviteRequest`

NewMemberInviteRequestWithDefaults instantiates a new MemberInviteRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEmail

`func (o *MemberInviteRequest) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *MemberInviteRequest) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *MemberInviteRequest) SetEmail(v string)`

SetEmail sets Email field to given value.


### GetName

`func (o *MemberInviteRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *MemberInviteRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *MemberInviteRequest) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *MemberInviteRequest) HasName() bool`

HasName returns a boolean if a field has been set.

### SetNameNil

`func (o *MemberInviteRequest) SetNameNil(b bool)`

 SetNameNil sets the value for Name to be an explicit nil

### UnsetName
`func (o *MemberInviteRequest) UnsetName()`

UnsetName ensures that no value is present for Name, not even an explicit nil
### GetRole

`func (o *MemberInviteRequest) GetRole() string`

GetRole returns the Role field if non-nil, zero value otherwise.

### GetRoleOk

`func (o *MemberInviteRequest) GetRoleOk() (*string, bool)`

GetRoleOk returns a tuple with the Role field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRole

`func (o *MemberInviteRequest) SetRole(v string)`

SetRole sets Role field to given value.

### HasRole

`func (o *MemberInviteRequest) HasRole() bool`

HasRole returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


