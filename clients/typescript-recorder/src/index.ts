export interface TraceTask {
  name: string;
  input: Record<string, unknown>;
}

export interface TraceEvent {
  index: number;
  timestamp: string;
  type: "model_step" | "tool_call" | "tool_result" | "error";
  name?: string;
  tool?: string;
  input?: unknown;
  output?: unknown;
  args?: Record<string, unknown>;
  result?: unknown;
  message?: string;
}

export interface TracePayload {
  trace_version: "0.1";
  source: string;
  task: TraceTask;
  events: TraceEvent[];
}

export class TraceRecorder {
  private readonly taskName: string;
  private readonly taskInput: Record<string, unknown>;
  private readonly events: TraceEvent[] = [];
  private nextEventIndex = 0;

  constructor(taskName: string, taskInput: Record<string, unknown> = {}) {
    this.taskName = taskName;
    this.taskInput = taskInput;
  }

  modelStep(name: string, input: unknown, output?: unknown): this {
    this.pushEvent("model_step", {
      name,
      input,
      ...(output !== undefined ? { output } : {}),
    });
    return this;
  }

  toolCall(tool: string, args: Record<string, unknown>): this {
    this.pushEvent("tool_call", { tool, args });
    return this;
  }

  toolResult(tool: string, result: unknown): this {
    this.pushEvent("tool_result", { tool, result });
    return this;
  }

  error(message: string, tool?: string): this {
    this.pushEvent("error", {
      message,
      ...(tool !== undefined ? { tool } : {}),
    });
    return this;
  }

  toTrace(): TracePayload {
    return {
      trace_version: "0.1",
      source: "typescript-recorder",
      task: {
        name: this.taskName,
        input: { ...this.taskInput },
      },
      events: this.events.map((event) => ({ ...event })),
    };
  }

  private pushEvent(
    type: TraceEvent["type"],
    payload: Omit<TraceEvent, "index" | "timestamp" | "type">,
  ): void {
    this.events.push({
      index: this.nextEventIndex,
      timestamp: new Date().toISOString(),
      type,
      ...payload,
    });
    this.nextEventIndex += 1;
  }
}
