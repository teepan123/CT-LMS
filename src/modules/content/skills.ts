export const skills = [
  "decomposition",
  "pattern",
  "abstraction",
  "algorithm",
] as const;
export type Skill = (typeof skills)[number];
export const labels: Record<Skill, string> = {
  decomposition: "การแยกย่อยปัญหา",
  pattern: "การหารูปแบบ",
  abstraction: "การคิดเชิงนามธรรม",
  algorithm: "การออกแบบขั้นตอนวิธี",
};
