import { users } from "./schema";

export type ExistingUser = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert