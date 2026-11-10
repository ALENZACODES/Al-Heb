# Aleph: 100 NEW jobs for the external drafting assistant, in 6 lanes (items 101 to 200)

This is round 2. Items 1 to 86 of `SIX-LANES.md` are done. Items 87 to 100 of that file (launch writing, privacy and terms drafts, launch checklist) are NOT repeated here. Nothing below overlaps items 1 to 100.

## Ground rules

Paste the "Ground rules" block from the top of `SIX-LANES.md` at the top of every chat. They still apply in full: drafts only, never invent Hebrew facts, mark doubts `?? CHECK`, name the pronunciation tradition on every sound note, original work only, no author/tool/company names, one deliverable per reply ending with `DONE <item#>`.

File names: `lane<N>-<item#>-<short-name>.<ext>`, for example `lane2-101-airport-phrases.csv`. Item numbers run 101 to 200. Save into `docs/drafts/inbox/lane<N>/`. The checker (`node tools/drafts/check_inbox.mjs`) accepts these names.

Two extra rules for round 2:
- Counts in the job lines are targets. If you cannot reach a count without padding or guessing, stop short and say how many you made. A short honest file beats a full one with invented rows.
- Do not repeat words or sentences already in an earlier deliverable of yours; the app's own word list is the source of truth for vocabulary, and the build agents will check your Hebrew against it.

---

## Lane 1: Pictures (16 jobs), needs image generation

Command: "You are the Aleph illustrator. Flat, friendly, simple pictures on a plain light background. No text, no letters, no detailed faces, nothing from any film, game, brand or logo. One idea per picture. Return PNG 1024x1024 and a 512 version."

101. Eight "in Israel" street objects: a bus stop pole, a falafel pita, a market scale, a shared taxi, a pedestrian crossing, a water bottle and cup, a coin purse, a train ticket (no readable text on any of them)
102. Ten kitchen and food objects: bread, olives, a pot, a spoon, a fork, a plate, a glass, an egg, a lemon, a jar
103. Ten body-and-clothes objects: hand, foot, hat, shoe, coat, scarf, glasses, bag, watch, umbrella
104. Ten weather and nature pictures: sun, rain, wind, cloud, snow, tree, flower, hill, sea, star
105. Eight home-room scenes: bedroom, bathroom, balcony, living room, front door, stairs, window view, garden gate
106. Ten family-role pictures with no faces (silhouettes in different heights): mother, father, grandmother, grandfather, sister, brother, baby, teacher, neighbour, friend
107. Twelve animal pictures: dog, cat, bird, fish, horse, cow, sheep, lion, bee, butterfly, donkey, snake
108. Seven day-of-the-week visual cues, one simple symbol each, no text (a calendar page with a different coloured band per day)
109. Ten emotion icons (a simple round face with only eyes and mouth): happy, sad, tired, hungry, surprised, worried, proud, sleepy, cold, hot
110. Eight verb-action pictures using the same neutral stick figure: walk, sit, eat, drink, read, write, open, close
111. Ten shape and colour swatches: a flat colour card for each of ten ordinary colours, plus one object that is usually that colour, drawn beside it
112. Six progress-badge designs (plain geometric, no medals that resemble any brand): first letter, first word, first week, first prayer line, first full lesson, first conversation
113. Twelve vowel-sign pictures: one friendly object per vowel sign family, drawn so the dot or dash position is easy to see (instructions: where the dots sit relative to a plain block letter shape; no real letters needed)
114. Four empty-state illustrations for the app: nothing to review today, you are offline, nothing found, all done for today (same style, calm, no text)
115. A set of 12 small celebratory sparks (confetti, a tick, a star burst) as separate transparent PNGs, no characters
116. A consistent mascot-free "guide hand" icon in five poses: pointing, tapping, holding, waving, thumbs open (a plain line-art hand, not a known emoji set)
This lane's acceptance check: no text, no letters, no brand look, one idea per picture, same style across the set.

## Lane 2: Hebrew text drafting (17 jobs)

Command: "You are an Aleph content drafter. Simple Hebrew a beginner needs. Give every Hebrew line fully pointed, a transliteration for the Israeli/Sephardi reading, the Ashkenazi reading where it differs, and an English gloss. `?? CHECK` for anything uncertain."

