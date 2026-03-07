# RunInsight

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Title** | **string** |  | 
**Recommendation** | **string** |  | 
**Why** | **string** |  | 
**Confidence** | **float32** |  | 
**Evidence** | [**RunInsightEvidence**](RunInsightEvidence.md) |  | 

## Methods

### NewRunInsight

`func NewRunInsight(id string, title string, recommendation string, why string, confidence float32, evidence RunInsightEvidence, ) *RunInsight`

NewRunInsight instantiates a new RunInsight object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewRunInsightWithDefaults

`func NewRunInsightWithDefaults() *RunInsight`

NewRunInsightWithDefaults instantiates a new RunInsight object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *RunInsight) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *RunInsight) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *RunInsight) SetId(v string)`

SetId sets Id field to given value.


### GetTitle

`func (o *RunInsight) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *RunInsight) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *RunInsight) SetTitle(v string)`

SetTitle sets Title field to given value.


### GetRecommendation

`func (o *RunInsight) GetRecommendation() string`

GetRecommendation returns the Recommendation field if non-nil, zero value otherwise.

### GetRecommendationOk

`func (o *RunInsight) GetRecommendationOk() (*string, bool)`

GetRecommendationOk returns a tuple with the Recommendation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecommendation

`func (o *RunInsight) SetRecommendation(v string)`

SetRecommendation sets Recommendation field to given value.


### GetWhy

`func (o *RunInsight) GetWhy() string`

GetWhy returns the Why field if non-nil, zero value otherwise.

### GetWhyOk

`func (o *RunInsight) GetWhyOk() (*string, bool)`

GetWhyOk returns a tuple with the Why field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWhy

`func (o *RunInsight) SetWhy(v string)`

SetWhy sets Why field to given value.


### GetConfidence

`func (o *RunInsight) GetConfidence() float32`

GetConfidence returns the Confidence field if non-nil, zero value otherwise.

### GetConfidenceOk

`func (o *RunInsight) GetConfidenceOk() (*float32, bool)`

GetConfidenceOk returns a tuple with the Confidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetConfidence

`func (o *RunInsight) SetConfidence(v float32)`

SetConfidence sets Confidence field to given value.


### GetEvidence

`func (o *RunInsight) GetEvidence() RunInsightEvidence`

GetEvidence returns the Evidence field if non-nil, zero value otherwise.

### GetEvidenceOk

`func (o *RunInsight) GetEvidenceOk() (*RunInsightEvidence, bool)`

GetEvidenceOk returns a tuple with the Evidence field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEvidence

`func (o *RunInsight) SetEvidence(v RunInsightEvidence)`

SetEvidence sets Evidence field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


