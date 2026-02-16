import { devices, users } from "./schema";

export type ExistingUser = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type NewDevice = typeof devices.$inferInsert
export type ExistingDevice = typeof devices.$inferSelect
