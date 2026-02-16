import z from "zod";

export const DeviceReportSchema = z.object({
  version: z.number().int().nonnegative(),
});

export type DeviceReportDto = z.infer<typeof DeviceReportSchema>;
