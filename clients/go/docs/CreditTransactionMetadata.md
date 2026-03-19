# CreditTransactionMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**TransactionId** | **string** |  | 
**UserId** | **string** |  | 
**Amount** | **int32** |  | 
**Type** | **string** |  | 
**Reason** | **string** |  | 
**CreatedAt** | **time.Time** |  | 

## Methods

### NewCreditTransactionMetadata

`func NewCreditTransactionMetadata(transactionId string, userId string, amount int32, type_ string, reason string, createdAt time.Time, ) *CreditTransactionMetadata`

NewCreditTransactionMetadata instantiates a new CreditTransactionMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCreditTransactionMetadataWithDefaults

`func NewCreditTransactionMetadataWithDefaults() *CreditTransactionMetadata`

NewCreditTransactionMetadataWithDefaults instantiates a new CreditTransactionMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTransactionId

`func (o *CreditTransactionMetadata) GetTransactionId() string`

GetTransactionId returns the TransactionId field if non-nil, zero value otherwise.

### GetTransactionIdOk

`func (o *CreditTransactionMetadata) GetTransactionIdOk() (*string, bool)`

GetTransactionIdOk returns a tuple with the TransactionId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTransactionId

`func (o *CreditTransactionMetadata) SetTransactionId(v string)`

SetTransactionId sets TransactionId field to given value.


### GetUserId

`func (o *CreditTransactionMetadata) GetUserId() string`

GetUserId returns the UserId field if non-nil, zero value otherwise.

### GetUserIdOk

`func (o *CreditTransactionMetadata) GetUserIdOk() (*string, bool)`

GetUserIdOk returns a tuple with the UserId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUserId

`func (o *CreditTransactionMetadata) SetUserId(v string)`

SetUserId sets UserId field to given value.


### GetAmount

`func (o *CreditTransactionMetadata) GetAmount() int32`

GetAmount returns the Amount field if non-nil, zero value otherwise.

### GetAmountOk

`func (o *CreditTransactionMetadata) GetAmountOk() (*int32, bool)`

GetAmountOk returns a tuple with the Amount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAmount

`func (o *CreditTransactionMetadata) SetAmount(v int32)`

SetAmount sets Amount field to given value.


### GetType

`func (o *CreditTransactionMetadata) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CreditTransactionMetadata) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CreditTransactionMetadata) SetType(v string)`

SetType sets Type field to given value.


### GetReason

`func (o *CreditTransactionMetadata) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *CreditTransactionMetadata) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *CreditTransactionMetadata) SetReason(v string)`

SetReason sets Reason field to given value.


### GetCreatedAt

`func (o *CreditTransactionMetadata) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *CreditTransactionMetadata) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *CreditTransactionMetadata) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


