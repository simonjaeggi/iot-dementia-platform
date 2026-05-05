import z from "zod";

export const gitlabReleaseSchema = z.object({
  tag_name: z.string().min(1),
});