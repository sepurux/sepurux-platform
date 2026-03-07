# ApiKeyCreateResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ApiKeyId** | **string** |  | 
**TenantId** | **string** |  | 
**Name** | **string** |  | 
**CreatedAt** | **time.Time** |  | 
**LastUsedAt** | Pointer to **NullableTime** |  | [optional] 
**RevokedAt** | Pointer to **NullableTime** |  | [optional] 
**ApiKey** | **string** |  | 

## Methods

### NewApiKeyCreateResponse

`func NewApiKeyCreateResponse(apiKeyId string, tenantId string, name string, createdAt time.Time, apiKey string, ) *ApiKeyCreateResponse`

NewApiKeyCreateResponse instantiates a new ApiKeyCreateResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewApiKeyCreateResponseWithDefaults

`func NewApiKeyCreateResponseWithDefaults() *ApiKeyCreateResponse`

NewApiKeyCreateResponseWithDefaults instantiates a new ApiKeyCreateResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetApiKeyId

`func (o *ApiKeyCreateResponse) GetApiKeyId() string`

GetApiKeyId returns the ApiKeyId field if non-nil, zero value otherwise.

### GetApiKeyIdOk

`func (o *ApiKeyCreateResponse) GetApiKeyIdOk() (*string, bool)`

GetApiKeyIdOk returns a tuple with the ApiKeyId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetApiKeyId

`func (o *ApiKeyCreateResponse) SetApiKeyId(v string)`

SetApiKeyId sets ApiKeyId field to given value.


### GetTenantId

`func (o *ApiKeyCreateResponse) GetTenantId() string`

GetTenantId returns the TenantId field if non-nil, zero value otherwise.

### GetTenantIdOk

`func (o *ApiKeyCreateResponse) GetTenantIdOk() (*string, bool)`

GetTenantIdOk returns a tuple with the TenantId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTenantId

`func (o *ApiKeyCreateResponse) SetTenantId(v string)`

SetTenantId sets TenantId field to given value.


### GetName

`func (o *ApiKeyCreateResponse) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *ApiKeyCreateResponse) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *ApiKeyCreateResponse) SetName(v string)`

SetName sets Name field to given value.


### GetCreatedAt

`func (o *ApiKeyCreateResponse) GetCreatedAt() time.Time`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *ApiKeyCreateResponse) GetCreatedAtOk() (*time.Time, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *ApiKeyCreateResponse) SetCreatedAt(v time.Time)`

SetCreatedAt sets CreatedAt field to given value.


### GetLastUsedAt

`func (o *ApiKeyCreateResponse) GetLastUsedAt() time.Time`

GetLastUsedAt returns the LastUsedAt field if non-nil, zero value otherwise.

### GetLastUsedAtOk

`func (o *ApiKeyCreateResponse) GetLastUsedAtOk() (*time.Time, bool)`

GetLastUsedAtOk returns a tuple with the LastUsedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastUsedAt

`func (o *ApiKeyCreateResponse) SetLastUsedAt(v time.Time)`

SetLastUsedAt sets LastUsedAt field to given value.

### HasLastUsedAt

`func (o *ApiKeyCreateResponse) HasLastUsedAt() bool`

HasLastUsedAt returns a boolean if a field has been set.

### SetLastUsedAtNil

`func (o *ApiKeyCreateResponse) SetLastUsedAtNil(b bool)`

 SetLastUsedAtNil sets the value for LastUsedAt to be an explicit nil

### UnsetLastUsedAt
`func (o *ApiKeyCreateResponse) UnsetLastUsedAt()`

UnsetLastUsedAt ensures that no value is present for LastUsedAt, not even an explicit nil
### GetRevokedAt

`func (o *ApiKeyCreateResponse) GetRevokedAt() time.Time`

GetRevokedAt returns the RevokedAt field if non-nil, zero value otherwise.

### GetRevokedAtOk

`func (o *ApiKeyCreateResponse) GetRevokedAtOk() (*time.Time, bool)`

GetRevokedAtOk returns a tuple with the RevokedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRevokedAt

`func (o *ApiKeyCreateResponse) SetRevokedAt(v time.Time)`

SetRevokedAt sets RevokedAt field to given value.

### HasRevokedAt

`func (o *ApiKeyCreateResponse) HasRevokedAt() bool`

HasRevokedAt returns a boolean if a field has been set.

### SetRevokedAtNil

`func (o *ApiKeyCreateResponse) SetRevokedAtNil(b bool)`

 SetRevokedAtNil sets the value for RevokedAt to be an explicit nil

### UnsetRevokedAt
`func (o *ApiKeyCreateResponse) UnsetRevokedAt()`

UnsetRevokedAt ensures that no value is present for RevokedAt, not even an explicit nil
### GetApiKey

`func (o *ApiKeyCreateResponse) GetApiKey() string`

GetApiKey returns the ApiKey field if non-nil, zero value otherwise.

### GetApiKeyOk

`func (o *ApiKeyCreateResponse) GetApiKeyOk() (*string, bool)`

GetApiKeyOk returns a tuple with the ApiKey field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetApiKey

`func (o *ApiKeyCreateResponse) SetApiKey(v string)`

SetApiKey sets ApiKey field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


