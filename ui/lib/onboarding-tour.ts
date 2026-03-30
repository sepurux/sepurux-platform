export const NEW_USER_TOUR_VERSION = "v1";
export const NEW_USER_TOUR_OPEN_EVENT = "sepurux:new-user-tour:open";

export function dispatchOpenNewUserTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NEW_USER_TOUR_OPEN_EVENT));
}

