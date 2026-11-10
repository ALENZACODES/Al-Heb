# Torah book artwork audit

John Khan · 7 November 2026

Status: prepared locally; not pushed. The available GitHub commit action has no author override, and local Git authentication is unavailable. No remote branch was changed.

27 missing illustrations were generated: cover, Priestly Blessing opener, and 25 separate mnemonic cards. Their WebP files contain no EXIF, XMP, IPTC, ICC, C2PA or JUMBF chunks. Existing cast artwork was not replaced.

The committed generated book HTML has 156 sections. The accompanying CSV inventories each section, the cover, each newly supplied mnemonic card, and 29 new craft/trope print sections. These are section identifiers, not a claim of newly verified physical PDF pagination. The existing HTML is stale: it points at placeholders for 72 illustrations that now have approved files on GitHub. Rebuilding is required to resolve those references.

| Area | Needed unique pictures | Present on GitHub | Prepared total |
|---|---:|---:|---:|
| Cover | 1 | 0 | 1 |
| Priestly Blessing opener | 1 | 0 | 1 |
| 27 letter pages | 70 | 70 | 70 |
| 27 mnemonic cards | 27 | 2 | 27 |
| Torah craft | 60 | 60 | 60 |
| Trope pictures and hand plates | 40 | 40 | 40 |
| Total | 199 | 172 | 199 |

All 100 existing craft/trope images have both manifest variants on GitHub (200 files checked against the non-truncated tree). The new print plate module connects those images to the book. The image resolver picks up the new 27 files through assets/img/index.json. Letter highlighting and writing diagrams remain vector/text, and the added trope marks are typeset from data/corpus/trope/table.json.

Validation completed: syntax checks for both changed modules; 100 unique plate image references; 29 print sections; 27 output images with zero embedded metadata failures; visual contact-sheet review. Full book rendering, physical pagination, precache regeneration, repository metadata scan and npm test were not run because this is a partial checkout. Do not treat this package as a tested publication.

Source builder blob: 8bcc9c5d3a3bff37e8d7cb4027bfdbb7356e4d35
Generated HTML blob: abc2a6611882fe535b5684fe25604a8665d26480
