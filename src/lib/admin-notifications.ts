export interface AdminActivityTimestamps {
  monitor: string | null;
  history: string | null;
  photos: string | null;
}

export interface AdminUnreadMap {
  monitor: boolean;
  history: boolean;
  photos: boolean;
}

function isNewer(latest: string | null, seen: string | null): boolean {
  if (!latest) return false;
  if (!seen) return true;
  return new Date(latest).getTime() > new Date(seen).getTime();
}

export function computeUnreadTabs(
  latest: AdminActivityTimestamps,
  lastSeen: AdminActivityTimestamps,
  activeTab: string
): AdminUnreadMap {
  return {
    monitor: activeTab !== "monitor" && isNewer(latest.monitor, lastSeen.monitor),
    history: activeTab !== "history" && isNewer(latest.history, lastSeen.history),
    photos: activeTab !== "photos" && isNewer(latest.photos, lastSeen.photos),
  };
}
