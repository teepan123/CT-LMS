import type { Question, Lesson } from "../content/catalog";
import { skills } from "../content/skills";
export function scoreQuiz(questions: Question[], answers: number[]) {
  if (
    answers.length !== questions.length ||
    answers.some(
      (a, i) =>
        !Number.isInteger(a) || a < 0 || a >= questions[i].options.length,
    )
  )
    throw new Error("INVALID_ANSWERS");
  const items = questions.map((q, i) => ({
    id: q.id,
    skill: q.skill,
    concept: q.concept,
    correct: answers[i] === q.correct,
    feedback: q.feedback[answers[i]],
  }));
  return {
    score: items.filter((x) => x.correct).length * 2,
    max: questions.length * 2,
    items,
  };
}
export function scoreGame(lesson: Lesson, answers: number[]) {
  const game = lesson.game;
  if (
    new Set(answers).size !== answers.length ||
    answers.some((a) => !Number.isInteger(a) || a < 0 || a >= game.items.length)
  )
    throw new Error("INVALID_ANSWERS");
  let correct = false;
  if (game.type === "order") {
    const before = (a: number, b: number) =>
      answers.indexOf(a) < answers.indexOf(b);
    correct =
      answers.length === 6 &&
      [
        [3, 1],
        [1, 5],
        [5, 2],
        [4, 2],
        [2, 0],
      ].every(([a, b]) => before(a, b));
  } else
    correct =
      answers.length === game.correct.length &&
      game.correct.every((a) => answers.includes(a));
  return {
    correct,
    feedback: correct
      ? "ทำได้แล้ว! ลองอธิบายว่าเลือกแบบนี้เพราะอะไร"
      : game.feedback,
  };
}
export function componentProfile(
  quizzes: Record<string, number>,
  rubric?: Record<string, { score: number }>,
) {
  return skills.map((skill) => ({
    skill,
    quiz: quizzes[skill] ?? 0,
    final: rubric?.[skill]?.score ?? null,
    total: rubric ? (quizzes[skill] ?? 0) + rubric[skill].score : null,
    max: 25,
  }));
}
