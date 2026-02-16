import { z } from "zod";

export const RenameDeviceSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(64),
  })
  .strict();

export type RenameDeviceDto = z.infer<typeof RenameDeviceSchema>;
