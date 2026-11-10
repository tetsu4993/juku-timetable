import { z } from 'zod';

/** AIで調べる志望校の情報（1日あたりの上限は全体で共通） */
export const RESEARCH_DAILY_LIMIT = 10;

export const ResearchSchema = z.object({
  hensachi: z.string(),
  courses: z.string(),
  exam_schedule: z.string(),
  exam_subjects: z.string(),
  competition: z.string(),
  career_note: z.string(),
});
export type Research = z.infer<typeof ResearchSchema>;

/**
 * AIの最後の回答からJSONを取り出す。
 * ```json … ``` のコードブロックか、本文中の最初の { … } を読む。形が合わなければ null
 */
export function extractResearch(text: string): Research | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    const r = ResearchSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
