# UserNotificationInboxResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Items** | [**[]UserNotificationItem**](UserNotificationItem.md) |  | 
**UnreadCount** | **int32** |  | 

## Methods

### NewUserNotificationInboxResponse

`func NewUserNotificationInboxResponse(items []UserNotificationItem, unreadCount int32, ) *UserNotificationInboxResponse`

NewUserNotificationInboxResponse instantiates a new UserNotificationInboxResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewUserNotificationInboxResponseWithDefaults

`func NewUserNotificationInboxResponseWithDefaults() *UserNotificationInboxResponse`

NewUserNotificationInboxResponseWithDefaults instantiates a new UserNotificationInboxResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetItems

`func (o *UserNotificationInboxResponse) GetItems() []UserNotificationItem`

GetItems returns the Items field if non-nil, zero value otherwise.

### GetItemsOk

`func (o *UserNotificationInboxResponse) GetItemsOk() (*[]UserNotificationItem, bool)`

GetItemsOk returns a tuple with the Items field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetItems

`func (o *UserNotificationInboxResponse) SetItems(v []UserNotificationItem)`

SetItems sets Items field to given value.


### GetUnreadCount

`func (o *UserNotificationInboxResponse) GetUnreadCount() int32`

GetUnreadCount returns the UnreadCount field if non-nil, zero value otherwise.

### GetUnreadCountOk

`func (o *UserNotificationInboxResponse) GetUnreadCountOk() (*int32, bool)`

GetUnreadCountOk returns a tuple with the UnreadCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUnreadCount

`func (o *UserNotificationInboxResponse) SetUnreadCount(v int32)`

SetUnreadCount sets UnreadCount field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


