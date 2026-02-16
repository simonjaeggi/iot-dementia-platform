import { z } from "zod";

export const SensorSchema = z.object({
  id: z.string(),                 
  type: z.string(),               
  pin: z.number().optional(),     
  address: z.string().optional(), 
  bus: z.number().optional()      
});

export const DeviceConfigSchema = z.object({
  version: z.number(),            
  publishIntervalMs: z.number(),  
  sensors: z.array(SensorSchema)  
});

export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;
