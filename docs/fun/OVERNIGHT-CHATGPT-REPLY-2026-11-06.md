# Al-Heb overnight decision — November 6, 2026

My recommendation is a conservative release: hold SPEAK_04, 05 and 08 as candidates; flag the three reviewed letter cartoons for style review; prioritize 15 Sephardi audio repairs; and preserve the existing first-open experience without turning unresolved questions into policy.

I reviewed the six attached images and the three decision documents. No audio was attached, and no canonical character sheet was supplied, so the visual scores below assess observable quality rather than verified character identity. None of the six reviewed images earns an unconditional ≥9.2/10 ship approval.

The following is the complete decision object, suitable for overnight-2026-11-06/chatgpt-decisions-reply.md.

```json
{
  "project": "Al-Heb / ALEF",
  "decision_date": "2026-11-06",
  "reviewer": "ChatGPT",
  "decision_type": "recommendations_only",
  "release_threshold": 9.2,
  "authority": "Advisory; John and MAIN BOT retain approval authority",
  "evidence": {
    "images_reviewed": 6,
    "audio_files_listened": 0,
    "canonical_character_sheet_available": false,
    "documents_reviewed": [
      "CHATGPT-DECISIONS-BRIEF.md",
      "sephardi-repair-queue.md",
      "OPEN-QUESTIONS.md"
    ],
    "limitations": [
      "Six of the requested images were visually available.",
      "Other images are unreviewed, not implicitly approved.",
      "Character identity consistency cannot be verified without the canonical sheet.",
      "Audio queue ratings are inherited from the supplied report, not independently heard.",
      "No production repository or local project directory was accessed."
    ]
  },
  "global_freeze": {
    "ari_face": "unchanged",
    "noa_face": "unchanged",
    "rimon_face": "unchanged",
    "production_wavenet_voices": "unchanged",
    "production_chirp_voices": "unchanged",
    "automatic_audio_replacement": false,
    "generate_assets": false,
    "modify_production": false,
    "spend_money": false,
    "change_settings": false,
    "contact_anyone": false
  },
  "speak_images": {
    "source_directory": "/workspace/shared/al-heb/speak-images-2026-11-05/",
    "candidate_directory": "assets/speak-candidates/",
    "decision_rule": "Ship only after visual review, score at least 9.2, identity verification, and approval.",
    "ship_now": [],
    "candidate_only": [
      "SPEAK_04_table_shabbat.png",
      "SPEAK_05_table_welcome.png",
      "SPEAK_08_street_taxi.png"
    ],
    "unreviewed_hold": [
      "SPEAK_01_street_falafel.png",
      "SPEAK_02_street_bus_ticket.png",
      "SPEAK_03_street_directions.png",
      "SPEAK_06_sanctuary_quiet.png",
      "SPEAK_07_sanctuary_together.png",
      "SPEAK_09_cafe_order.png",
      "SPEAK_10_market_pomegranates.png",
      "SPEAK_11_sound_card.png",
      "SPEAK_12_your_turn.png"
    ],
    "reviewed": [
      {
        "filename": "SPEAK_04_table_shabbat.png",
        "observed_quality_score": 8.7,
        "identity_consistency_score": null,
        "ship_eligible": false,
        "decision": "candidate_only",
        "observations": [
          "Warm Shabbat scene with clear candles, challah and welcoming expressions.",
          "Ari's navy shirt, curly hair, beard and chain agree with the supplied character description.",
          "Noa appears with an orange outer garment rather than the specified olive-green top.",
          "Rimon appears to have only one visible leaf ear.",
          "Rimon's gold calyx is recognizable, but the required two-leaf silhouette is not established."
        ],
        "recommendation": "Keep the current image unchanged in candidates. Do not silently redesign characters."
      },
      {
        "filename": "SPEAK_05_table_welcome.png",
        "observed_quality_score": 8.5,
        "identity_consistency_score": null,
        "ship_eligible": false,
        "decision": "candidate_only",
        "observations": [
          "Welcoming outdoor meal with readable social interaction.",
          "Ari is recognizable by curly hair, beard, navy shirt and silver chain.",
          "Noa's clothing and hairstyle differ from the supplied cast description.",
          "Rimon again presents a one-sided leaf silhouette.",
          "The foreground guest is prominent and can compete with the teaching gesture."
        ],
        "recommendation": "Retain as an alternate illustration, not a locked production asset."
      },
      {
        "filename": "SPEAK_08_street_taxi.png",
        "observed_quality_score": 8.6,
        "identity_consistency_score": null,
        "ship_eligible": false,
        "decision": "candidate_only",
        "observations": [
          "The taxi interaction is immediately understandable.",
          "Ari's appearance and wardrobe are broadly consistent with the supplied description.",
          "Rimon appears with a larger crown-like calyx and an uncertain two-leaf-ear silhouette.",
          "Rimon's framing and placement differ substantially from the tabletop scenes.",
          "Ari is holding a phone rather than obviously demonstrating a spoken taxi phrase."
        ],
        "recommendation": "Keep as a candidate pending Rimon silhouette and lesson-intent review."
      }
    ],
    "unreviewed_scores": null,
    "conditional_recovery": {
      "method": "Review against the authoritative batch01 cast sheet.",
      "requirements": [
        "Preserve Ari, Noa and Rimon's canonical faces.",
        "Preserve Rimon's two olive-green leaf ears and gold calyx.",
        "Preserve character proportions and established wardrobe.",
        "Verify each image directly communicates its speak-game action.",
        "Require at least 9.2/10 before app-asset promotion."
      ],
      "automatic_regeneration": false
    }
  },
  "letter_cartoons": {
    "source_directory": "/workspace/shared/al-heb/letter-cartoons-2026-11-05/images/batch03/",
    "reviewed_count": 3,
    "ship_now": [],
    "style_break_atlas_only": [
      "pe-final-meet.png",
      "qof-meet.png",
      "resh-meet.png"
    ],
    "unreviewed_hold": [
      "shin-meet.png",
      "tav-meet.png",
      "tsadi-final-meet.png",
      "tsadi-meet.png"
    ],
    "reviewed": [
      {
        "filename": "pe-final-meet.png",
        "letter": "ף",
        "observed_quality_score": 8.0,
        "identity_consistency_score": null,
        "decision": "style_break",
        "observations": [
          "Clean frame with a prominent central blue letter-like teaching shape.",
          "The upper-right reference glyph appears to represent final pe.",
          "The illustrated child has a red hoodie and headband rather than the specified Noa wardrobe.",
          "Rimon has an altered eye treatment and an unclear second leaf ear.",
          "The central shape needs glyph-shape validation before teaching use."
        ],
        "atlas_only": true
      },
      {
        "filename": "qof-meet.png",
        "letter": "ק",
        "observed_quality_score": 8.2,
        "identity_consistency_score": null,
        "decision": "style_break",
        "observations": [
          "A memorable tabletop shape mnemonic.",
          "The upper-right Hebrew glyph is recognizable as qof.",
          "The illustrated boy is a different character design, with a blue cap and hoodie.",
          "The blue hoodie includes a religious symbol not part of the specified Ari wardrobe.",
          "Rimon's face and leaf silhouette differ from the supplied sprite description."
        ],
        "atlas_only": true
      },
      {
        "filename": "resh-meet.png",
        "letter": "ר",
        "observed_quality_score": 8.3,
        "identity_consistency_score": null,
        "decision": "style_break",
        "observations": [
          "The bent pipe creates a readable shape mnemonic for resh.",
          "The upper-right Hebrew glyph is clear.",
          "The illustrated girl has a red hoodie and headband, not the specified Noa styling.",
          "Rimon has an altered eye treatment and an uncertain second leaf ear.",
          "The child-and-sprite presentation requires identity consistency review."
        ],
        "atlas_only": true
      }
    ],
    "unreviewed": [
      {
        "filename": "shin-meet.png",
        "score": null,
        "decision": "unreviewed_hold",
        "external_drift_flag": true
      },
      {
        "filename": "tav-meet.png",
        "score": null,
        "decision": "unreviewed_hold",
        "external_drift_flag": false
      },
      {
        "filename": "tsadi-final-meet.png",
        "score": null,
        "decision": "unreviewed_hold",
        "external_drift_flag": true
      },
      {
        "filename": "tsadi-meet.png",
        "score": null,
        "decision": "unreviewed_hold",
        "external_drift_flag": true
      }
    ],
    "atlas_recommendation": {
      "reviewed_flag": "style_break",
      "unreviewed_flag": "review_pending",
      "preserve_existing_images": true,
      "replace_cast": false,
      "regenerate_cast": false,
      "modify_source_assets": false,
      "note": "Unreviewed images must not be labeled independently verified style breaks."
    }
  },
  "sephardi_audio": {
    "queue_type": "triage_only",
    "source": "sephardi-repair-queue.md",
    "scored_count": 129,
    "flagged_count": 93,
    "reported_mean_clarity": 4.93,
    "independently_listened_count": 0,
    "production_replacement_authorized": false,
    "prioritization_basis": [
      "Clarity score of 1/10 in the supplied queue",
      "Wrong-text or distortion flags",
      "Importance to common prayer and beginner learning",
      "Existing suggested action",
      "Risk of changing sacred text without human verification"
    ],
    "top_15": [
      {
        "rank": 1,
        "id": "sephardi:modeh-ani-1",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "pace"],
        "action": "human_listen_first",
        "reason": "Beginner morning prayer; incorrect words should be verified before rendering."
      },
      {
        "rank": 2,
        "id": "sephardi:shema-vahavta-l4",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "pace", "other"],
        "action": "human_listen_first",
        "reason": "Core Shema passage; text accuracy is especially important."
      },
      {
        "rank": 3,
        "id": "sephardi:shema-vahavta-l6",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "pace"],
        "action": "human_listen_first",
        "reason": "Related core passage failure; verify the whole text span."
      },
      {
        "rank": 4,
        "id": "sephardi:kedushah-kadosh",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "distortion", "other"],
        "action": "human_listen_first",
        "reason": "Sacred-register text and distortion both demand review."
      },
      {
        "rank": 5,
        "id": "sephardi:yigdal-l3",
        "reported_clarity": 1,
        "reported_defects": ["distortion", "noise", "wrong_text"],
        "action": "human_listen_first",
        "reason": "Three concrete defect flags, including the queue's rare noise flag."
      },
      {
        "rank": 6,
        "id": "sephardi:kiddush-zachor-l2",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "other"],
        "action": "human_listen_first",
        "reason": "Shabbat text must be checked against the approved exact wording."
      },
      {
        "rank": 7,
        "id": "sephardi:havdalah-hamavdil",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "pace", "other"],
        "action": "human_listen_first",
        "reason": "Important ritual passage with possible wording failure."
      },
      {
        "rank": 8,
        "id": "sephardi:lecha-hashem",
        "reported_clarity": 1,
        "reported_defects": ["distortion", "wrong_text", "pace", "other"],
        "action": "human_listen_first",
        "reason": "Multiple simultaneous defect categories require diagnosis."
      },
      {
        "rank": 9,
        "id": "sephardi:adon-olam-1-l9",
        "reported_clarity": 1,
        "reported_defects": ["distortion", "wrong_text", "other"],
        "action": "human_listen_first",
        "reason": "Text and signal defects should be separated before rerendering."
      },
      {
        "rank": 10,
        "id": "sephardi:adon-olam-1-l7",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "other"],
        "action": "re_render_wavenet_same_id",
        "reason": "Existing queue recommends rerender; verify canonical source text first."
      },
      {
        "rank": 11,
        "id": "sephardi:ashrei-145-16",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "distortion", "other"],
        "action": "re_render_wavenet_same_id",
        "reason": "High-value prayer passage; candidate rerender after source check."
      },
      {
        "rank": 12,
        "id": "sephardi:avot-closing",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "pace", "other"],
        "action": "re_render_wavenet_same_id",
        "reason": "Important prayer closing; new candidate must preserve text."
      },
      {
        "rank": 13,
        "id": "sephardi:etz-chaim",
        "reported_clarity": 1,
        "reported_defects": ["wrong_text", "pace", "other"],
        "action": "re_render_wavenet_same_id",
        "reason": "Known severe queue failure with an existing rerender recommendation."
      },
      {
        "rank": 14,
        "id": "sephardi:hamotzi",
        "reported_clarity": 1,
        "reported_defects": ["other"],
        "action": "re_render_wavenet_same_id",
        "reason": "Short, common blessing; useful candidate for a controlled repair check."
      },
      {
        "rank": 15,
        "id": "sephardi:haftarah-after-l3",
        "reported_clarity": 1,
        "reported_defects": ["other"],
        "action": "re_render_wavenet_same_id",
        "reason": "Existing queue recommends rerender; validate the candidate afterward."
      }
    ],
    "action_counts": {
      "human_listen_first": 9,
      "re_render_wavenet_same_id": 6
    },
    "repair_guardrails": {
      "re_render_status": "recommendation_only",
      "same_id": true,
      "same_voice": true,
      "new_candidate_take_only": true,
      "canonical_text_check_before_render": true,
      "preserve_original_production_mp3": true,
      "independent_human_listening_required": true,
      "prayer_accuracy_review_required": true,
      "minimum_ship_score": 9.2,
      "do_not_inflate_scores": true,
      "do_not_claim_tradition_authenticity_without_evidence": true,
      "john_approval_before_swap": true
    },
    "unselected_flagged_items": "Remain in the existing triage queue without production changes.",
    "ashkenazi": "No independent listening, score or production replacement authorized."
  },
  "first_open": {
    "ship_tonight_recommendations": {
      "denomination": {
        "decision": "Preserve neutral entry experience.",
        "minute_one_word": "אַבָּא",
        "audience_assumption": "none",
        "denomination_preselected": false,
        "denomination_question_required_on_first_open": false,
        "motivation_cards": "Framing only; do not change theological content.",
        "audience_packs": "Pending John approval",
        "transliteration_density": "Preserve existing behaviour.",
        "reversible": true
      },
      "niqqud_fade": {
        "decision": "Keep niqqud visible by default.",
        "automatic_fade_as_locked_pedagogy": false,
        "week_one": "Keep existing vowel-supported beginner presentation.",
        "draft_fade_ux": "Retain as draft, not an approved teaching rule.",
        "learner_control": "Prefer a reversible option after approved implementation.",
        "pending_approval": ["teacher", "John"],
        "reversible": true
      },
      "shabbat_aware": {
        "decision": "Avoid adding new religiously sensitive reminder or reward behaviour.",
        "new_push_reminders": "Do not activate by default.",
        "shabbat_streak_pressure": false,
        "celebration_sharing": "Do not introduce new prompts on Shabbat content.",
        "existing_shabbat_preferences": "Reuse if already implemented.",
        "new_mode_definition": "Pending John decision.",
        "calendar_boundary_assumption": "Do not invent fixed Shabbat hours or holiday rules.",
        "reversible": true
      }
    },
    "day_one_path": {
      "sequence": ["Hear", "Say", "Done"],
      "one_tap_entry": true,
      "first_open_complexity": "minimal",
      "quests_on_first_open": false,
      "identity_tracks_on_first_open": false,
      "advanced_features": "Progressive reveal after completed speak turns.",
      "note": "Preserve existing approved flow rather than implementing new settings."
    },
    "not_authorized_as_policy": [
      "Orthodox-first audience selection",
      "Heritage-only audience selection",
      "Christian Biblical-Hebrew-first selection",
      "Mandatory niqqud fade timing",
      "Unapproved Shabbat detection rules",
      "New automatic streak freezes",
      "New religious celebration or sharing defaults"
    ]
  },
  "pending_approvals": [
    {
      "owner": "John",
      "topic": "Canonical cast and identity acceptance",
      "required_for": "Shipping SPEAK and batch03 assets"
    },
    {
      "owner": "John / MAIN BOT",
      "topic": "Promoting any image above release threshold",
      "required_for": "Production asset promotion"
    },
    {
      "owner": "Hebrew content reviewer",
      "topic": "Glyph shape and mnemonic accuracy",
      "required_for": "Letter teaching cards"
    },
    {
      "owner": "Human audio reviewer",
      "topic": "15-item Sephardi triage listening and text verification",
      "required_for": "Audio candidate approval"
    },
    {
      "owner": "John",
      "topic": "Production audio replacement",
      "required_for": "Any future production audio swap"
    },
    {
      "owner": "John",
      "topic": "Denomination and audience-pack strategy",
      "required_for": "Audience-specific learning routes"
    },
    {
      "owner": "Teachers and John",
      "topic": "Niqqud fade teaching policy",
      "required_for": "Locking automatic fade behaviour"
    },
    {
      "owner": "John",
      "topic": "Shabbat-aware reminders, celebrations and streak policy",
      "required_for": "New Shabbat-specific behaviour"
    }
  ],
  "recommended_release_state": {
    "speak_newly_approved": 0,
    "letter_cartoons_newly_approved": 0,
    "letter_cartoons_style_break_reviewed": 3,
    "audio_repairs_prioritized": 15,
    "audio_production_swaps": 0,
    "existing_approved_content": "Preserve without modification",
    "release_blocker": "New assets require threshold, identity and human approval gates."
  },
  "post_approval_documentation": [
    "Record John's accepted decisions in DECISIONS.",
    "Update the Fun plan lock only after explicit approval.",
    "Update FIRST-OPEN.md only after unresolved choices are settled.",
    "Keep candidate and production states visibly separate."
  ],
  "execution_performed": {
    "production_modified": false,
    "assets_generated": false,
    "audio_generated": false,
    "money_spent": false,
    "settings_changed": false,
    "external_contacts": false
  }
}
```

## Three decisions that matter most

1. Images: The three SPEAK illustrations are attractive and readable, but Rimon's two-leaf silhouette is not reliably maintained. The letter cartoons also introduce child designs that differ from the supplied Ari/Noa descriptions. These are sufficient reasons to withhold new ship approval without discarding the artwork. The style_break recommendation applies only to the three inspected letter cards; the remaining four are unreviewed.

2. Audio: The 15 selected IDs all have reported clarity scores of 1/10. Nine should go to human listening first, while six qualify for proposed candidate rerendering under their original IDs and voices. None of those actions authorizes replacing production audio, and the scores are reported from the queue, not from my own listening.

3. First open: Preserve Hear → Say → Done, the universal אַבָּא starting word, visible beginner niqqud, and neutral audience framing. Do not activate a new Shabbat reminder policy or lock an automatic niqqud-fade policy before the pending approvals.

Overnight release recommendation: Keep existing approved production intact, isolate the reviewed visual exceptions, and prepare the 15-item audio triage list. This protects the character and voice freezes while allowing MAIN BOT to proceed with already-approved work.
