/**
 * Defines all backend endpoints to avoid having to redefine them in individual files.
 */
export const endpoints = {
  auth: {
    me: "/api/auth/me",
    deleteMe: "/api/auth/me",
    myPushId: "/api/auth/me/pushId",
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    accessCodes: "/api/auth/accessCodes",
    createAccessCode: "/api/auth/accessCode",
    revokeAccessCode: "/api/auth/revokeAccessCode",
    users: "/api/auth/users",
    deleteUser: "/api/auth/deleteUser",
    changeUserRole: "/api/auth/updateUserRole",
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
    byTypeAndDays: (days: number, eventType: string) =>
      `/api/event/eventsByTypeAndDays?days=${days}&eventType=${encodeURIComponent(eventType)}`,
    byTypeAndSeconds: (seconds: number, eventType: string) =>
      `/api/event/eventsByTypeAndSeconds?seconds=${seconds}&eventType=${encodeURIComponent(eventType)}`,
    latestByType: (eventType: string) =>
      `/api/event/latest?type=${encodeURIComponent(eventType)}`,
  },
  notification: {
    list: "/api/notification",
    markAllRead: "/api/notification/mark-all-read",
    markRead: (id: number) => `/api/notification/${id}/mark-read`,
    deleteAll: "/api/notification/all",
    subscriptions: "/api/notification/subscriptions",
    subscriptionById: (id: number) => `/api/notification/subscriptions/${id}`,
  },
  misc: {
    patient: "/api/misc/patient",
    locationBeacons: "/api/misc/location-beacon",
    locationBeaconById: (id: number) => `/api/misc/location-beacon/${id}`,
    infrastructureStates: "/api/misc/infrastructure-states",
  },
} as const;
