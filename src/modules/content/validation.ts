import { z } from "zod";
import { skills } from "./skills";
import type { Catalog } from "./catalog";
const text = z.string().min(1).max(6000);
const question = z
  .object({
    id: text,
    skill: z.enum(skills),
    concept: text,
    prompt: text,
    options: z.array(text).min(2).max(8),
    correct: z.number().int().nonnegative(),
    feedback: z.array(text),
  })
  .refine(
    (q) =>
      q.correct < q.options.length && q.feedback.length === q.options.length,
    "Question key/feedback must match options",
  );
const lesson = z.object({
  id: z.enum(skills),
  name: text,
  title: text,
  zone: text,
  objective: text,
  challenge: text,
  explanation: text,
  examples: z
    .array(z.object({ title: text, steps: z.array(text).min(1) }))
    .min(2),
  game: z
    .object({
      type: z.enum(["select", "order"]),
      prompt: text,
      items: z.array(text).min(2),
      correct: z.array(z.number().int().nonnegative()),
      feedback: text,
    })
    .refine(
      (g) =>
        new Set(g.correct).size === g.correct.length &&
        g.correct.every((i) => i < g.items.length),
      "Invalid game key",
    ),
  guided: text,
  independent: text,
  reflection: text,
  hints: z.array(text).length(3),
  quiz: z.array(question).length(5),
});
const schema = z
  .object({
    version: text,
    lessons: z.array(lesson).length(4),
    diagnostic: z.array(question).length(4),
    finalData: z
      .array(
        z.tuple([
          text,
          z.number().nonnegative(),
          z.number().nonnegative(),
          z.number().nonnegative(),
        ]),
      )
      .length(7),
    rubric: z
      .array(
        z.object({
          skill: z.enum(skills),
          levels: z
            .array(
              z.object({
                score: z.union([
                  z.literal(0),
                  z.literal(5),
                  z.literal(10),
                  z.literal(15),
                ]),
                text,
              }),
            )
            .length(4),
        }),
      )
      .length(4),
  })
  .refine(
    (c) =>
      c.lessons.every(
        (l, i) => l.id === skills[i] && l.quiz.every((q) => q.skill === l.id),
      ) && new Set(c.rubric.map((r) => r.skill)).size === 4,
    "Catalog must cover each skill exactly once in unlock order",
  );
export function validateCatalog(raw: unknown): Catalog {
  return schema.parse(raw) as Catalog;
}
