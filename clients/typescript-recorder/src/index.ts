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

export interface TraceRecorderOptions {
  source?: string;
  traceVersion?: "0.1";
}

export interface TraceRunOptions extends TraceRecorderOptions {
  campaignId?: string;
  mutationPack?: string;
}

export interface SepuruxClientOptions {
  baseUrl: string;
  apiKey?: string;
  projectId?: string;
  timeoutMs?: number;
  sdkHeader?: string;
  fetchImpl?: FetchLike;
}

type TraceRunHandler = (
  recorder: ManagedTraceRecorder,
) => Promise<void> | void;

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

const DEFAULT_BASE_URL = "http://localhost:8000";
const DEFAULT_SOURCE = "typescript-recorder";
const DEFAULT_TIMEOUT_MS = 30_000;

export class TraceRecorder {
  protected readonly taskName: string;
  protected readonly taskInput: Record<string, unknown>;
  protected readonly source: string;
  protected readonly traceVersion: "0.1";
  protected readonly events: TraceEvent[] = [];
  protected nextEventIndex = 0;

  constructor(
    taskName: string,
    taskInput: Record<string, unknown> = {},
    options: TraceRecorderOptions = {},
  ) {
    this.taskName = taskName;
    this.taskInput = taskInput;
    this.source = options.source ?? DEFAULT_SOURCE;
    this.traceVersion = options.traceVersion ?? "0.1";
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

  buildTrace(): TracePayload {
    return {
      trace_version: this.traceVersion,
      source: this.source,
      task: {
        name: this.taskName,
        input: { ...this.taskInput },
      },
      events: this.events.map((event) => ({ ...event })),
    };
  }

  /** @deprecated Prefer SepuruxClient.trace(...) or ManagedTraceRecorder.flush(). */
  toTrace(): TracePayload {
    return this.buildTrace();
  }

  protected pushEvent(
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

export class ManagedTraceRecorder extends TraceRecorder {
  traceId: string | null = null;
  batchId: string | null = null;
  /** @deprecated Use batchId — kept for backward compatibility. */
  runId: string | null = null;
  uploadError: Error | null = null;

  private readonly client: SepuruxClient;
  private readonly campaignId?: string;
  private readonly mutationPack?: string;

  constructor(
    client: SepuruxClient,
    taskName: string,
    taskInput: Record<string, unknown> = {},
    options: TraceRunOptions = {},
  ) {
    if (options.mutationPack && !options.campaignId) {
      throw new Error("campaignId is required when mutationPack is provided");
    }
    super(taskName, taskInput, options);
    this.client = client;
    this.campaignId = options.campaignId;
    this.mutationPack = options.mutationPack;
  }

  async flush(): Promise<{ traceId: string; batchId?: string; runId?: string }> {
    this.traceId = await this.client.uploadTrace(this.buildTrace());
    if (this.campaignId) {
      if (this.mutationPack) {
        this.runId = await this.client.runPack({
          campaignId: this.campaignId,
          mutationPack: this.mutationPack,
        });
      } else {
        this.batchId = await this.client.startRun({
          traceId: this.traceId,
          campaignId: this.campaignId,
        });
        this.runId = this.batchId; // backward compat
      }
    }

    return this.batchId
      ? { traceId: this.traceId, batchId: this.batchId, runId: this.batchId }
      : this.runId
        ? { traceId: this.traceId, runId: this.runId }
        : { traceId: this.traceId };
  }
}

export class SepuruxClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly projectId?: string;
  readonly timeoutMs: number;
  readonly sdkHeader: string;

  private readonly fetchImpl: FetchLike;

  constructor(options: SepuruxClientOptions) {
    const baseUrl = options.baseUrl.trim().replace(/\/+$/, "");
    if (!baseUrl) {
      throw new Error("baseUrl must be a non-empty URL");
    }

    this.baseUrl = baseUrl;
    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.sdkHeader = options.sdkHeader ?? "ts/dev";
    this.fetchImpl = options.fetchImpl ?? resolveFetch();
  }

  static fromEnv(
    env: Record<string, string | undefined> = defaultEnv(),
    options: Omit<Partial<SepuruxClientOptions>, "baseUrl" | "apiKey" | "projectId"> = {},
  ): SepuruxClient {
    return new SepuruxClient({
      baseUrl:
        env.SEPURUX_API_BASE_URL ??
        env.SEPURUX_BASE_URL ??
        DEFAULT_BASE_URL,
      apiKey: env.SEPURUX_API_KEY,
      projectId: env.SEPURUX_PROJECT_ID,
      timeoutMs: options.timeoutMs,
      sdkHeader: options.sdkHeader,
      fetchImpl: options.fetchImpl,
    });
  }

  startTrace(
    taskName: string,
    taskInput: Record<string, unknown> = {},
    options: TraceRunOptions = {},
  ): ManagedTraceRecorder {
    return new ManagedTraceRecorder(this, taskName, taskInput, options);
  }

  async trace(
    taskName: string,
    taskInput: Record<string, unknown> = {},
    handler: TraceRunHandler,
    options: TraceRunOptions = {},
  ): Promise<ManagedTraceRecorder> {
    const recorder = this.startTrace(taskName, taskInput, options);
    try {
      await handler(recorder);
    } catch (error) {
      recorder.error(normalizeError(error).message);
      try {
        await recorder.flush();
      } catch (flushError) {
        recorder.uploadError = normalizeError(flushError);
      }
      throw error;
    }

    try {
      await recorder.flush();
    } catch (error) {
      recorder.uploadError = normalizeError(error);
      throw error;
    }
    return recorder;
  }

  async uploadTrace(trace: TracePayload | Record<string, unknown>): Promise<string> {
    const payload = await this.request<{ trace_id?: string }>("/v1/traces", {
      method: "POST",
      body: trace,
    });
    const traceId = payload.trace_id;
    if (!traceId) {
      throw new Error("Trace upload succeeded but trace_id was missing");
    }
    return traceId;
  }

  /** Start a CI batch run. Returns the batch_id. */
  async startRun(input: {
    traceId: string;
    campaignId: string;
    mutationPackId?: string;
    thresholds?: { min_pass_rate?: number; max_unsafe?: number; max_failures?: number };
  }): Promise<string> {
    const payload = await this.request<{ batch_id?: string; run_id?: string }>("/v1/ci/runs", {
      method: "POST",
      body: {
        trace_id: input.traceId,
        campaign_id: input.campaignId,
        thresholds: input.thresholds ?? { min_pass_rate: 0.9, max_unsafe: 0 },
        ...(input.mutationPackId ? { mutation_pack_id: input.mutationPackId } : {}),
      },
    });
    const batchId = payload.batch_id ?? payload.run_id;
    if (!batchId) {
      throw new Error("Run creation succeeded but batch_id was missing");
    }
    return batchId;
  }

  /** Register traces in a campaign's eval-set for multi-scenario CI batches. */
  async registerEvalTraces(input: {
    campaignId: string;
    addTraceIds: string[];
    removeTraceIds?: string[];
    minScenarios?: number;
  }): Promise<void> {
    await this.request<unknown>(
      `/v1/campaigns/${encodeURIComponent(input.campaignId)}/eval-set`,
      {
        method: "PATCH",
        body: {
          add_trace_ids: input.addTraceIds,
          remove_trace_ids: input.removeTraceIds ?? [],
          ...(input.minScenarios !== undefined ? { min_scenarios: input.minScenarios } : {}),
        },
      },
    );
  }

  async runPack(input: {
    campaignId: string;
    mutationPack: string;
  }): Promise<string> {
    const payload = await this.request<{ run_id?: string }>(
      `/v1/campaigns/${encodeURIComponent(input.campaignId)}/run-pack`,
      {
        method: "POST",
        body: { pack: input.mutationPack },
      },
    );
    const runId = payload.run_id;
    if (!runId) {
      throw new Error("Run-pack succeeded but run_id was missing");
    }
    return runId;
  }

  private async request<T>(
    path: string,
    input: { method: string; body?: unknown },
  ): Promise<T> {
    const controller =
      typeof AbortController === "function" ? new AbortController() : undefined;
    const timeoutId =
      controller !== undefined
        ? setTimeout(() => controller.abort(), this.timeoutMs)
        : undefined;

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: input.method,
        headers: this.requestHeaders(),
        body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
        signal: controller?.signal,
      });
      const payload = await parseJsonResponse(response);
      if (!response.ok) {
        throw new Error(
          messageFromPayload(payload, `Request failed: ${response.status}`),
        );
      }
      return payload as T;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private requestHeaders(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Sepurux-SDK": this.sdkHeader,
      ...(this.apiKey ? { "X-API-Key": this.apiKey } : {}),
      ...(this.projectId ? { "X-Project-Id": this.projectId } : {}),
    };
  }
}

