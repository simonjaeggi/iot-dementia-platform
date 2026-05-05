import { z } from "zod";
import { MacAddressSchema } from "../../device/zod/mac-address.schema";

export const CreateLocationBeaconSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Display name is required.")
      .max(255, "Display name cannot be longer than 255 characters."),
    macIdentifier: MacAddressSchema,
  })
  .strict();

export type CreateLocationBeaconDto = z.infer<
  typeof CreateLocationBeaconSchema
>;
