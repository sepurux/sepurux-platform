# ComplianceSummaryResponse

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**WindowDays** | **int32** |  | 
**GeneratedAt** | **time.Time** |  | 
**AuditEventsTotal** | **int32** |  | 
**PolicyEventsTotal** | **int32** |  | 
**SecurityEventsTotal** | **int32** |  | 
**PolicyDenies** | **int32** |  | 
**SecurityBlocks** | **int32** |  | 
**SecuritySanitizations** | **int32** |  | 
**TopPolicyTools** | Pointer to [**[]ToolCount**](ToolCount.md) |  | [optional] 
**TopSecurityTools** | Pointer to [**[]ToolCount**](ToolCount.md) |  | [optional] 

## Methods

### NewComplianceSummaryResponse

`func NewComplianceSummaryResponse(windowDays int32, generatedAt time.Time, auditEventsTotal int32, policyEventsTotal int32, securityEventsTotal int32, policyDenies int32, securityBlocks int32, securitySanitizations int32, ) *ComplianceSummaryResponse`

NewComplianceSummaryResponse instantiates a new ComplianceSummaryResponse object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewComplianceSummaryResponseWithDefaults

`func NewComplianceSummaryResponseWithDefaults() *ComplianceSummaryResponse`

NewComplianceSummaryResponseWithDefaults instantiates a new ComplianceSummaryResponse object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetWindowDays

`func (o *ComplianceSummaryResponse) GetWindowDays() int32`

GetWindowDays returns the WindowDays field if non-nil, zero value otherwise.

### GetWindowDaysOk

`func (o *ComplianceSummaryResponse) GetWindowDaysOk() (*int32, bool)`

GetWindowDaysOk returns a tuple with the WindowDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWindowDays

`func (o *ComplianceSummaryResponse) SetWindowDays(v int32)`

SetWindowDays sets WindowDays field to given value.


### GetGeneratedAt

`func (o *ComplianceSummaryResponse) GetGeneratedAt() time.Time`

GetGeneratedAt returns the GeneratedAt field if non-nil, zero value otherwise.

### GetGeneratedAtOk

`func (o *ComplianceSummaryResponse) GetGeneratedAtOk() (*time.Time, bool)`

GetGeneratedAtOk returns a tuple with the GeneratedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGeneratedAt

`func (o *ComplianceSummaryResponse) SetGeneratedAt(v time.Time)`

SetGeneratedAt sets GeneratedAt field to given value.


### GetAuditEventsTotal

`func (o *ComplianceSummaryResponse) GetAuditEventsTotal() int32`

GetAuditEventsTotal returns the AuditEventsTotal field if non-nil, zero value otherwise.

### GetAuditEventsTotalOk

`func (o *ComplianceSummaryResponse) GetAuditEventsTotalOk() (*int32, bool)`

GetAuditEventsTotalOk returns a tuple with the AuditEventsTotal field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAuditEventsTotal

`func (o *ComplianceSummaryResponse) SetAuditEventsTotal(v int32)`

SetAuditEventsTotal sets AuditEventsTotal field to given value.


### GetPolicyEventsTotal

`func (o *ComplianceSummaryResponse) GetPolicyEventsTotal() int32`

GetPolicyEventsTotal returns the PolicyEventsTotal field if non-nil, zero value otherwise.

### GetPolicyEventsTotalOk

`func (o *ComplianceSummaryResponse) GetPolicyEventsTotalOk() (*int32, bool)`

GetPolicyEventsTotalOk returns a tuple with the PolicyEventsTotal field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyEventsTotal

`func (o *ComplianceSummaryResponse) SetPolicyEventsTotal(v int32)`

SetPolicyEventsTotal sets PolicyEventsTotal field to given value.


### GetSecurityEventsTotal

`func (o *ComplianceSummaryResponse) GetSecurityEventsTotal() int32`

