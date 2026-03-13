package sepuruxrecorder

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	defaultTraceVersion = "0.1"
	defaultSource       = "go-recorder"
	defaultBaseURL      = "http://localhost:8000"
	defaultSDKHeader    = "go/dev"
	defaultTimeout      = 30 * time.Second
)

type Task struct {
	Name  string         `json:"name"`
	Input map[string]any `json:"input"`
}

type Event struct {
	Index     int            `json:"index"`
	Timestamp time.Time      `json:"timestamp"`
	Type      string         `json:"type"`
	Name      string         `json:"name,omitempty"`
	Tool      string         `json:"tool,omitempty"`
	Input     any            `json:"input,omitempty"`
	Output    any            `json:"output,omitempty"`
	Args      map[string]any `json:"args,omitempty"`
	Result    any            `json:"result,omitempty"`
	Message   string         `json:"message,omitempty"`
}

type Trace struct {
	TraceVersion string  `json:"trace_version"`
	Source       string  `json:"source"`
	Task         Task    `json:"task"`
	Events       []Event `json:"events"`
}

type RecorderOptions struct {
	Source       string
	TraceVersion string
}

type TraceOptions struct {
	Source       string
	TraceVersion string
	CampaignID   string
	MutationPack string
}

type ClientOptions struct {
	BaseURL    string
	APIKey     string
	ProjectID  string
	SDKHeader  string
	Timeout    time.Duration
	HTTPClient *http.Client
}

type StartRunInput struct {
	TraceID        string
	CampaignID     string
	MutationPackID string
}

type Client struct {
	baseURL    string
	apiKey     string
	projectID  string
	sdkHeader  string
	httpClient *http.Client
}

type Recorder struct {
	taskName     string
	taskInput    map[string]any
	events       []Event
	nextIndex    int
	source       string
	traceVersion string
}

type ManagedRecorder struct {
	*Recorder
	client       *Client
	campaignID   string
	mutationPack string
	TraceID      string
	RunID        string
	UploadError  error
}

func NewRecorder(taskName string, taskInput map[string]any, options ...RecorderOptions) *Recorder {
	if taskInput == nil {
		taskInput = map[string]any{}
	}

	option := RecorderOptions{
		Source:       defaultSource,
		TraceVersion: defaultTraceVersion,
	}
	if len(options) > 0 {
		if options[0].Source != "" {
			option.Source = options[0].Source
		}
		if options[0].TraceVersion != "" {
			option.TraceVersion = options[0].TraceVersion
		}
	}

	return &Recorder{
		taskName:     taskName,
		taskInput:    taskInput,
		events:       make([]Event, 0, 8),
		nextIndex:    0,
		source:       option.Source,
		traceVersion: option.TraceVersion,
	}
}

func NewClient(options ClientOptions) (*Client, error) {
	baseURL := strings.TrimRight(strings.TrimSpace(options.BaseURL), "/")
	if baseURL == "" {
		return nil, errors.New("baseURL must be a non-empty URL")
	}

	httpClient := options.HTTPClient
	if httpClient == nil {
		timeout := options.Timeout
		if timeout == 0 {
			timeout = defaultTimeout
		}
		httpClient = &http.Client{Timeout: timeout}
	}

	sdkHeader := strings.TrimSpace(options.SDKHeader)
	if sdkHeader == "" {
		sdkHeader = defaultSDKHeader
	}

	return &Client{
		baseURL:    baseURL,
		apiKey:     options.APIKey,
		projectID:  options.ProjectID,
		sdkHeader:  sdkHeader,
		httpClient: httpClient,
	}, nil
}

func NewClientFromEnv() (*Client, error) {
	baseURL := os.Getenv("SEPURUX_API_BASE_URL")
	if baseURL == "" {
		baseURL = os.Getenv("SEPURUX_BASE_URL")
	}
	if baseURL == "" {
		baseURL = defaultBaseURL
	}

	return NewClient(ClientOptions{
		BaseURL:   baseURL,
		APIKey:    os.Getenv("SEPURUX_API_KEY"),
		ProjectID: os.Getenv("SEPURUX_PROJECT_ID"),
	})
}

func (r *Recorder) ToolCall(name string, args map[string]any) {
	if args == nil {
		args = map[string]any{}
	}
	r.push(Event{
		Type: "tool_call",
		Tool: name,
		Args: args,
	})
}

func (r *Recorder) ToolResult(name string, result any) {
	r.push(Event{
		Type:   "tool_result",
		Tool:   name,
		Result: result,
	})
}

func (r *Recorder) ModelStep(name string, input any, output any) {
	r.push(Event{
		Type:   "model_step",
		Name:   name,
		Input:  input,
		Output: output,
	})
}

func (r *Recorder) Error(msg string, tool ...string) {
	event := Event{
		Type:    "error",
		Message: msg,
	}
	if len(tool) > 0 {
		event.Tool = tool[0]
	}
	r.push(event)
}

func (r *Recorder) BuildTrace() Trace {
	eventsCopy := make([]Event, len(r.events))
	copy(eventsCopy, r.events)

	inputCopy := make(map[string]any, len(r.taskInput))
	for key, value := range r.taskInput {
		inputCopy[key] = value
	}

	return Trace{
		TraceVersion: r.traceVersion,
		Source:       r.source,
		Task: Task{
			Name:  r.taskName,
			Input: inputCopy,
		},
		Events: eventsCopy,
	}
}

