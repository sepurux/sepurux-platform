import type { ProjectMetadata } from "@/lib/api";

const PROJECT_CACHE_STORAGE_KEY = "sepurux.projectCache";
export const PROJECTS_UPDATED_EVENT = "sepurux:projects-updated";

function parseProjects(raw: string | null): ProjectMetadata[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is ProjectMetadata =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as ProjectMetadata).project_id === "string" &&
            typeof (item as ProjectMetadata).name === "string" &&
            typeof (item as ProjectMetadata).tenant_id === "string" &&
            typeof (item as ProjectMetadata).created_at === "string"
        )
    );
  } catch {
    return [];
  }
}

function persistProjects(projects: ProjectMetadata[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECT_CACHE_STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // ignore localStorage failures
  }
}

function sortProjects(projects: ProjectMetadata[]) {
  return [...projects].sort((a, b) => {
    const aTime = Date.parse(a.created_at) || 0;
    const bTime = Date.parse(b.created_at) || 0;
    return bTime - aTime;
  });
}

export function getCachedProjects(): ProjectMetadata[] {
  if (typeof window === "undefined") return [];
  try {
    return parseProjects(window.localStorage.getItem(PROJECT_CACHE_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function mergeProjects(
  primaryProjects: ProjectMetadata[],
  secondaryProjects: ProjectMetadata[]
): ProjectMetadata[] {
  const merged = new Map<string, ProjectMetadata>();
  for (const project of [...primaryProjects, ...secondaryProjects]) {
    merged.set(project.project_id, project);
  }
  return sortProjects(Array.from(merged.values()));
}

export function cacheProjects(projects: ProjectMetadata[]) {
  persistProjects(mergeProjects([], projects));
}

export function upsertCachedProject(project: ProjectMetadata): ProjectMetadata[] {
  const nextProjects = mergeProjects([project], getCachedProjects());
  persistProjects(nextProjects);
  return nextProjects;
}

export function dispatchProjectsUpdatedEvent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROJECTS_UPDATED_EVENT));
}
