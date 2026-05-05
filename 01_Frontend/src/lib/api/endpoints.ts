/**
 * Defines all backend endpoints to avoid having to redefine them in individual files.
 */
export const endpoints = {
  auth: {
    me: "/api/auth/me",
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
  },
  device: {
    list: "/api/device/web",
    get: (fingerprint: string) =>
      `/api/device/web/${encodeURIComponent(fingerprint)}`,
    rename: "/api/device/web/rename",
    delete: "/api/device/web/delete",
    setType: "/api/device/web/type",
  },
  event: {
    list: "/api/event",
    get: (eventId: number) => `/api/event/${eventId}`,
  },
  notification: {
    list: "/api/notification",
    markAllRead: "/api/notification/mark-all-read",
    deleteAll: "/api/notification/all",
    subscriptions: "/api/notification/subscriptions",
    subscriptionById: (id: number) =>
      `/api/notification/subscriptions/${id}`,
  },
  misc: {
    patient: "/api/misc/patient",
    locationBeacons: "/api/misc/location-beacon",
    locationBeaconById: (id: number) => `/api/misc/location-beacon/${id}`,
  },
} as const;
