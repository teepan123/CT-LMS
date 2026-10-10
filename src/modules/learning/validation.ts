import { z } from "zod";
import { skills } from "../content/skills";
export const loginSchema = z.object({
  login: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  code: z.string().max(20).default(""),
});
export const attemptSchema = z
  .object({
    requestId: z.uuid(),
    version: z.string().max(40),
    kind: z.enum([
      "diagnostic",
      "game",
      "guided",
      "independent",
      "quiz",
      "reflection",
      "final_draft",
      "final",
      "course_reflection",
    ]),
    skill: z.enum(skills).optional(),
    answers: z.array(z.number().int().min(0).max(20)).max(20).optional(),
    text: z.string().trim().min(3).max(4000).optional(),
    parts: z
      .object({
        decomposition: z.string().trim().max(4000),
        pattern: z.string().trim().max(4000),
        abstraction: z.string().trim().max(4000),
        algorithm: z.string().trim().max(4000),
      })
      .optional(),
  })
  .superRefine((d, ctx) => {
    const mission = [
      "game",
      "guided",
      "independent",
      "quiz",
      "reflection",
    ].includes(d.kind);
    const objective = ["diagnostic", "game", "quiz"].includes(d.kind);
    const final = d.kind === "final" || d.kind === "final_draft";
    if (mission !== !!d.skill)
      ctx.addIssue({
        code: "custom",
        message: "Mission must match the record kind",
        path: ["skill"],
      });
    if (objective && !d.answers)
      ctx.addIssue({
        code: "custom",
        message: "Answers required",
        path: ["answers"],
      });
    if (final && !d.parts)
      ctx.addIssue({
        code: "custom",
        message: "Four labeled parts required",
        path: ["parts"],
      });
    if (
      d.kind === "final" &&
      d.parts &&
      Object.values(d.parts).some((s) => s.length < 3)
    )
      ctx.addIssue({
        code: "custom",
        message: "Complete all four parts before submitting",
        path: ["parts"],
      });
    if (!objective && !final && !d.text)
      ctx.addIssue({
        code: "custom",
        message: "Written response required",
        path: ["text"],
      });
  });
export type AttemptInput = z.infer<typeof attemptSchema>;
export const hintSchema = z.object({
  requestId: z.uuid(),
  skill: z.enum(skills),
  stage: z.enum(["guided", "independent"]),
  action: z.enum(["question", "hint", "check", "revise"]),
  level: z.number().int().min(1).max(3),
  text: z.string().trim().min(3).max(1500),
});
const criterion = z.object({
  score: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15)]),
  evidence: z.string().trim().min(3).max(2000),
});
export const reviewSchema = z.object({
  requestId: z.uuid(),
  submissionId: z.uuid(),
  rubric: z.object({
    decomposition: criterion,
    pattern: criterion,
    abstraction: criterion,
    algorithm: criterion,
  }),
  feedback: z.string().trim().min(3).max(4000),
});