117. 60 airport, hotel and passport-desk phrases
118. 50 phrases for a pharmacy and a doctor's reception (symptoms-free: ask for a plaster, ask where it hurts is out; keep to booking, asking for help, saying you need a pharmacy)
119. 40 phrases for phone calls: asking for someone, leaving a message, a wrong number, bad signal
120. 40 phrases for shopping for clothes and shoes: size, colour, try on, too big, too small
121. 40 phrases for restaurants: booking, menu questions, the bill, saying you are full
122. 30 phrases for meeting a host family or neighbours for the first time
123. 30 phrases for asking for repeat, slower speech, and clarification ("what does that word mean")
124. 60 days, months, times of day, and calendar phrases, with common mistakes noted
125. 50 phrases about weather and small talk
126. 40 phrases for hobbies, sport, music and free time
127. 40 sentence frames with a slot ("I would like ___", "Where is ___") with 8 fill-in words each from ordinary vocabulary
128. 30 short stories of 2 to 3 lines each (a day in a life), fully pointed, three levels
129. 40 question-and-answer pairs for speaking practice (the learner hears a question and gives a short answer)
130. 30 phrases for work and study: meetings, emails, classes, deadlines
131. 25 emergency and safety phrases a visitor needs (call, help, lost, stop), in short plain form
132. 40 two-line comparisons that teach one grammar idea each (masculine/feminine, singular/plural, present/past already known forms only; no new tenses beyond what the app teaches)
133. 50 "false friend" pairs: words that look or sound like English words but mean something different

## Lane 3: Audio and speaking scripts (16 jobs)

Command: "You are the Aleph recording director. You write scripts for human voice actors and listeners. You do not generate audio."

134. A short brief for recording numbers 0 to 100 (which forms, masculine and feminine, gaps to leave)
135. A script list for the 22 letters plus 5 final forms as "name, sound, example" triples, read at three speeds
136. A script of 40 minimal-pair listening items (word A, word B, which one is played) with the answer key kept separate
137. A script of 30 "which tradition is this?" listening clips: the same word read in the three traditions, with the answer key
138. Pacing sheet: exact seconds of silence after each type of prompt (word, phrase, sentence, question)
139. A "background noise and room" checklist for home recording
140. A microphone-distance and plosive guide for non-technical voice actors
141. 20 short dictation scripts (the learner hears a word and types it), pointed and unpointed variants
142. 20 "repeat after me" chains that grow word by word, for blessing-length phrases (English meaning only for liturgical text, no rewriting of the Hebrew)
143. A script for reading the alphabet song-free chant: a rhythm drill that is not a song and not a known melody
144. 25 street-sound listening scenes (announcements, ordering at a counter) written as plain dialogue for voice actors, 20 to 30 seconds each
145. A guide for recording tongue-twister-style drills that are original and not copied
146. A review form for a native listener to rate a clip: clarity, speed, tradition accuracy, noise
147. A table of 60 words that are easily mispronounced by English speakers, with the exact articulation tip
148. A 5-day voice-actor session plan so one person can record 400 clips without tiring their voice
149. A short learner-facing guide: "How to listen to Hebrew when it sounds like a blur"

## Lane 4: Book and workbook content (17 jobs)

Command: "You are the Aleph author. Write for nervous adult beginners. Short paragraphs, one idea each, a tiny win at the end of every page. Number every exercise; keep answers in a separate section."

150. Chapter 6 draft: "Your first conversation"
151. Chapter 7 draft: "Numbers, prices and the clock"
152. Chapter 8 draft: "Family and friends"
153. Chapter 9 draft: "Eating out and shopping"
154. Chapter 10 draft: "Getting around"
155. Chapter 11 draft: "Reading short texts"
156. Chapter 12 draft: "Looking ahead: what to learn next" (honest about what is not covered)
157. 40 "spot the difference" letter exercises for look-alike letters, with an answer key
158. 30 syllable-building exercises: build a word from consonant plus vowel cards
159. 25 word-order exercises (put the words in order) with an answer key
160. 20 pointing-restoration exercises (add the missing vowel marks to a pointed-then-stripped word), keys apart
161. A "how to practise 10 minutes a day" habit page with three real examples
162. A one-page "when you feel stuck" page, kind and practical
163. 20 reflection prompts for the end of each chapter
164. A printable progress tracker page (text description plus table layout)
165. A reading-aloud confidence ladder: 10 steps from silent reading to reading with a group
166. A page of "what this book does not teach" with honest limits

