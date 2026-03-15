# CreditWalletMetadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**WalletId** | **string** |  | 
**Balance** | **int32** |  | 
**MonthlyCredits** | **int32** |  | 
**TopupCredits** | **int32** |  | 
**QueuePriority** | Pointer to **string** |  | [optional] [default to "normal"]
**LowCreditThreshold** | Pointer to **int32** |  | [optional] [default to 50]
**IsLowCredit** | Pointer to **bool** |  | [optional] [default to false]
**UpdatedAt** | **time.Time** |  | 

## Methods

### NewCreditWalletMetadata

`func NewCreditWalletMetadata(walletId string, balance int32, monthlyCredits int32, topupCredits int32, updatedAt time.Time, ) *CreditWalletMetadata`

NewCreditWalletMetadata instantiates a new CreditWalletMetadata object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCreditWalletMetadataWithDefaults

`func NewCreditWalletMetadataWithDefaults() *CreditWalletMetadata`

NewCreditWalletMetadataWithDefaults instantiates a new CreditWalletMetadata object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetWalletId

`func (o *CreditWalletMetadata) GetWalletId() string`

GetWalletId returns the WalletId field if non-nil, zero value otherwise.

### GetWalletIdOk

`func (o *CreditWalletMetadata) GetWalletIdOk() (*string, bool)`

GetWalletIdOk returns a tuple with the WalletId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWalletId

`func (o *CreditWalletMetadata) SetWalletId(v string)`

SetWalletId sets WalletId field to given value.


### GetBalance

`func (o *CreditWalletMetadata) GetBalance() int32`

GetBalance returns the Balance field if non-nil, zero value otherwise.

### GetBalanceOk

`func (o *CreditWalletMetadata) GetBalanceOk() (*int32, bool)`

GetBalanceOk returns a tuple with the Balance field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBalance

`func (o *CreditWalletMetadata) SetBalance(v int32)`

SetBalance sets Balance field to given value.


### GetMonthlyCredits

`func (o *CreditWalletMetadata) GetMonthlyCredits() int32`

GetMonthlyCredits returns the MonthlyCredits field if non-nil, zero value otherwise.

### GetMonthlyCreditsOk

`func (o *CreditWalletMetadata) GetMonthlyCreditsOk() (*int32, bool)`

GetMonthlyCreditsOk returns a tuple with the MonthlyCredits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMonthlyCredits

`func (o *CreditWalletMetadata) SetMonthlyCredits(v int32)`

SetMonthlyCredits sets MonthlyCredits field to given value.


### GetTopupCredits

`func (o *CreditWalletMetadata) GetTopupCredits() int32`

GetTopupCredits returns the TopupCredits field if non-nil, zero value otherwise.

### GetTopupCreditsOk

`func (o *CreditWalletMetadata) GetTopupCreditsOk() (*int32, bool)`

GetTopupCreditsOk returns a tuple with the TopupCredits field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopupCredits

`func (o *CreditWalletMetadata) SetTopupCredits(v int32)`

SetTopupCredits sets TopupCredits field to given value.


### GetQueuePriority

`func (o *CreditWalletMetadata) GetQueuePriority() string`

GetQueuePriority returns the QueuePriority field if non-nil, zero value otherwise.

### GetQueuePriorityOk

`func (o *CreditWalletMetadata) GetQueuePriorityOk() (*string, bool)`

GetQueuePriorityOk returns a tuple with the QueuePriority field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetQueuePriority

`func (o *CreditWalletMetadata) SetQueuePriority(v string)`

SetQueuePriority sets QueuePriority field to given value.

### HasQueuePriority

`func (o *CreditWalletMetadata) HasQueuePriority() bool`

HasQueuePriority returns a boolean if a field has been set.

### GetLowCreditThreshold

`func (o *CreditWalletMetadata) GetLowCreditThreshold() int32`

GetLowCreditThreshold returns the LowCreditThreshold field if non-nil, zero value otherwise.

### GetLowCreditThresholdOk

`func (o *CreditWalletMetadata) GetLowCreditThresholdOk() (*int32, bool)`

GetLowCreditThresholdOk returns a tuple with the LowCreditThreshold field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLowCreditThreshold

`func (o *CreditWalletMetadata) SetLowCreditThreshold(v int32)`

SetLowCreditThreshold sets LowCreditThreshold field to given value.

### HasLowCreditThreshold

`func (o *CreditWalletMetadata) HasLowCreditThreshold() bool`

HasLowCreditThreshold returns a boolean if a field has been set.

### GetIsLowCredit

`func (o *CreditWalletMetadata) GetIsLowCredit() bool`

GetIsLowCredit returns the IsLowCredit field if non-nil, zero value otherwise.

### GetIsLowCreditOk

`func (o *CreditWalletMetadata) GetIsLowCreditOk() (*bool, bool)`

GetIsLowCreditOk returns a tuple with the IsLowCredit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsLowCredit

`func (o *CreditWalletMetadata) SetIsLowCredit(v bool)`

SetIsLowCredit sets IsLowCredit field to given value.

### HasIsLowCredit

`func (o *CreditWalletMetadata) HasIsLowCredit() bool`

HasIsLowCredit returns a boolean if a field has been set.

### GetUpdatedAt

`func (o *CreditWalletMetadata) GetUpdatedAt() time.Time`

GetUpdatedAt returns the UpdatedAt field if non-nil, zero value otherwise.

### GetUpdatedAtOk

`func (o *CreditWalletMetadata) GetUpdatedAtOk() (*time.Time, bool)`

GetUpdatedAtOk returns a tuple with the UpdatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpdatedAt

`func (o *CreditWalletMetadata) SetUpdatedAt(v time.Time)`

SetUpdatedAt sets UpdatedAt field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