// Trace is deprecated; prefer Client.Trace(...) or BuildTrace() for low-level access.
func (r *Recorder) Trace() Trace {
	return r.BuildTrace()
}

func (c *Client) StartTrace(taskName string, taskInput map[string]any, options TraceOptions) (*ManagedRecorder, error) {
	if options.MutationPack != "" && options.CampaignID == "" {
		return nil, errors.New("campaignID is required when mutationPack is provided")
	}

	recorderOptions := RecorderOptions{
		Source:       options.Source,
		TraceVersion: options.TraceVersion,
	}
	return &ManagedRecorder{
		Recorder:     NewRecorder(taskName, taskInput, recorderOptions),
		client:       c,
		campaignID:   options.CampaignID,
		mutationPack: options.MutationPack,
	}, nil
}

func (c *Client) Trace(
	ctx context.Context,
	taskName string,
	taskInput map[string]any,
	options TraceOptions,
	handler func(*ManagedRecorder) error,
) (*ManagedRecorder, error) {
	recorder, err := c.StartTrace(taskName, taskInput, options)
	if err != nil {
		return nil, err
	}

	if err := handler(recorder); err != nil {
		recorder.Error(err.Error())
		if flushErr := recorder.Flush(ctx); flushErr != nil {
			recorder.UploadError = flushErr
		}
		return recorder, err
	}

	if err := recorder.Flush(ctx); err != nil {
		recorder.UploadError = err
		return recorder, err
	}
	return recorder, nil
}

func (r *ManagedRecorder) Flush(ctx context.Context) error {
	traceID, err := r.client.UploadTrace(ctx, r.BuildTrace())
	if err != nil {
		r.UploadError = err
		return err
	}
	r.TraceID = traceID

	if r.campaignID == "" {
		return nil
	}

	if r.mutationPack != "" {
		runID, err := r.client.RunPack(ctx, r.campaignID, r.mutationPack)
		if err != nil {
			r.UploadError = err
			return err
		}
		r.RunID = runID
		return nil
	}

	runID, err := r.client.StartRun(ctx, StartRunInput{
		TraceID:    traceID,
		CampaignID: r.campaignID,
	})
	if err != nil {
		r.UploadError = err
		return err
	}
	r.RunID = runID
	return nil
}

func (c *Client) UploadTrace(ctx context.Context, trace Trace) (string, error) {
	var responseBody struct {
		TraceID string `json:"trace_id"`
	}
	if err := c.request(ctx, http.MethodPost, "/v1/traces", trace, &responseBody); err != nil {
		return "", err
	}
	if strings.TrimSpace(responseBody.TraceID) == "" {
		return "", errors.New("trace upload succeeded but trace_id was missing")
	}
	return responseBody.TraceID, nil
}

func (c *Client) StartRun(ctx context.Context, input StartRunInput) (string, error) {
	body := map[string]any{
		"trace_id":    input.TraceID,
		"campaign_id": input.CampaignID,
	}
	if input.MutationPackID != "" {
		body["mutation_pack_id"] = input.MutationPackID
	}

	var responseBody struct {
		RunID string `json:"run_id"`
	}
	if err := c.request(ctx, http.MethodPost, "/v1/runs", body, &responseBody); err != nil {
		return "", err
	}
	if strings.TrimSpace(responseBody.RunID) == "" {
		return "", errors.New("run creation succeeded but run_id was missing")
	}
	return responseBody.RunID, nil
}

func (c *Client) RunPack(ctx context.Context, campaignID string, mutationPack string) (string, error) {
	var responseBody struct {
		RunID string `json:"run_id"`
	}
	path := fmt.Sprintf("/v1/campaigns/%s/run-pack", campaignID)
	body := map[string]any{"pack": mutationPack}
	if err := c.request(ctx, http.MethodPost, path, body, &responseBody); err != nil {
		return "", err
	}
	if strings.TrimSpace(responseBody.RunID) == "" {
		return "", errors.New("run-pack succeeded but run_id was missing")
	}
	return responseBody.RunID, nil
}

func (r *Recorder) push(event Event) {
	event.Index = r.nextIndex
	event.Timestamp = time.Now().UTC()
	r.events = append(r.events, event)
	r.nextIndex++
}

func (c *Client) request(ctx context.Context, method string, path string, payload any, into any) error {
	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(raw)
	}

	request, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return err
	}

	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Sepurux-SDK", c.sdkHeader)
	if c.apiKey != "" {
		request.Header.Set("X-API-Key", c.apiKey)
	}
	if c.projectID != "" {
		request.Header.Set("X-Project-Id", c.projectID)
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	raw, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}

	if response.StatusCode >= 400 {
		return responseError(response.StatusCode, raw)
	}

	if into == nil || len(raw) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, into); err != nil {
		return err
	}
	return nil
}

func responseError(statusCode int, raw []byte) error {
	if len(raw) == 0 {
		return fmt.Errorf("request failed: %d", statusCode)
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err == nil {
		if detail, ok := payload["detail"].(string); ok && detail != "" {
			return errors.New(detail)
		}
		if message, ok := payload["message"].(string); ok && message != "" {
			return errors.New(message)
		}
	}

	message := strings.TrimSpace(string(raw))
	if message == "" {
		message = fmt.Sprintf("request failed: %d", statusCode)
	}
	return errors.New(message)
}
