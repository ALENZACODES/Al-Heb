/** Original Israel-track dialogues (data/curriculum/dialogues.json). Draft, unreviewed. */
import { loadJSON } from "./data.js";
const data = await loadJSON("data/curriculum/dialogues.json");
export const dialogueMeta = { status: data.status, proofread: data.proofread, needsNativeReview: data.needsNativeReview, note: data.note };
export const dialogues = data.dialogues;
export const dialogueById = Object.fromEntries(dialogues.map((d) => [d.id, d]));