## Lane 5: Review, QA and adversarial testing (17 jobs)

Command: "You are the Aleph reviewer. Be hostile and specific. Quote the exact text you are criticising. Rank by how much it would confuse a first-time learner. No praise."

167. Review the Home screen's wording: what would a beginner not understand in the first 10 seconds
168. Review every button label across the app for vague or duplicate verbs
169. Review all error messages for blame, jargon and dead ends
170. Write 50 test cases for the tracing screens (touch, mouse, stylus, fast and slow strokes)
171. Write 50 test cases for the sound and pronunciation screens
172. Write 40 test cases for the speaking and recording screens, including denied microphone and background noise
173. Write 40 test cases for backups, restore and clearing data
174. Write 30 test cases for the three traditions: switching tradition mid-lesson, mid-review and mid-book
175. Write 40 test cases for small phones, tablets and landscape
176. Write 30 test cases for keyboard-only and switch-device use
177. Write 30 test cases for right-to-left text edge cases (mixed Hebrew and English, numbers, punctuation)
178. List 50 ways a learner could misunderstand each of the 12 grammar notes you can find in `docs/`, one line each
179. Design a 30-minute usability test script for 5 testers, with neutral wording that does not hint
180. Draft a bug-report template that a non-technical tester can fill in
181. Compare Aleph's review/repeat system with how a typical flashcard app schedules cards, from public descriptions only; list what is risky to copy
182. Review the book's table of contents for gaps a beginner would hit
183. Write 40 "would I trust this?" questions a cautious adult would ask before giving a free app their time

## Lane 6: Business, partners and growth drafts (16 jobs)

Command: "You are the Aleph partnerships writer. Be honest: no invented numbers, testimonials, awards or user counts. Plain language."

184. A one-page description of Aleph for a synagogue newsletter
185. A one-page description for a Jewish day-school parent newsletter
186. A one-page description for a public library programme
187. A one-page description for a university Hebrew department
188. A one-page description for a travel group visiting Israel
189. A short offer to volunteer native reviewers: what the job is, how long it takes, what they get (credit only if they want it)
190. A call for volunteer voice actors: what is needed, what is not paid, what happens to the recordings, and the permission points to settle in writing (no legal advice, a checklist to take to a lawyer)
191. A sponsor-free funding options memo: grants, donations, free-with-optional-support, paid book only; honest pros and cons of each
192. A pricing-options memo for the book and workbook if sold later (no invented market numbers; list questions to research)
193. A list of 30 questions to research about competitors' public pricing and free tiers
194. A partner-agreement checklist for working with a teacher, a cantor or an illustrator (items to settle in writing, to take to a lawyer)
195. A content-licence inventory table template: asset, source, licence, who to ask, status
196. A community-moderation policy draft if a forum or group is ever opened
197. A plan to collect feedback without collecting personal data
198. A 90-day roadmap draft in three phases with clear stop-or-continue questions at the end of each
199. A "what we will not do" page (no ads, no tracking, no fake urgency) for the credits screen, wording only
200. A one-page honest summary of what is finished, draft and unverified in Aleph, for a possible partner (use only the facts John provides; mark gaps)

---

## How to use this

1. Open six chats, one per lane. Paste the Ground rules from `SIX-LANES.md`, then that lane's Command above, then say "Do item N" in order.
2. Save replies into `docs/drafts/inbox/lane<N>/`. Nowhere else.
3. Tell the build agents a file's name when you want it used. They check it before anything ships.
4. Anything marked `?? CHECK` goes to a native speaker, rabbi or cantor, not to the app.
5. Item 200 and any item that states facts about Aleph can only use facts you give it; do not let it describe the app from guesswork.
