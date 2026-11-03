# Stroke-order rules used for the DRAFT stroke data

Status: authored by the build agent, not a native Israeli teacher. No official Israeli per-letter stroke chart was found
(research: the Ministry of Education 2026 document gives only directionality groups). Treat every order below as a proposal.

Rules (also in tools/letters/author_strokes.py):
- R1 A pure horizontal stroke is written right to left (Hebrew writing direction).
- R2 A pure vertical or falling diagonal stroke is written top to bottom.
- R3 An "arc" (top bar that turns down into a right-hand stem: ר ה ח ת, the bar of ב כ פ ך ף, the hook of ג נ) is ONE stroke
  written from the top left across and then down. This follows the MoE "resh-arc" group (ר ה ת ח ק ב) and is the only place R1 is not applied.
- R4 With several strokes: arc/body first, then legs, feet, inner curls, then base bars.
- R5 Research-confirmed print stroke counts are respected: ו כ ר = 1; ב ד ז ס ע צ ם = 2.
- Exceptions from research text: ayin - second stroke comes from the top left, so the right arm is stroke 1; tsadi - second stroke comes from the top right.

Known doubts to put to the teacher: alef (3 strokes here, order unverified); mem and final mem (arc plus base vs separate base); tsadi and
shin (stroke split); whether Israeli school print is written at all beyond recognition (research gap); every cursive shape.
Preview images: docs/letters/preview-print.svg and preview-cursive.svg (start dot is numbered, arrow marks the end).
