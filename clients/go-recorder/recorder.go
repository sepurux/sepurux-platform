package crashlabrecorder

import "time"

const traceVersion = "0.1"

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
	Result    map[string]any `json:"result,omitempty"`
	Message   string         `json:"message,omitempty"`
}

type Trace struct {
	TraceVersion string  `json:"trace_version"`
	Source       string  `json:"source"`
	Task         Task    `json:"task"`
	Events       []Event `json:"events"`
}

type Recorder struct {
	taskName  string
	taskInput map[string]any
	events    []Event
	nextIndex int
}

func NewRecorder(taskName string, taskInput map[string]any) *Recorder {
	if taskInput == nil {
		taskInput = map[string]any{}
	}

	return &Recorder{
		taskName:  taskName,
		taskInput: taskInput,
		events:    make([]Event, 0, 8),
		nextIndex: 0,
	}
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

func (r *Recorder) ToolResult(name string, result map[string]any) {
	if result == nil {
		result = map[string]any{}
	}
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

func (r *Recorder) Error(msg string) {
	r.push(Event{
		Type:    "error",
		Message: msg,
	})
}

func (r *Recorder) Trace() Trace {
	eventsCopy := make([]Event, len(r.events))
	copy(eventsCopy, r.events)

	inputCopy := make(map[string]any, len(r.taskInput))
	for key, value := range r.taskInput {
		inputCopy[key] = value
	}

	return Trace{
		TraceVersion: traceVersion,
		Source:       "go-recorder",
		Task: Task{
			Name:  r.taskName,
			Input: inputCopy,
		},
		Events: eventsCopy,
	}
}

func (r *Recorder) push(event Event) {
	event.Index = r.nextIndex
	event.Timestamp = time.Now().UTC()
	r.events = append(r.events, event)
	r.nextIndex++
}