let defaultClient: SepuruxClient | null = null;

export function configure(
  clientOrOptions?: SepuruxClient | Partial<SepuruxClientOptions>,
): SepuruxClient {
  if (clientOrOptions instanceof SepuruxClient) {
    defaultClient = clientOrOptions;
    return clientOrOptions;
  }

  defaultClient = new SepuruxClient({
    baseUrl:
      clientOrOptions?.baseUrl ??
      defaultEnv().SEPURUX_API_BASE_URL ??
      defaultEnv().SEPURUX_BASE_URL ??
      DEFAULT_BASE_URL,
    apiKey: clientOrOptions?.apiKey ?? defaultEnv().SEPURUX_API_KEY,
    projectId: clientOrOptions?.projectId ?? defaultEnv().SEPURUX_PROJECT_ID,
    timeoutMs: clientOrOptions?.timeoutMs,
    sdkHeader: clientOrOptions?.sdkHeader,
    fetchImpl: clientOrOptions?.fetchImpl,
  });
  return defaultClient;
}

export function getClient(): SepuruxClient {
  if (!defaultClient) {
    defaultClient = SepuruxClient.fromEnv();
  }
  return defaultClient;
}

export async function trace(
  taskName: string,
  taskInput: Record<string, unknown>,
  handler: TraceRunHandler,
  options: TraceRunOptions = {},
): Promise<ManagedTraceRecorder> {
  return getClient().trace(taskName, taskInput, handler, options);
}

export function startTrace(
  taskName: string,
  taskInput: Record<string, unknown> = {},
  options: TraceRunOptions = {},
): ManagedTraceRecorder {
  return getClient().startTrace(taskName, taskInput, options);
}

function defaultEnv(): Record<string, string | undefined> {
  const processLike = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return processLike.process?.env ?? {};
}

function resolveFetch(): FetchLike {
  const fetchValue = (globalThis as typeof globalThis & { fetch?: FetchLike }).fetch;
  if (!fetchValue) {
    throw new Error("No fetch implementation available; pass fetchImpl explicitly.");
  }
  return fetchValue;
}

async function parseJsonResponse(
  response: Awaited<ReturnType<FetchLike>>,
): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) {
      return detail;
    }
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }
  if (typeof payload === "string" && payload) {
    return payload;
  }
  return fallback;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