GetSecurityEventsTotal returns the SecurityEventsTotal field if non-nil, zero value otherwise.

### GetSecurityEventsTotalOk

`func (o *ComplianceSummaryResponse) GetSecurityEventsTotalOk() (*int32, bool)`

GetSecurityEventsTotalOk returns a tuple with the SecurityEventsTotal field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecurityEventsTotal

`func (o *ComplianceSummaryResponse) SetSecurityEventsTotal(v int32)`

SetSecurityEventsTotal sets SecurityEventsTotal field to given value.


### GetPolicyDenies

`func (o *ComplianceSummaryResponse) GetPolicyDenies() int32`

GetPolicyDenies returns the PolicyDenies field if non-nil, zero value otherwise.

### GetPolicyDeniesOk

`func (o *ComplianceSummaryResponse) GetPolicyDeniesOk() (*int32, bool)`

GetPolicyDeniesOk returns a tuple with the PolicyDenies field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPolicyDenies

`func (o *ComplianceSummaryResponse) SetPolicyDenies(v int32)`

SetPolicyDenies sets PolicyDenies field to given value.


### GetSecurityBlocks

`func (o *ComplianceSummaryResponse) GetSecurityBlocks() int32`

GetSecurityBlocks returns the SecurityBlocks field if non-nil, zero value otherwise.

### GetSecurityBlocksOk

`func (o *ComplianceSummaryResponse) GetSecurityBlocksOk() (*int32, bool)`

GetSecurityBlocksOk returns a tuple with the SecurityBlocks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecurityBlocks

`func (o *ComplianceSummaryResponse) SetSecurityBlocks(v int32)`

SetSecurityBlocks sets SecurityBlocks field to given value.


### GetSecuritySanitizations

`func (o *ComplianceSummaryResponse) GetSecuritySanitizations() int32`

GetSecuritySanitizations returns the SecuritySanitizations field if non-nil, zero value otherwise.

### GetSecuritySanitizationsOk

`func (o *ComplianceSummaryResponse) GetSecuritySanitizationsOk() (*int32, bool)`

GetSecuritySanitizationsOk returns a tuple with the SecuritySanitizations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecuritySanitizations

`func (o *ComplianceSummaryResponse) SetSecuritySanitizations(v int32)`

SetSecuritySanitizations sets SecuritySanitizations field to given value.


### GetTopPolicyTools

`func (o *ComplianceSummaryResponse) GetTopPolicyTools() []ToolCount`

GetTopPolicyTools returns the TopPolicyTools field if non-nil, zero value otherwise.

### GetTopPolicyToolsOk

`func (o *ComplianceSummaryResponse) GetTopPolicyToolsOk() (*[]ToolCount, bool)`

GetTopPolicyToolsOk returns a tuple with the TopPolicyTools field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopPolicyTools

`func (o *ComplianceSummaryResponse) SetTopPolicyTools(v []ToolCount)`

SetTopPolicyTools sets TopPolicyTools field to given value.

### HasTopPolicyTools

`func (o *ComplianceSummaryResponse) HasTopPolicyTools() bool`

HasTopPolicyTools returns a boolean if a field has been set.

### GetTopSecurityTools

`func (o *ComplianceSummaryResponse) GetTopSecurityTools() []ToolCount`

GetTopSecurityTools returns the TopSecurityTools field if non-nil, zero value otherwise.

### GetTopSecurityToolsOk

`func (o *ComplianceSummaryResponse) GetTopSecurityToolsOk() (*[]ToolCount, bool)`

GetTopSecurityToolsOk returns a tuple with the TopSecurityTools field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTopSecurityTools

`func (o *ComplianceSummaryResponse) SetTopSecurityTools(v []ToolCount)`

SetTopSecurityTools sets TopSecurityTools field to given value.

### HasTopSecurityTools

`func (o *ComplianceSummaryResponse) HasTopSecurityTools() bool`

HasTopSecurityTools returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


