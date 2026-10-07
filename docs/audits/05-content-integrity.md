# Audit 05 — Content & Data Integrity

- **Date:** 2026-10-07
- **Scope:** The 5 Pramaan Vault records (`pramaan_vault` + `pramaan_translations` rows in the `supabase_backup/` dump, and `data/seed_pramaan.json`), and every piece of user-facing copy in `src/` and `README.md` that claims verification, truth, immutability or authority. Branch `phase2-auth`, HEAD `0e83ed3`.
- **Mode:** Read-only for the repo. The only file created is this document. The dump was decompressed into a scratch directory outside the repo. Web search and fetch were used only to locate and read sources.
- **Prior audits:** Audits 01-04 in `docs/audits/`. Their "Decisions" sections override the proposals above them. This audit feeds Audit 02 Decision A (interim vault, status column, richer structure deferred) and Audit 02 "Consequences resolved" item 1 (status badge; migration `0005` sets each record's status from this audit).
- **What this audit is not:** It is not a verification. The auditor is an evidence gatherer. Every substantive statement below about what a text says cites a source that was actually retrieved in this session. Where no source could be retrieved, the claim is marked **UNVERIFIED**. The auditor's background knowledge is not treated as evidence. A qualified human reviewer makes every final call, and no record may be marked `reviewed` on the strength of this document.
- **Quotation rule:** At most one short quotation (under 15 words) per source. Everything else is paraphrase with a reference.
- **This document is public** (the repo is public).

---

## Summary

1. All 5 records contain at least one error that a reader could check against the cited source. The most serious is record 1 (33 koṭi): its own cited text (Bṛhadāraṇyaka Upaniṣad 3.9.2) lists Indra and Prajāpati, not the two Aśvins, and the word koṭi does not occur anywhere in that Upaniṣad (K-01, K-02, K-03).
2. Record 5 cites "Ashoka Rock Edict XII" as the source for a Jain doctrine. That edict is an Aśokan inscription about restraint between sects, and it does not mention the Jains or anekānta (K-04). Record 3 credits the Bakhshālī manuscript with rules for division by zero, which come from Brahmagupta (628 CE), and presents a disputed date as settled (K-06).
3. Four of the five "popular myth" fields describe beliefs for which no evidence of wide circulation was found. They read as strawmen. Record 1's myth is real, but the counter-claim the app offers is itself a contested popular claim (K-10, K-16).
4. The app and README call this content "Verified", "Verified Vedic Root", "Verification Engine", "truth core" and "immutable". None of these labels is honest today: no human has reviewed the content, "Vedic" is wrong for 4 of 5 records, and "immutable" contradicts Audit 02 Decision A (K-11, K-17).
5. Recommended statuses for migration `0005`: records 1 and 4 `contested`; records 2, 3 and 5 `draft`. A corrected draft, a list of record-structure requirements, a draft editorial policy and a reviewer brief for each record follow.

---

## Method and limits

### Process

1. I extracted the 5 records from the dump (`COPY public.pramaan_translations`, dump lines 4208-4213; `COPY public.pramaan_vault`, dump lines 4221-4226) and from `data/seed_pramaan.json`.
2. I traced where the records came from in the two Gemini thread PDFs in `docs/context/`, after converting them to text with `pdftotext`.
3. I split each record into separate claims, then looked for the cited primary text first and scholarship second.
4. I searched Sanskrit and Tamil e-texts mechanically. The downloads were legacy-encoded (CSX/ISO-8859) GRETIL files, converted with `iconv` and searched with `grep`. Every negative search ("word X does not occur") names the exact files searched. For *koṭi*, the search used the bare CSX stem `koñ` (= *koṭ-*), which catches every inflection (*koṭi*, *koṭayaḥ*, *koṭeḥ*, *koṭau*, compounds) and would also catch unrelated words beginning *koṭ-*. It found 0 hits, so there was nothing to inspect.
5. Glosses of Sanskrit passages below (BAU 3.9.1-9, ŚB 4.5.7.2, BSS 18.30-35) are my own readings of the e-text, not quoted translations. Each is flagged for the reviewer to confirm.
6. Three scholarly sources (S10, S11, S16) were first read through an automated summariser. Every detail cited from them was then re-checked against the raw text (`pdftotext` of the PDFs; the raw page markdown for S16). Page and note numbers below come from that raw text.

### Sources retrieved

Each source below was retrieved in this session. Later sections cite them by ID.

| ID | Source | What it is | Used for |
|----|--------|------------|----------|
| S1 | GRETIL, *Bṛhadāraṇyaka-Upaniṣad*, Kāṇva recension, with the commentary ascribed to Śaṅkara (Sansknet input; file header says the mūla was checked against Limaye & Vadekar, *Eighteen Principal Upaniṣads* vol. 1, Poona 1958). Files `brupsb1c.txt`-`brupsb6c.txt` at `https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/1_veda/4_upa/` | Primary text, recognised digital edition | Record 1 |
| S2 | GRETIL, *Śatapatha-Brāhmaṇa*, Mādhyandina recension. The GRETIL catalogue credits the input to John Robert Gardner, but the file headers say "Data input by H.S. Ananthanarayana and W. P. Lehman". Files `sb_01_c.txt`-`sb_14_c.txt` at `.../1_veda/2_bra/satapath/`. **`sb_12_c.txt` returned HTTP 404** | Primary text | Record 1 |
| S3 | GRETIL, *Ṛgveda* (input by Van Nooten & Holland, revised by Eichler), `rv_hn01c.txt`-`rv_hn10c.txt` at `.../1_veda/1_sam/1_rv/` | Primary text | Records 1, 2 |
| S4 | Monier-Williams, *Sanskrit-English Dictionary* (1899), entry *koṭi*, printed p. 312 col. 3. Cologne Digital Sanskrit Dictionaries, `https://www.sanskrit-lexicon.uni-koeln.de/scans/csl-apidev/getword.php?dict=mw&key=kowi&input=slp1&output=roman` | Standard reference dictionary | Record 1 |
| S5 | Böhtlingk & Roth, *Sanskrit-Wörterbuch* (PWG), entry *koṭi*, vol. 2 p. 443. Same Cologne service, `dict=pwg` | Standard reference dictionary with citations | Record 1 |
| S6 | Lokesh Chandra, "Thirty Three Koti Divinities", Vivekananda Kendra Institute of Culture website, `https://www.vkic.org/Thirty-Three-Koti-Divinities` (undated) | One scholar's published argument. **Not necessarily the same text as the owner-supplied file** (see limits) | Record 1 |
| S7 | *Padma Purāṇa* 5.39.52 (Pātāla-khaṇḍa), Sanskrit text as shown on `https://www.wisdomlib.org/hinduism/book/padma-purana-sanskrit/d/doc460247.html`. The page does not name the edition its Sanskrit text comes from | Primary-text **lead only**. It must be checked in a printed edition | Record 1 |
| S8 | R. G. Kent, *Old Persian* (1953), texts and translations as transcribed at `https://www.avesta.org/op/op.htm` | Standard edition (secondary transcription) | Record 2 |
| S9 | *Vendīdād* 1.18, tr. J. Darmesteter, *Sacred Books of the East* vol. 4, at `https://www.avesta.org/vendidad/vd1sbe.htm` | Primary text in an old (19th-century) translation | Record 2 |
| S10 | David N. Lorenzen, "La unificación del hinduismo antes de la época colonial", *Estudios de Asia y África* 41(1), 2006, pp. 79-110, `https://www.redalyc.org/pdf/586/58641103.pdf` (in Spanish) | Peer-reviewed scholarship | Record 2 |
| S11 | Plofker, Keller, Hayashi, Montelle & Wujastyk, "The Bakhshālī Manuscript: A Response to the Bodleian Library's Radiocarbon Dating", *History of Science in South Asia* 5(1), 2017, pp. 134-150, `https://journals.library.ualberta.ca/hssa/index.php/hssa/article/view/22` (PDF download `/article/download/22/27`) | Peer-reviewed scholarship | Record 3 |
| S12 | GRETIL, Brahmagupta, *Brāhmasphuṭasiddhānta* (digitised by Takao Hayashi from S. Dvivedin's edition, Benares 1902), `.../1_sanskr/6_sastra/8_jyot/brsphutc.txt` | Primary text, recognised digital edition | Record 3 |
| S13 | Leonardo Pisano, *Liber abaci*, ed. Boncompagni (1857), p. 2. **Retrieved only as quoted in search excerpts** from the Brill volume *The Origin and Significance of Zero* (2024, ch. 10) and the Oxford Research Archive PDF "Italian Zero" | Primary text, quoted at second hand | Record 3 |
| S14 | GRETIL / Project Madurai, *Tolkāppiyam* (input by K. Kalyanasundaram), parts I-III, `.../4_drav/tamil/pm/pm100-1c.txt`-`pm100-3c.txt`. The GRETIL catalogue entry itself reads "Tolkappiyar (100 B.C.?)" | Primary text | Record 4 |
| S15 | GRETIL / Project Madurai, *Puṟanāṉūṟu*, `.../4_drav/tamil/pm/pm057__c.txt` | Primary text | Record 4 |
| S16 | Emmanuel Francis, "Praising the king in Tamil during the Pallava period", in *Bilingual discourse and cross-cultural fertilisation: Sanskrit and Tamil in medieval India*, Institut Français de Pondichéry / EFEO, 2013, `https://books.openedition.org/ifp/2915`, esp. §62 and n. 103 | Peer-reviewed scholarship (university/research press) | Record 4 |
| S17 | Pt. Sukhlal Sanghvi, commentary on Umāsvāti's *Tattvārtha Sūtra*, tr. K. K. Dixit, L. D. Institute of Indology, Ahmedabad, 2000 (scan with OCR text on archive.org, item `vwtn-pt-sukhlaljis-commentary-on-tattvartha-sutra-by-va`) | Scholarly translation and commentary | Record 5 |
| S18 | Romila Thapar, *Aśoka and the Decline of the Mauryas*, rev. ed., OUP 1997, Appendix V (translation of the edicts). Course PDF at `https://projects.mcah.columbia.edu/indianart/pdf/asoka_thapar.pdf` | University-press scholarship | Record 5 |
| S19 | The Pluralism Project (Harvard University), "Anekantavada: The Relativity of Views", `https://pluralism.org/anekantavada-the-relativity-of-views` | University educational resource (not peer-reviewed) | Record 5 |
| S20 | `docs/context/MoolSutra Idea Thread Gemini.pdf` and `docs/context/MoolSutra Coding Thread Gemini.pdf` | Provenance of the current content | All |
| S21 | Popular web pages found by search (e.g. freepressjournal.in, organiser.org, astroved.com, jayanthdev.com, an X/Twitter thread) | Evidence that a belief **circulates**, never evidence that it is true | Myth checks |

### What could not be checked

- **The owner-supplied file `docs/context/lokesh-chandra-33-koti.txt` does not exist.** It is not in the working tree or in git history (`git log --all -- 'docs/context/*'` lists only the two PDFs), and `find` over the home directory found no file with "lokesh", "chandra" or "koti" in its name. S6 is the only Lokesh Chandra text used here, and it may not be the text the owner meant. See Open questions.
- **Śatapatha-Brāhmaṇa book 12** could not be searched (HTTP 404 on GRETIL). The negative search for *koṭi* in S2 covers books 1-11, 13 and 14 only.
- **Not retrieved, so only leads:** Zvelebil's and Takahashi's datings of the Tolkāppiyam; Paul Dundas, *The Jains*; the full text of Lorenzen 1999 (*CSSH* 41(4), pp. 630-659; only its abstract was seen in search results); Arvind Sharma 2002 (*Numen* 49(1)); the Bodleian Library's own 2017 announcement (seen only through news reports; its dates are taken from S11); Lokesh Chandra's Tibetan (*rnam*) and Chinese (*kotei*) evidence; any Aitareya-Brāhmaṇa passage; the Sanskrit text of the *Tattvārtha Sūtra* (only S17's English rendering was searched); exact dates of the individual Darius inscriptions. Everything that depends on these is marked UNVERIFIED.
- **Language competence.** The Sanskrit, Old Persian and Tamil searches here are string matches on transliterated e-texts. They can show that a word occurs or does not occur in a given file. They cannot settle questions of meaning, grammar or dating. Those need the reviewers named in the Reviewer brief.
- **Wisdomlib (S7)** blocks direct fetch and does not name its Sanskrit edition. It is used only to locate a verse that a reviewer must check in print.

---

## Findings table

| ID | Severity | Title | Evidence |
|----|----------|-------|----------|
| K-01 | CRITICAL | Record 1's list of the 33 gods contradicts its own cited source: BAU 3.9.2 gives Indra and Prajāpati, not the two Aśvins | S1 BAU 3.9.2; S2 ŚB 14.6.9.3, 11.6.3.5, 4.5.7.2; dump 4209; `seed_pramaan.json:14` |
| K-02 | CRITICAL | Record 1's "Original Script & Textual Evidence", "त्रयस्त्रिंशत् कोटि", does not occur in the cited text: no form of *koṭi* appears anywhere in the BAU, the searched ŚB books or the Ṛgveda | Stem `koñ`, 0 hits in: S1 all 6 adhyāyas (mūla and commentary); S2 books 1-11, 13, 14; S3 maṇḍalas 1-10. `PramaanCard.tsx:164-175`; dump 4222 |
| K-03 | HIGH | "In Vedic Sanskrit, *koṭi* denotes 'supreme category'" is not supported by the standard dictionaries or the searched Vedic texts; the meaning of *koṭi* in "33 koṭi" is contested | S4 p. 312; S5 vol. 2 p. 443; S3 (0 hits); S6; S7; `seed_pramaan.json:14,16` |
| K-04 | CRITICAL | Record 5 gives "Ashoka Rock Edict XII" as the citation for the Tattvārtha Sūtra: wrong text, wrong tradition, and the edict does not concern anekānta | S18 App. V (12th Major Rock Edict); dump 4226 |
| K-05 | HIGH | Record 5 overstates what the Tattvārtha Sūtra contains, and presents a contested modern reading (tolerance, the "bedrock" of ahiṃsā) as fact | S17 (TS 1.34-35, 5.31, and introduction on Akalaṅka); S19; dump 4213 |
| K-06 | HIGH | Record 3 credits the Bakhshālī MS with division-by-zero rules, which are Brahmagupta's (628 CE), and gives the disputed radiocarbon date as settled | S11; S12 BSS 18.30-35; dump 4211, 4224 |
| K-07 | HIGH | Record 2's citation, "Sapta Sindhu (c. 520 BCE)", conflates a Ṛgvedic phrase with a Darius-era date and names no inscription; the Bisitun list of provinces does not include Hindush, and no retrieved source dates any Hindush inscription to c. 520 BCE | S8 (DB 1.6 vs DNa, DPe, DPh, DSe, DSm); S3; dump 4223 |
| K-08 | MEDIUM | Record 2 places the s>h change in Old Persian only (Avestan shares it) and gives a vague, contested date for religious use of "Hindu" | S9 Vd 1.18; S10 pp. 79-110 |
| K-09 | HIGH | Record 4 presents a contested date ("c. 2nd BCE/CE") and a framing ("independent ... civilizational framework") as settled | S14 catalogue "100 B.C.?"; S16 n. 103; dump 4212, 4225 |
| K-10 | HIGH | Four of the five `popular_myth` fields (records 2-5) describe beliefs for which no evidence of wide circulation was found; they read as strawmen | Searches in "Myth check" under each dossier; dump 4210-4213 |
| K-11 | CRITICAL | The product labels unreviewed, AI-written content "Verified", "Verified Vedic Root", "Verification Engine" and "truth core"; "Vedic" is wrong for 4 of 5 records | `PramaanCard.tsx:100`; `pramaan/page.tsx:69,75`; `page.tsx:16,41,45`; `ComposeSutra.tsx:257,282,401,436,471`; `sutra/page.tsx:74`; README 4, 10, 17, 19, 25, 26, 104 |
| K-12 | HIGH | Fields are misused: `source_citation` holds dates (records 3, 4) or a different text (record 5); `original_script_text` is a single word displayed as "Textual Evidence" (records 2-5) | dump 4222-4226; `PramaanCard.tsx:164-175`; `SutraPostCard.tsx:116` |
| K-13 | MEDIUM | Record 1's citation, "Chapter 3, Verse 9.1", names no recension and garbles the numbering; the passage is BAU (Kāṇva) 3.9.1-2 = ŚB (Mādhyandina) 14.6.9.1-3, and the same dialogue appears at ŚB 11.6.3.4-5 | S1; S2; dump 4222 |
| K-14 | MEDIUM | All content traces to a Gemini chat; the Gemini spec differs from the DB, and the owner's original prompt carries an unsourced claim ("the arabic translated to 33 crore") | S20 Idea thread PDF p. 2; Coding thread PDF p. 1 (seed spec and the sample reply citing the Shatapatha Brahmana) |
| K-15 | MEDIUM | The owner-supplied Lokesh Chandra source is missing; his published essay (S6) gives a different 33-list from the record (Heaven and Earth, not the Aśvins), cites no verse containing *koṭi*, and mixes in political framing | S6; S2 ŚB 4.5.7.2; repo search |
| K-16 | LOW | The "33 types, not 33 crore" counter-claim is itself a widely circulated popular claim; the myth/root format risks swapping one popular claim for another | S21; S6; S7 |
| K-17 | MEDIUM | README "immutable" (lines 10, 17) contradicts Audit 02 OQ 3 and Decision A (versioned records with a status field) | README; Audit 02 Decisions |
| K-18 | LOW | Record 1's summary bullets add interpretive and ideological framing ("not polytheistic population counting") that the cited text does not state | S1 BAU 3.9.3-9; dump 4209 |
| K-19 | LOW | The empty-search hint steers users to the flawed record ("Koti", "Brihadaranyaka", "त्रयस्त्रिंशत्") | `PramaanVaultView.tsx:76` |
| K-20 | INFO | Seed JSON and DB differ only for record 1, in wording; the seed's extra phrase "In Vedic Sanskrit" is the less supported version | `seed_pramaan.json:14,16` vs dump 4209 |

---

## Record dossiers

Status key: **SUPPORTED** (the retrieved source says this) · **PARTLY SUPPORTED** (the core is right, but the wording overreaches or misattributes) · **CONTESTED** (retrieved scholars disagree, or the question is an open interpretation) · **CONTRADICTED** (the retrieved source says otherwise) · **UNSUPPORTED** (a source was looked for and no support was found) · **UNVERIFIED** (no source could be retrieved).

### Record 1 — `33-koti-devatas` (`11111111-…`)

**As stored** (dump 4209, 4222; `data/seed_pramaan.json`, where the differing lines are 14 and 16)

| Field | DB | Seed JSON (differences only) |
|-------|----|------------------------------|
| category | Etymology | same |
| primary_source | Brihadaranyaka Upanishad | same |
| source_citation | Chapter 3, Verse 9.1 | same |
| original_script_text | त्रयस्त्रिंशत् कोटि | same |
| title | 33 Koti Devatas | same |
| popular_myth | Hindus worship 330 million (33 crore) distinct physical gods. | same |
| verified_root | Koti denotes "supreme category/class", mapping to 33 cosmic forces: 8 Vasus, 11 Rudras, 12 Adityas, 2 Ashvins. | "In Vedic Sanskrit, 'Koti' denotes 'supreme category' or 'class'. It maps to 33 cosmic forces: …" |
| bullet 1 | Koti means supreme category, not the number 10 million. | "…not the number 10 million (crore)." |
| bullet 2 | The 33 categories represent universal cosmic and natural forces. | same |
| bullet 3 | It is a system of ancient natural philosophy, not polytheistic population counting. | same |

**Claims**

| # | Claim | Type | What the retrieved source says | Status |
|---|-------|------|--------------------------------|--------|
| 1.1 | The BAU is the primary source for "33 koṭi" | Textual citation | In the Kāṇva BAU, ch. 3 brāhmaṇa 9, Vidagdha Śākalya asks Yājñavalkya how many gods there are. The answers run from 3,306 down to 33, 6, 3, 2, 1½ and 1 (BAU 3.9.1, S1). The parallel Mādhyandina passage is ŚB 14.6.9.1-2 (S2). No form of *koṭi* occurs in any of the six BAU files, mūla or commentary (0 hits for the CSX stem `koñ` = *koṭ-*). None occurs in ŚB books 1-11, 13 or 14 either (S2; book 12 unavailable). The BAU gives 33 gods, not 33 koṭi | CONTRADICTED |
| 1.2 | `original_script_text` "त्रयस्त्रिंशत् कोटि" is textual evidence from the BAU | Textual citation | The BAU's wording at 3.9.2 is *trayastriṃśat tv eva devāḥ* ("but there are only thirty-three gods", S1; my gloss). The phrase *trayastriṃśat-koṭayaḥ* (plural) was found only in a Purāṇic verse, *Padma Purāṇa* 5.39.52, and only on an unverified web edition (S7) | CONTRADICTED for the BAU; the Purāṇic occurrence is UNVERIFIED until checked in print |
| 1.3 | The 33 are 8 Vasus, 11 Rudras, 12 Ādityas and 2 Aśvins | Textual content | BAU 3.9.2 (S1): 8 Vasus, 11 Rudras and 12 Ādityas make 31, and Indra and Prajāpati make 33. Identical at ŚB 14.6.9.3 and ŚB 11.6.3.5 (S2). A different list at ŚB 4.5.7.2 (S2) completes the 33 with Heaven and Earth (*dyāvāpṛthivī*) and counts Prajāpati as the 34th. No retrieved passage completes the 33 with the Aśvins. The Ṛgveda counts the gods as three groups of eleven (RV 1.34.11, 1.139.11, 8.35.3) or as "thirty-three" (RV 1.45.2, 8.28.1) without listing them (S3) | CONTRADICTED (for the cited source) |
| 1.4 | "In Vedic Sanskrit, *koṭi* denotes 'supreme category / class'" | Etymology | MW (S4) gives these senses: curved end, edge or point; highest point, eminence, excellence (cited from Pañcatantra, Ratnāvalī, Sarvadarśanasaṃgraha); a point or side in an argument, an alternative; ten million (cited from Manu, Yājñavalkya, Mahābhārata); and two technical senses. PWG (S5) gives the same range. It also cites the ten-million sense from the Rāmāyaṇa, the Amarakośa and other works, and the "alternative" sense from a commentary. Neither dictionary cites a Vedic occurrence of any sense, and neither lists "category" or "class". A search of all ten Ṛgveda maṇḍalas (S3), the BAU (S1) and ŚB books 1-11, 13, 14 (S2) found no form of the word at all | UNSUPPORTED (as stated) |
| 1.5 | *Koṭi* here means "supreme", not ten million | Etymology / interpretation | **Position A (S6, Lokesh Chandra):** in *trayastriṃśat koṭi* the word means supreme or pre-eminent. He supports this with the Tibetan rendering *rnam* ("class") and an 8th-century Chinese transliteration (both UNVERIFIED here). **Position B (no scholar retrieved):** read as a number, as in the dictionary sense attested in the epics and Manu (S4, S5). The plural *koṭayaḥ* in the *Padma Purāṇa* verse (S7) is grammatically compatible with a count ("33 koṭis"), but that reading is the auditor's observation for a reviewer to test, not evidence. No retrieved peer-reviewed study settles which reading applies, or in which texts | CONTESTED |
| 1.6 | The common belief is "330 million distinct physical gods" | Popular belief | See Myth check | PARTLY SUPPORTED |
| 1.7 | The 33 are "universal cosmic and natural forces" | Interpretation | The BAU itself glosses the groups (S1). The Vasus are fire, earth, wind, atmosphere, sun, sky, moon and stars (3.9.3). The Rudras are the ten breaths in a person plus the self (3.9.4). The Ādityas are the twelve months (3.9.5). Indra is thunder and Prajāpati is the sacrifice (3.9.6). So the text's own gloss is natural phenomena **plus** bodily breaths, months and ritual, not only "cosmic forces". The dialogue then reduces the gods to one, *prāṇa* (breath), which it identifies with brahman (3.9.9). All glosses are mine, for reviewer confirmation | PARTLY SUPPORTED |
| 1.8 | "A system of ancient natural philosophy, not polytheistic population counting" | Interpretation | The BAU says the larger numbers are only the gods' powers or greatnesses (*mahiman*, BAU 3.9.2, S1). That supports "not a head-count of 3,306 gods" for this passage. Whether the 33 make "natural philosophy" rather than worship of gods is an interpretive label. The same text calls them *devāḥ* and ties Prajāpati to sacrifice | CONTESTED (interpretive framing) |

**Citation check**

- "Chapter 3, Verse 9.1" should read **BAU 3.9.1-2 (Kāṇva recension)**: adhyāya 3, brāhmaṇa 9, kaṇḍikās 1-2. The count of 33 is in 3.9.2, not 3.9.1. The current form looks like a verse number but is not one.
- No recension is named. In the Mādhyandina recension, the BAU is part of ŚB book 14, and this passage is **ŚB 14.6.9.1-3** (S2, bracketed numbering "added mechanically", per the file header). The same dialogue also appears at **ŚB 11.6.3.4-5** (S2).
- The Gemini coding thread (S20, Coding thread PDF p. 1) has a sample reply citing the "Shatapatha Brahmana" for the same record, while the DB cites the BAU. Only ŚB 4.5.7.2 gives a list with Heaven and Earth, and it is a different list from the BAU's.

**Myth check.** The phrase "33 crore gods" is widely used and widely discussed. Many popular pages (S21) state the belief only to rebut it, and one (an X/Twitter thread) also claims *trayastriṃśati koṭi* is "mentioned in" the Atharvaveda, Yajurveda and Śatapatha-Brāhmaṇa. That claim was not confirmed for the ŚB books searched (claim 1.1). Lokesh Chandra (S6) also describes the crore belief as popular and unfounded. So the belief is real, not a strawman. Two things were not verified: that people believe in "distinct physical gods" (that wording is the record's), and the owner's prompt's claim that "the arabic translated" *koṭi* as crore (S20, Idea thread PDF p. 2; no source found).

**Scholarly positions**

- **Lokesh Chandra (S6):** *koṭi* = supreme; the 33 follow ŚB 4.5.7.2 (with Heaven and Earth); they are read as symbols of civilisational and political values. The essay also contains contemporary political commentary (on *svarāj* versus *āzādī*, and on who opposed the former term). That is ideological framing, not textual evidence, and should not be carried into a vault record.
- **Lexicographers (S4, S5):** record "ten million" as an established classical sense, record "highest point / eminence" as a separate sense, and record no "category" sense. They do not discuss the "33 koṭi" phrase itself.
- **Not retrieved:** any peer-reviewed study of where the phrase *trayastriṃśat koṭi* is first attested. This is the key gap for the reviewer.

**Recommended status:** `contested`.

**Corrected draft (for a reviewer to start from)**

- *title:* 33 devas — "33 koṭi" and the Upaniṣadic count
- *popular_myth:* "Hinduism has 33 crore (330 million) gods."
- *verified_root* (rename the field; see Copy review): In the Bṛhadāraṇyaka Upaniṣad (Kāṇva 3.9.1-2 = Śatapatha-Brāhmaṇa, Mādhyandina 14.6.9.1-3), Yājñavalkya says the larger counts of gods are only their powers and the gods are really 33: 8 Vasus, 11 Rudras, 12 Ādityas, Indra and Prajāpati. The word *koṭi* does not appear in this passage. Whether *koṭi* in the later phrase "33 koṭi" means "ten million" or "class/supreme" is disputed.
- *summary_bullets:*
  1. The Upaniṣad counts 33 gods and treats bigger numbers as their powers (BAU 3.9.2).
  2. Its 33 are 8 Vasus, 11 Rudras, 12 Ādityas, Indra and Prajāpati; ŚB 4.5.7.2 gives a different list with Heaven and Earth.
  3. Dictionaries record *koṭi* as "ten million" and as "highest point"; scholars disagree on which applies in "33 koṭi".
- *sources:* BAU 3.9.1-9 (Kāṇva; ed. Limaye & Vadekar 1958, via GRETIL); ŚB 14.6.9.1-3, 11.6.3.4-5, 4.5.7.2 (Mādhyandina, via GRETIL); MW p. 312; PWG 2:443; Lokesh Chandra (S6) as one interpretation; Padma Purāṇa 5.39.52 (to be confirmed in print).
- *original_script_text:* त्रयस्त्रिंशत्त्वेव देवाः (BAU 3.9.2), **not** त्रयस्त्रिंशत् कोटि.

### Record 2 — `origin-of-hindu` (`22222222-…`)

**As stored** (dump 4210, 4223; no seed entry)

- category *Epigraphy*; primary_source *Rigveda & Darius I Inscription*; source_citation *Sapta Sindhu (c. 520 BCE)*; original_script_text *सिन्धु*.
- title *Origin of the term "Hindu"*; popular_myth *The term was an exclusive religious dogma in antiquity.*; verified_root *Phonetic shift from the Sanskrit river basin Sindhu to Persian Hind/Hindu. A geographic identifier.*
- bullets: (1) originated as a geographic label for people near the Indus; (2) the S-to-H shift occurred in Old Persian; (3) not used as a religious identifier until much later.

**Claims**

| # | Claim | Type | What the retrieved source says | Status |
|---|-------|------|--------------------------------|--------|
| 2.1 | Sanskrit *Sindhu* is the source of Persian *Hindu* | Etymology | Lorenzen (S10, p. 83) states that the Persian *hindu* derives from *Sindhu*, the Sanskrit name of the Indus. The Old Persian inscriptions write the province as *Hidu-* (the nasal is not written in the script; e.g. *Hidush*, *Hidauv*, *Hiduya*, S8) | SUPPORTED |
| 2.2 | The Ṛgveda has *sapta sindhavaḥ* ("seven rivers") | Textual citation | It occurs repeatedly, e.g. RV 8.24.27, 8.54.4, 8.69.12, 9.66.6, 10.43.3; the accusative *sapta sindhūn* occurs at 1.32.12, 2.12.3, 4.28.1 and elsewhere (S3) | SUPPORTED (but the record cites no verse) |
| 2.3 | A Darius I inscription of c. 520 BCE attests the name | Epigraphy / dating | In Kent's texts and translations (S8), Hidush/Sind appears in Darius's lists of lands in DNa (Naqsh-i Rustam), DPe (Persepolis), DSe and DSm (Susa), and in Xerxes's XPh. DPh (gold and silver plates) uses it as a limit of the realm, and DSf names Sind as a source of ivory. The Bisitun (DB) list of 23 provinces (DB 1.6) has Gandāra but no Hindush (S8). No date for any of these inscriptions was retrieved, so "c. 520 BCE" cannot be matched to an inscription that names Hindush | PARTLY SUPPORTED (the name is attested; "c. 520 BCE" and the unnamed inscription are UNVERIFIED and likely conflated) |
| 2.4 | The s>h shift "occurred in Old Persian" | Historical linguistics | Avestan has the same form: the *Vendīdād* lists the Seven Rivers as the 15th land, and Darmesteter's note gives the Avestan as *Hapta hindava* (Vd 1.18 and n. 42, S9). So the change is not specific to Old Persian. No Iranist handbook was retrieved to state where the change belongs (it is commonly attributed to Proto-Iranian; UNVERIFIED) | PARTLY SUPPORTED |
| 2.5 | Originally a geographic label | Historical usage | Lorenzen (S10, pp. 83-86): the word was first used by outsiders, Darius I among them, for the people of the Indus region and beyond. Its use for a religion came later | SUPPORTED |
| 2.6 | Not a religious identifier "until much later" | Historical usage | Lorenzen (S10) argues that evidence of a Hindu religious identity is present in South Asia from 1400 and probably much earlier (p. 81). His evidence includes Eknāth's *Hindu-Turk Saṃvād* (pp. 99-101); Kabīr, *Bījak* śabda 30 (p. 101); and Vidyāpati's *Kīrtilatā* (early 15th c.), which pairs *hindu* and *turake* with *dhamme*, "religion" (p. 102). He argues against the view that Hinduism was invented or imagined in the 19th century (pp. 81-83; Lorenzen 1999 abstract, seen only in search results). "Much later" is too vague to be checked, and the timing is disputed | CONTESTED |
| 2.7 | `original_script_text` सिन्धु is "textual evidence" | Display | The word is correct Sanskrit, but the field is shown under "Original Script & Textual Evidence" with "Source: Rigveda & Darius I Inscription (Sapta Sindhu (c. 520 BCE))". No text or inscription is quoted, and Darius wrote in Old Persian cuneiform, not Devanagari | Misleading display (K-12) |

**Citation check.** "Sapta Sindhu (c. 520 BCE)" is not a citation. It puts a Ṛgvedic phrase next to a Persian date and names neither a verse nor an inscription. The Gemini spec (S20, Coding thread PDF p. 1) named "Darius I Naqsh-e Rustam Inscription (520 BCE)". DNa is the right kind of source, but no retrieved source dates it to 520 BCE.

**Myth check.** Searches found no evidence that people commonly believe "Hindu" was "an exclusive religious dogma in antiquity". The real public disputes are different. One is when "Hindu" became a religious self-designation (S10). Another is claims that the word is native and ancient: search results show a circulating verse said to come from a "Bṛhaspati Āgama", whose provenance was not traced and is UNVERIFIED. The current `popular_myth` is a **strawman**. Its wording also mislabels the debate, because "dogma" is not what anyone claims.

**Scholarly positions**

- **Geographic origin:** uncontroversial in the retrieved sources (S8, S10).
- **Timing of religious meaning:** pre-colonial, from 1400 and probably earlier (Lorenzen, S10, p. 81), versus a colonial-era construction of "Hinduism" (the position Lorenzen argues against; its proponents were not retrieved). This topic is politically charged. The record should state both positions with attribution and take neither side.

**Recommended status:** `draft`. The core etymology is sound, but the citation, the myth and bullet 3 must be rewritten before review.

**Corrected draft**

- *popular_myth:* Two opposite claims circulate: that "Hindu" is an ancient Sanskrit self-name, and that it is purely a colonial invention. (Each needs one cited example before publication.)
- *root:* The word comes from Sanskrit *Sindhu* (the Indus). In Iranian the initial *s* appears as *h* (where exactly this change belongs is for the reviewer to cite), giving Avestan *Hapta hindava* (Vd 1.18) and Old Persian *Hidu-*, the name of a province in Darius I's land-lists (e.g. DNa, DPe, DSe, DSm; Kent 1953). It first named a region and its people.
- *summary_bullets:*
  1. Ṛgveda: *sapta sindhavaḥ*, "seven rivers" (e.g. RV 8.24.27).
  2. Darius I's inscriptions list *Hidush* as a land of his empire; the Bisitun list does not.
  3. Scholars disagree on when "Hindu" also came to mean a religion; Lorenzen cites 15th-16th-century texts (Vidyāpati, Kabīr, Eknāth).
- *sources:* RV via GRETIL; Kent 1953 (DNa, DPe, DPh, DSe, DSm, DB 1.6); Vd 1.18 (Darmesteter, SBE 4); Lorenzen 2006 (and 1999).
- *category:* "Etymology / Epigraphy". *original_script_text:* सिन्धु, labelled as the Sanskrit source word, not as textual evidence.

### Record 3 — `shunya-zero` (`33333333-…`)

**As stored** (dump 4211, 4224)

- category *Mathematics*; primary_source *Bakhshali Manuscript*; source_citation *c. 3rd-4th Century CE*; original_script_text *शून्य*.
- popular_myth *Zero was only a philosophical void without mathematical operations.*; verified_root *Formalized as Śūnya with operational arithmetic rules and base-10 decimal place-value mechanics.*
- bullets: (1) defined as both void and placeholder; (2) included rules for addition, subtraction and division by zero; (3) transmitted to Europe via Arab mathematicians.

**Claims**

| # | Claim | Type | What the retrieved source says | Status |
|---|-------|------|--------------------------------|--------|
| 3.1 | The Bakhshālī MS dates to the 3rd-4th c. CE | Dating | The Bodleian sampled folios 16, 17 and 33 and obtained three different radiocarbon ranges: 224-383, 680-779 and 885-993 CE (as reported in S11, p. 135). S11 also reports Hayashi's earlier palaeographic estimate: commentary 7th century, manuscript 8th-12th centuries (p. 135). The authors argue that the manuscript was written out as one unified work, so the date of its written zeros is the date of the **latest** folio, not the earliest (S11, p. 138) | CONTESTED |
| 3.2 | Zero served as both void and placeholder | Mathematics | S11 says the MS's zero-dot works as a place-holder, as a symbol for an unknown quantity (p. 141), and as an arithmetical operator, i.e. a number in its own right (p. 145). S12 shows Brahmagupta also equates *śūnya* with *ākāśa*, space or void (BSS 18.32; my reading) | SUPPORTED (S11, S12) |
| 3.3 | Rules for addition, subtraction and division by zero (attributed to the Bakhshālī MS) | Textual attribution | The rules for operating with zero, including division, are in Brahmagupta's *Brāhmasphuṭasiddhānta* (628 CE), ch. 18, vv. 30-35 in Dvivedin's numbering (S12; Colebrooke's numbering is one higher, as noted in the file). BSS 18.34 states that zero divided by zero is zero; 18.35 states that a number divided by zero has zero as its denominator (S12). S11 does not mention division-by-zero rules in the Bakhshālī MS | CONTRADICTED (misattributed). The rules exist, but in a different text, and 0/0 = 0 is not accepted in modern arithmetic |
| 3.4 | A base-10 place-value system | Mathematics | S11 discusses the MS's written zero as a place-holder digit in decimal place-value notation | SUPPORTED |
| 3.5 | Transmitted to Europe via Arab mathematicians | Transmission | Leonardo of Pisa's *Liber abaci* (1202) opens by naming the nine figures of the Indians plus the sign 0, "which in Arabic is called *zephirum*" (S13: ed. Boncompagni 1857 p. 2, seen only as quoted in search excerpts). The al-Khwārizmī link was seen only in Wikipedia and blogs and is UNVERIFIED | PARTLY SUPPORTED |
| 3.6 | `original_script_text` शून्य is from the cited source | Display | The Bakhshālī MS writes zero as a dot (S11 discusses written zeros). The word *śūnya* is attested in BSS 18.30-35 (S12). Whether the Bakhshālī text uses the word *śūnya* was not checked (UNVERIFIED) | UNVERIFIED for the Bakhshālī MS |

**Citation check.** `source_citation` holds a date, not a citation (K-12). It should give the manuscript and its location, folio(s), and an edition. Neither the shelfmark nor an edition was retrieved, so this is UNVERIFIED. The Gemini spec (S20, Coding thread PDF p. 1) also listed the Āryabhaṭīya (499 CE), which the DB dropped.

**Myth check.** No evidence was found that people commonly hold "zero was only a philosophical void without mathematical operations". The search turned up general discussions of *śūnya*/emptiness and zero, not a stated misconception. The real public dispute is about **priority and date**: who was "first", and the Bodleian's 2017 "oldest zero" claim versus S11. The current myth is a **strawman**.

**Scholarly positions**

- **Dating:** earliest-folio reading (Bodleian, via S11) versus latest-folio / scribal-date reading (Plofker, Keller, Hayashi, Montelle, Wujastyk, S11).
- **Zero as a number:** S11 holds that the MS's zeros are numbers in their own right (p. 145). It contrasts this with the Oxford announcement's emphasis on zero as a placeholder (quoted in S11, p. 140).

**Recommended status:** `draft`.

**Corrected draft**

- *popular_myth:* "The Bakhshālī manuscript proves India used zero in the 3rd century." (This version circulated widely after 2017. The Bodleian announcement itself still needs a direct citation.)
- *root:* Indian mathematicians wrote zero as a digit in decimal place-value notation and treated it as a number with arithmetic rules. Brahmagupta's *Brāhmasphuṭasiddhānta* (628 CE, ch. 18) gives rules for adding, subtracting, multiplying and dividing with zero (*śūnya*), some of which differ from modern arithmetic. The Bakhshālī manuscript uses a dot for zero. Its date is disputed: radiocarbon ranges for three folios span 224-993 CE.
- *summary_bullets:*
  1. Zero (*śūnya*) as a number with stated rules: Brahmagupta, BSS 18.30-35 (628 CE).
  2. The Bakhshālī MS writes zero as a dot; its folios carbon-date to different centuries, and scholars dispute what that means for its date.
  3. Fibonacci's *Liber abaci* (1202) taught Europe the "Indian figures" and 0 via Arabic usage.
- *sources:* BSS ed. Dvivedin 1902 (GRETIL); Plofker et al. 2017 (HSSA); *Liber abaci* ed. Boncompagni 1857 p. 2; the Bodleian 2017 announcement (to be retrieved).
- *primary_source:* "Brāhmasphuṭasiddhānta; Bakhshālī Manuscript". *source_citation:* "BSS 18.30-35; Bakhshālī MS (folio TBD)".

### Record 4 — `sangam-tamil` (`44444444-…`)

**As stored** (dump 4212, 4225)

- category *Literature*; primary_source *Tolkāppiyam & Purananuru*; source_citation *c. 2nd BCE/CE*; original_script_text *சங்கம்*.
- popular_myth *Indian ancient thought originated from a single monochromatic geography.*; verified_root *Independent southern grammatical and poetic civilizational framework.*
- bullets: (1) an ancient, independent southern literature; (2) it categorises life into Agam (inner/emotional) and Puram (outer/civic); (3) it shows the pluralistic roots of Indian civilisation.

**Claims**

| # | Claim | Type | What the retrieved source says | Status |
|---|-------|------|--------------------------------|--------|
| 4.1 | The Tolkāppiyam and the Puṟanāṉūṟu date to c. 2nd c. BCE/CE | Dating | The GRETIL catalogue itself gives "Tolkappiyar (100 B.C.?)", with a question mark (S14). Francis (S16, §62) describes the Caṅkam corpus as going back to the first centuries of the first millennium CE. He says the dating is thorny, but the consensus is that the poetry was established before the middle of that millennium. His n. 103 names Tieken (2001) as the exception: Tieken dates the corpus to the 8th-9th centuries, a view that Ferro-Luzzi, Cox, Monius, Wilden and Hart received sceptically or rejected. No retrieved source dates the Tolkāppiyam specifically; individual datings (e.g. Zvelebil's) are UNVERIFIED. One date for two different works, given without attribution, is not supportable | CONTESTED |
| 4.2 | Akam (inner) / Puram (outer) classification | Textual content | The Tolkāppiyam's Poruḷatikāram opens with *Akattiṇaiyiyal* (ch. 1) followed by *Puṟattiṇaiyiyal* (ch. 2) (S14). The Puṟanāṉūṟu file gives each poem's *tiṇai* and *tuṟai* (S15). The akam/puram division is a classification of poetic subject matter in the grammar, not a classification of "life" | PARTLY SUPPORTED |
| 4.3 | An "independent" southern literature or "civilizational framework" | Interpretation | Francis (S16, §62 and n. 103) calls Caṅkam poetry a worldly literature comparable to Sanskrit *kāvya*, and reports Tieken's minority view that it is an adaptation of *kāvya*. Whether to call it "independent" is a framing choice within that debate, not a finding stated in the retrieved source | CONTESTED |
| 4.4 | It shows "pluralistic roots of Indian civilization" | Interpretation | Value judgement; no source | UNSUPPORTED (framing) |
| 4.5 | `original_script_text` சங்கம் (caṅkam) is from the cited texts | Display | A search of the three Tolkāppiyam files found no *caṅkam* (0 hits). The three hits in the Puṟanāṉūṟu file are a poet's name and an editorial note, not the term for the literary academy or corpus (S14, S15). Where the "Sangam" label originates (later tradition) was not retrieved: UNVERIFIED | UNSUPPORTED as textual evidence from these sources |

**Citation check.** `source_citation` is a date, not a citation (K-12). It needs a sūtra/chapter for the Tolkāppiyam and a poem number for the Puṟanāṉūṟu, plus a named edition. Project Madurai is an e-text, so a printed critical edition should also be named (UNVERIFIED which).

**Myth check.** No evidence was found that anyone holds "Indian ancient thought originated from a single monochromatic geography" in those words. "Monochromatic geography" is not a recognisable public claim. The real public debates are about the antiquity of Tamil literature and the Tamil-Sanskrit relationship. Those debates are politically and regionally sensitive, and the record's framing ("independent", "pluralistic") takes a side in them. The current myth is a **strawman**, and its framing is **ideological rather than evidential**.

**Scholarly positions**

- **Dating:** the consensus reported by Francis (S16, §62): established before the middle of the first millennium CE, going back to its first centuries; individual scholars' datings UNVERIFIED. Against it, Tieken's 8th-9th-century dating (S16, n. 103), which the scholars named there rejected.
- **Relationship to Sanskrit literature:** Tieken's view that it adapts *kāvya*, versus the majority treatment of it as an earlier, comparable Tamil literature (S16, §62 and n. 103). The detailed positions need the Tamil reviewer.

**Recommended status:** `contested`.

**Corrected draft**

- *title:* Akam and Puṟam: the early Tamil poetic tradition
- *popular_myth:* Leave empty until a real, cited misconception is identified. See the Editorial policy: a record may have no myth.
- *root:* The Tolkāppiyam, a Tamil grammar, treats poetic subject matter in two divisions, *akam* and *puṟam*, in the first two chapters of its Poruḷatikāram (Akattiṇaiyiyal, Puṟattiṇaiyiyal). The Puṟanāṉūṟu is an anthology of *puṟam* poems; puṟam poetry includes the description and praise of kings (Francis 2013, §62). Most scholars place the Caṅkam poetry before the middle of the first millennium CE; one scholar (Tieken) argues for the 8th-9th centuries. (The reviewer should supply glosses for akam/puṟam and a sourced date for the Tolkāppiyam.)
- *summary_bullets:*
  1. Akam and puṟam are the two divisions of subject matter in Tolkāppiyam, Poruḷatikāram chs. 1-2.
  2. The Puṟanāṉūṟu is an anthology of 400 *puṟam* poems (numbered 1-400 in the Project Madurai text).
  3. Dating and the relationship to Sanskrit literature are debated; see Francis 2013, §62 and n. 103.
- *sources:* Tolkāppiyam and Puṟanāṉūṟu (Project Madurai via GRETIL; printed edition TBD); Francis 2013; Tieken 2001 (not retrieved).
- *original_script_text:* அகம் / புறம் (akam / puṟam), which the cited grammar actually uses as headings, in place of சங்கம்.

### Record 5 — `anekantavada` (`55555555-…`)

**As stored** (dump 4213, 4226)

- category *Philosophy*; primary_source *Tattvartha Sutra*; source_citation *Ashoka Rock Edict XII*; original_script_text *अनेकान्तवाद*.
- popular_myth *Ancient Indian philosophy was rigid, monolithic, and dogmatic.*; verified_root *Established structured philosophical protocols for multi-faceted truth and intellectual tolerance.*
- bullets: (1) literally "not-one-sidedness"; (2) reality is complex and multiple perspectives can hold contextual truth; (3) this formed the bedrock for non-violence (ahiṃsā) in thought and speech.

**Claims**

| # | Claim | Type | What the retrieved source says | Status |
|---|-------|------|--------------------------------|--------|
| 5.1 | Source citation: Aśoka Rock Edict XII | Textual citation | The 12th Major Rock Edict (S18) says the king honours all sects, ascetics and laypeople alike. It asks for restraint in speech: not praising one's own sect or disparaging another's on unsuitable occasions. It asks people to hear one another's doctrines. It names no sect and no doctrine, and nothing in it concerns Jain philosophy or *anekānta*. It is a different text, from a different author, from the cited primary source | CONTRADICTED (wrong source) |
| 5.2 | The Tattvārtha Sūtra is the source of anekāntavāda | Textual attribution | In S17's translation, the Sūtra gives the five *nayas* (standpoints) at 1.34-35. At 5.31 it says a thing has many properties, and a property is foregrounded or not depending on the standpoint taken. Sukhlal's commentary heads 5.31 "Defending the Tenet of Anekanta". The same introduction credits the later commentary *Rājavārttika* (Akalaṅka) with making the anekānta doctrine the key to every discussion (S17, introduction). So the Sūtra contains the perspectival principle, but the developed, named doctrine and its sevenfold predication (*saptabhaṅgī*) are elaborated by later commentators. Whether the word *anekānta* occurs in the Sanskrit sūtras was not checked (UNVERIFIED). S17's numbering may differ from the Digambara recension (UNVERIFIED) | PARTLY SUPPORTED |
| 5.3 | Literally "not-one-sidedness" | Etymology | The Pluralism Project (S19) translates it as "no-one-perspective-ism". Sukhlal/Dixit (S17) gloss *anekānta* as non-extremism | SUPPORTED (as a translation choice) |
| 5.4 | Multiple perspectives can hold contextual truth | Doctrine | S17 (TS 5.31 and its commentary); S19 | SUPPORTED |
| 5.5 | "Intellectual tolerance" was established by the doctrine | Interpretation | S19 places the doctrine in competitive debate between schools, in which the Jain position was held to come closer to the one truth than its rivals. It attributes the tolerance reading to many present-day Jains in the West. That is a modern reading, not the historical function described | CONTESTED |
| 5.6 | "The bedrock for non-violence (Ahimsa) in thought and speech" | Interpretation | No retrieved source states this. S19 mentions ahiṃsā separately as a moral basic, without making anekānta its foundation. No source was retrieved either for or against a derivation of ahiṃsā from anekānta | UNSUPPORTED |
| 5.7 | `original_script_text` अनेकान्तवाद is from the cited source | Display | See 5.2 (UNVERIFIED for the sūtra text) | UNVERIFIED |

**Citation check.** `primary_source` and `source_citation` point to two different texts (K-04). The Gemini spec (S20, Coding thread PDF p. 1) had "Tattvartha Sutra & Ashoka Major Rock Edict XII (250 BCE)". Collapsing it into the DB's two fields made the edict look like a locator inside the Sūtra. The citation should be "Tattvārtha Sūtra 1.34-35 and 5.31 (numbering as in Sukhlal/Dixit 2000; other recensions' numbers to be confirmed by the reviewer)", with a named edition (Sukhlal/Dixit 2000, or Tatia's translation *That Which Is*, which is on archive.org but whose OCR was unusable here).

**Myth check.** No direct statement of "ancient Indian philosophy was rigid, monolithic and dogmatic" as a common belief was retrieved. A search lead points to a Hegelian stereotype that Indian thought lacks individuality and history (seen only in search summaries; UNVERIFIED). That is a different claim. The current myth is a **strawman**. The Aśoka edict was probably cited to support "tolerance", but it is evidence about Aśoka's policy, not about Jain philosophy.

**Scholarly positions**

- **Historical function:** a tool of inter-school debate that claims to include and surpass rival views (S19), versus a principle of tolerance and pluralism (the contemporary reading per S19). Paul Dundas is often cited on this question but was not retrieved (UNVERIFIED).
- **Where the doctrine is formed:** in nuce in the Sūtra's *naya* and 5.31 sūtras, versus systematised by later authors such as Akalaṅka (S17). Siddhasena Divākara and Samantabhadra are often named too (not retrieved; UNVERIFIED).

**Recommended status:** `draft`. The citation is wrong, and two of the three bullets need rewriting before review. Mark the tolerance reading as contested inside the record.

**Corrected draft**

- *popular_myth:* Leave empty until a real, cited misconception is found.
- *root:* *Anekānta* ("non-one-sidedness") is the Jain view that a thing has many aspects and that a claim is true from a stated standpoint (*naya*). The Tattvārtha Sūtra lists the standpoints (1.34-35) and says properties are foregrounded according to the standpoint taken (5.31). Later Jain logicians developed this into a full theory with sevenfold predication.
- *summary_bullets:*
  1. Tattvārtha Sūtra 1.34-35: the standpoints (*naya*); 5.31: properties relative to standpoint.
  2. Later commentators (e.g. Akalaṅka's *Rājavārttika*) made anekānta central to Jain philosophy.
  3. Today it is often read as a basis for tolerance; historically it was also used in debate to show rival views were partial.
- *sources:* TS tr. Sukhlal/Dixit 2000 (and Tatia, *That Which Is*; confirm the recension); Pluralism Project; Dundas (to be retrieved). **Remove** Aśoka Rock Edict XII. If the owner wants a "tolerance in ancient India" record, Edict XII (Thapar 1997, App. V) can anchor that separate record.

---

## App and README copy review

Every place where the product claims verification, truth, immutability or authority. The assessment is against the evidence above: no content has had human expert review, every record has at least one checkable error, and three records rest on contested interpretation. Proposed wording assumes Audit 02 "Consequences resolved" item 1 (status badge on every non-`reviewed` record).

| Location | Current copy | Honest today? | Proposed replacement |
|----------|--------------|---------------|----------------------|
| `README.md:4` | "A verifiable cultural knowledge vault…" | Partly. "Verifiable" (checkable) is an aim, but no record carries checkable citations yet | "A source-linked cultural knowledge vault and micro-publishing platform." |
| `README.md:10` | "grounding public social discourse in verified, immutable etymological and textual citations directly from primary ancient sources" | No. Not verified, not immutable (Audit 02 Decision A), and the citations are wrong in 4 of 5 records | "…linking public discussion to primary sources, with each record's sources, competing readings and review status shown." |
| `README.md:17` | "An immutable repository of verified cultural and linguistic facts." | No | "A versioned collection of source-linked records, each with a review status (draft, under review, reviewed, contested)." |
| `README.md:18` | "Popular Misconception Callout … red alert banners" | Misleading for 4 of 5 records (strawmen) | "Common claim (when a documented one exists), shown with its source." |
| `README.md:19` | "Verified Vedic Root: Emerald-accented textual evidence and Sanskrit root etymology" | No: not verified, and not Vedic for records 2-5 | "What the sources say: cited primary texts and scholarship." |
| `README.md:20` | "Scholar Mode (prominent Indic script and primary verse citations)" | Overclaims: the field holds one word for records 2-5 | "Source view: original-language excerpt with edition and locator." |
| `README.md:25` | "Truth Citation Chips: Attach verified fact citations…" | No | "Source chips: attach a Pramaan record (its review status shows on the chip)." |
| `README.md:26` | "linked verification chips" | No | "linked source chips" |
| `README.md:104` | "PramaanCard.tsx    # Module 1 verification card" | No | "# Pramaan record card" |
| `src/app/page.tsx:16` | "Modular Intelligence & Verification System" | No (also C-14 scaffold copy) | Product tagline without "verification", e.g. "Primary sources for everyday conversations." |
| `src/app/page.tsx:41` | "Verification and validation engine route." | No | "Browse source-linked records." |
| `src/app/page.tsx:45,70` | "Verify Route" | No | "Open" |
| `src/app/page.tsx:32`, `pramaan/page.tsx:68`, `SutraPostCard.tsx:96` | `ShieldCheck` icon (a check-mark-on-shield authority signal) on the module card, the page badge and every attached chip | Visual claim of verification | A neutral book or source icon; reserve check marks for `reviewed` records |
| `src/app/pramaan/page.tsx:69` | "Module 1: Verification Engine (Live Supabase)" | No | "Pramaan: source records" |
| `src/app/pramaan/page.tsx:75` | "Verification and truth core. Search and browse verified root etymologies and Vedic textual citations…" | No | "Search records on words, texts and history. Each record shows its sources and review status. Most records are drafts under review." |
| `src/components/PramaanCard.tsx:89` | "Popular Misconception" (red, AlertCircle) | Only honest when a documented claim exists | "Common claim", rendered only when the field is filled and has a source |
| `src/components/PramaanCard.tsx:100` | "Verified Vedic Root" (green, CheckCircle2) on all records | No. Wrong on both words for most records | "What the sources say", neutral colour; a check icon only when status is `reviewed` |
| `src/components/PramaanCard.tsx:137` | "Scholar Mode" | Overclaims | "Sources" |
| `src/components/PramaanCard.tsx:147` | "Key Takeaways" (Sparkles icon) | Acceptable once the bullets are corrected | Keep |
| `src/components/PramaanCard.tsx:164` | "Original Script & Textual Evidence" | No: single words for records 2-5, and a phrase absent from the cited text for record 1 | "Original-language excerpt", shown only when it is an actual quotation with a locator |
| `src/components/PramaanCard.tsx:175`, `SutraPostCard.tsx:116` | "Source: {primary_source} ({source_citation})" | Currently renders dates and a wrong text as "sources" | Render a structured source list (see requirements); never a date in a locator slot |
| `src/components/ComposeSutra.tsx:257` | "attach verified truth citations" | No | "attach source records" |
| `src/components/ComposeSutra.tsx:282` | "linked with a verified truth citation" | No | "optionally linked to a Pramaan source record" |
| `src/components/ComposeSutra.tsx:401` | "Attach Truth Citation" | No | "Attach Pramaan record" |
| `src/components/ComposeSutra.tsx:436` | "Attach Verified Pramaan" | No | "Attach Pramaan record" (the picker should show each record's status) |
| `src/components/ComposeSutra.tsx:471` | "No verified Pramaan records found." | No (also C-08: a fetch failure shows this message) | "No Pramaan records match." |
| `src/app/sutra/page.tsx:74` | "…linked with verified Pramaan etymological citations." | No | "…optionally linked to Pramaan source records." |
| `src/components/PramaanVaultView.tsx:76` | Search hint: "Koti", "Brihadaranyaka", "त्रयस्त्रिंशत्" | Steers users to the most flawed record | A neutral hint ("Try a word, a text or a script") |
| `src/app/layout.tsx:8-9` | Metadata title/description | No truth claim (C-14 covers scaffold copy) | — |

Not found anywhere in `src/` or `README.md`: the phrases "Truth Engine", "fact-checked", "authoritative" and "proof". The Gemini threads (S20) use "Authenticated Reality", "immutable record" and "truth chip", which are the origin of the current copy.

**Status badge wording** (for Audit 02 consequence 1):

| Status | Badge |
|--------|-------|
| `draft` | "Draft: not yet reviewed by a subject expert" |
| `under_review` | "Under review by [field] reviewer" |
| `contested` | "Contested: scholars disagree; see readings" |
| `reviewed` | "Reviewed by [name], [date]" |

---

## Vault record structure requirements

These are derived from the dossiers, for the design that Audit 02 Decision A deferred. They are requirements only; no SQL.

1. **Multiple sources per record, each structured.** Every error in the dossiers came from squeezing sources into two free-text fields. Each source needs:
   - kind (primary text / inscription / manuscript / dictionary / scholarship / popular evidence);
   - work title, author, and tradition or recension (e.g. Kāṇva vs Mādhyandina; Śvetāmbara vs Digambara numbering);
   - edition or translation, with publisher and year;
   - locator in that edition's own scheme (e.g. adhyāya.brāhmaṇa.kaṇḍikā; folio; sūtra; poem number; inscription siglum and paragraph);
   - a URL to a recognised digital edition, if one exists;
   - the date the source was consulted;
   - an optional concordance to other numberings (BAU 3.9.2 = ŚB 14.6.9.3);
   - an optional short excerpt in the original script plus a transliteration, both within quotation limits.

   A **date must never occupy a locator field** (records 3 and 4).
2. **Source role.** Each source must say what it is used for: attests the claim / contradicts it / is one interpretation / is evidence that a popular belief circulates. That prevents a popular page from looking like an authority (S21) and the Aśoka edict from looking like a locator (record 5).
3. **Claims as first-class items.** A record is a set of claims (e.g. 1.1-1.8), not three bullets. Each claim needs its text, a type (textual citation / etymology / dating / historical event / interpretation / popular belief), links to its sources, and its own status (supported / partly supported / contested / contradicted / unsupported / unverified). The record's overall status is derived from, or checked against, its claims.
4. **Competing readings with attribution.** For a contested claim the record must hold several positions. Each position has a short statement, the holders (named scholars or traditions), the sources for it, and an optional note on its strength. It must be possible to show "no position is endorsed". Records 1, 2, 4 and 5 all need this.
5. **Optional "common claim" section.** The myth field must be **optional**, and when present it must carry at least one source evidencing that the claim circulates (K-10).
6. **Quotation and script fields.** An excerpt field that may only hold an actual quotation tied to a source locator, with its script, language and transliteration. A separate "keyword" field for a headword like सिन्धु, labelled as a word, never as evidence.
7. **Review metadata.** Reviewer identity (name, field of expertise, affiliation if any), review date, the scope of the review (which claims were checked), the reviewer's notes, and a conflict-of-interest declaration. A record can be `reviewed` only if every claim has a reviewer-confirmed status.
8. **Revision history.** Each change creates a new version: who made it, when and why, with a diff of claims and sources, and the version shown at the time a Sutra post attached it. Sutra posts (`attached_pramaan_id`) should keep pointing to the record but be able to show "this record has changed since it was attached".
9. **Provenance.** Who drafted the record and how (human, or AI-assisted with the tool named), separate from who reviewed it. All 5 current records would read "AI-drafted (Gemini), not reviewed".
10. **Corrections log, visible to the public.** Each correction is dated, says what changed and why, and is shown on the record.
11. **Category and language.** Category must allow more than one value (record 2 is etymology and epigraphy). Translations must carry their own review status, because a correct English record can be mistranslated.
12. **Unknowns are explicit.** A field-level "unverified" state, so that missing data (e.g. the Bakhshālī shelfmark) shows as missing rather than being filled by a guess.

---

## Editorial policy draft

*Draft for the owner. Not yet adopted.*

**1. What MoolSutra claims.** A Pramaan record shows what named sources say and how qualified reviewers assess them. It does not certify truth. Labels must match the record's review status.

**2. Acceptable sources**
- **Primary:** texts and inscriptions in recognised editions, either critical editions or standard digital ones such as GRETIL, TITUS, Project Madurai and the Cologne dictionaries. The citation must name the edition, the recension and the locator.
- **Scholarship:** peer-reviewed journals; university or research-institute presses; standard reference works.
- **Popular sources** (news, blogs, social media, Wikipedia) may be cited **only** as evidence that a claim circulates, never as authority. Wikipedia may be used to find sources, never cited for a fact.
- **Translations:** name the translator. When a translation choice matters, flag it.
- **AI-generated text** is never a source. AI may help draft, and that must be disclosed in provenance.

**3. Citations.** Every textual claim carries a locator a reader can check. Numbering differences between recensions or editions are stated. A citation that cannot be checked is marked unverified and not shown as a source.

**4. Contested topics**
- Where qualified scholars disagree, present each serious position, name who holds it, and give its sources. Do not endorse one unless the reviewer can cite a scholarly consensus.
- Religious, regional and political questions (e.g. the meaning and timing of "Hindu", Tamil-Sanskrit relations, Jain tolerance) get neutral, attributed wording. Value terms such as "pluralistic", "independent", "monolithic" or "natural philosophy, not polytheism" are framing. They may appear only as an attributed view.
- A scholar's argument is cited for its textual evidence, not for any political commentary in the same piece.

**5. The "myth vs source" format without strawmen**
- A common-claim section is optional.
- It must quote or closely paraphrase a real, documented claim, and cite at least one source showing that the claim circulates.
- The rebuttal must address that claim as stated, not a weaker version of it.
- If the popular rebuttal is itself unsupported (e.g. "koṭi means category"), the record says so. MoolSutra does not swap one popular claim for another.
- Colour and iconography must not prejudge the result: no red "myth" or green "verified" unless status is `reviewed`.

**6. Corrections**
- Anyone can report an error. Reports are logged.
- A correction creates a new version, shows a dated public note, and notifies the posts that attached the record.
- Substantive corrections send the record back to `under_review`.

**7. Reviewer sign-off.** A reviewer must have relevant expertise (see the Reviewer brief), declare any conflict of interest, and sign off each claim's status, each source's locator and edition, and the presentation of contested positions. Their name and the date are published on the record. One reviewer per field the record touches. A record spanning fields (e.g. record 2: Sanskrit plus Old Persian plus history) needs each field covered.

**8. Statuses**
- `draft`: written, not reviewed.
- `under_review`: assigned to a named reviewer.
- `reviewed`: all claims signed off.
- `contested`: reviewed or assessed as resting on an open scholarly disagreement. The record's positions must then be shown.

Only the owner, as `postgres`, changes status (Audit 02 consequence 2).

---

## Reviewer brief

| Record | Expertise needed | Questions the reviewer must answer |
|--------|------------------|-----------------------------------|
| 1. 33 koṭi | Vedic Sanskrit philologist (Brāhmaṇa/Upaniṣad); ideally also someone who reads Purāṇic Sanskrit, and Tibetan/Chinese Buddhist translation practice for Lokesh Chandra's argument | (a) Confirm BAU (Kāṇva) 3.9.1-2 and ŚB (Mādhyandina) 14.6.9.1-3 and 11.6.3.4-5 in printed critical editions (S1's mūla was checked against Limaye & Vadekar 1958), and confirm the list (Indra + Prajāpati). (b) Where is the phrase *trayastriṃśat koṭi* first attested? Is it in any Vedic text (a popular X/Twitter thread in S21 says YV/AV/ŚB)? Check *Padma Purāṇa* 5.39.52 in a printed edition. (c) In those attestations, does *koṭi* mean "ten million", "class", or "highest/supreme"? Is there lexicographical or grammatical evidence beyond MW/PWG? (d) Assess Lokesh Chandra's Tibetan *rnam* and Chinese *kotei* evidence. (e) Is "33 crore" a recent popular inflation, or traditional usage in some communities? (f) Which list of 33 should the record lead with, given that the BAU and ŚB 4.5.7.2 differ? |
| 2. Hindu | Iranist (Old Persian/Avestan); historian of pre-modern South Asian religion; ideally a Sanskritist for the Ṛgvedic part | (a) Exact sigla, paragraphs and dates of the Darius inscriptions that name *Hidu-*/Sind (DNa, DPe, DPh, DSe, DSf, DSm per Kent; DSf as a source of ivory); is any datable to c. 520 BCE? (b) Where does the s>h change belong (Proto-Iranian?), with a handbook citation? (c) What is the earliest secure attestation of "Hindu" as a self-designation and as a religious designation? Present Lorenzen's position and the colonial-construction position with named proponents. (d) Is there a documented popular claim worth addressing (e.g. the "Bṛhaspati Āgama" verse), and what is its provenance? |
| 3. Zero | Historian of Indian mathematics | (a) The Bakhshālī MS's shelfmark, the critical edition to cite, and the folio(s) with zeros. (b) The current state of the dating debate since 2017, with a direct citation for the Bodleian claim. (c) Does the Bakhshālī text itself state any rules for operating with zero? (d) Confirm BSS 18.30-35 (Dvivedin vs Colebrooke numbering) and how to present 0/0 = 0 accurately. (e) A citable source for the al-Khwārizmī step and for *Liber abaci* p. 2. (f) Is there a documented popular misconception worth a "common claim" section? |
| 4. Sangam | Tamil scholar (Caṅkam literature and Tolkāppiyam) | (a) A defensible date range for the Tolkāppiyam (and its layers) and for the Puṟanāṉūṟu, with named holders (Zvelebil, Takahashi, Tieken, Hart, others). (b) The correct sūtra references for akam/puṟam, and the printed edition to cite. (c) Where does the "Caṅkam/Sangam" label come from (Iṟaiyaṉār Akapporuḷ commentary?), and should the title use it? (d) How should the Tamil-Sanskrit relationship be presented neutrally? (e) Is there a real, documented misconception to address? |
| 5. Anekānta | Jainologist (Sanskrit/Prakrit Jain philosophy) | (a) Śvetāmbara and Digambara sūtra numbers for the *naya* sūtras and for 5.31 (S17 numbering), and the edition to cite. (b) Does the word *anekānta* occur in the sūtra text itself? (c) Which authors systematised anekāntavāda and *syādvāda* (Siddhasena, Samantabhadra, Akalaṅka, others), with dates? (d) How do scholars (e.g. Dundas) assess the "tolerance" reading against its historical polemical use? (e) Is there any textual basis for "bedrock of ahiṃsā"? (f) Should the Aśoka edict appear at all? |

---

## Open questions for the owner

1. **Missing source file.** `docs/context/lokesh-chandra-33-koti.txt` is not in the repo or its history. Was it never committed, or is it elsewhere? Is it the same essay as S6 (vkic.org), or a different work (e.g. a book chapter with fuller citations)?
2. **What migration `0005` loads.** Should `0005` load the **current** text with the recommended statuses (so the live app shows the known errors under a "Draft"/"Contested" badge), the **corrected drafts** above (still unreviewed, so still `draft`/`contested`), or **nothing** until reviewers sign off? K-01, K-02 and K-04 are factual errors against the records' own citations. Publishing them, even with a badge, is the owner's call.
3. **Recommended statuses:** records 1 and 4 `contested`, records 2, 3 and 5 `draft`. Accept?
4. **The "myth" field.** Make it optional and source-required (Editorial policy §5)? That leaves records 4 and 5 with no myth until one is documented.
5. **The `verified_root` field name** is user-visible through the code and implies verification. Rename it in the deferred schema (e.g. `source_summary`)?
6. **Copy changes.** Adopt the proposed replacements in the copy review, including dropping "Vedic" and the green check / red alert treatment until a record is `reviewed`?
7. **Reviewer recruitment.** Five fields of expertise are needed (Vedic Sanskrit, Iranian/epigraphy plus religious history, history of mathematics, Tamil, Jainology). Pay, credit and conflict-of-interest rules are undecided.
8. **AI-assisted drafting.** Disclose AI drafting on each record (structure requirement 9)? This audit recommends yes.
9. **Scope of topics.** Several records touch politically contested identity questions. Does the owner want the vault to cover such topics at launch, given the review burden the Editorial policy implies?

---

## Decisions (owner, 2026-10-07)

These decisions override the proposals, recommendations and open questions above where they conflict. Nothing above this section has been edited.

### Open question answers

1. **Missing source file:** resolved. The owner's source is the same vkic.org essay as S6; no separate file exists. The "missing source" part of K-15 and of "What could not be checked" is closed. The rest of K-15 (a different 33-list, no verse containing *koṭi*, political framing) stands.
2. **What migration `0005` loads:** the corrected drafts from this audit, not the current text and not nothing. They are AI-drafted and unreviewed, so every record carries a status badge. Any common-claim (`popular_myth`) value without an attached source showing that the claim circulates is left empty in `0005`. This applies at least to the corrected drafts of records 2 and 3, which say a cited example is still needed; the corrected drafts of records 4 and 5 already leave it empty.
3. **Statuses:** accepted. Records 1 and 4 `contested`; records 2, 3 and 5 `draft`.
4. **Myth field:** optional. When used, it must carry at least one source showing that the claim circulates (Editorial policy §5).
5. **Field name:** `verified_root` is renamed `source_summary` in the vault schema and in all code.
6. **Copy changes:** every proposed replacement in the App and README copy review is adopted, including dropping "Vedic", the status badge wording, and no green check or red alert treatment unless status is `reviewed`.
7. **Reviewer recruitment:** this is the critical path for the product. No record can honestly leave `draft` or `contested` without a qualified reviewer. The approach (who to contact, credit, conflicts of interest) is decided in Audit 10.
8. **AI-assisted drafting:** disclosed on every record (structure requirement 9). All 5 current records read "AI-drafted, not reviewed".
9. **Scope of contested topics at launch:** decided in Audit 10, together with reviewer recruitment. Launch topics should be limited to those for which a reviewer can actually be found.

### Additional decisions

- **A. Record structure:** requirements 1-12 are accepted as the target design. The minimum subset built for launch is decided after Audit 10.
- **B. Editorial policy:** the draft is adopted as the working policy, to be finalised after Audit 10. Its "Not yet adopted" note above is superseded.

### Impact on the fix phase

Changes to the Audit 04 fix-phase order, as already revised by Audit 04's Decisions. Steps still run strictly one at a time, in order (Audit 04 Decision B).

| Step | Change | Decision |
|------|--------|----------|
| Step 1 | The `CLAUDE.md` written here carries the Audit 05 rules: this document's Editorial policy is the working policy; the field is `source_summary`, never `verified_root`; vault content is never labelled "verified", "verification", "truth", "Vedic" (unless a reviewer confirms it for that record) or "immutable"; check icons, green "verified" and red "myth" styling appear only for `reviewed` records; a `popular_myth` value is never added without a source showing it circulates; every record shows its provenance | OQ 4, 5, 6, 8; B |
| Step 3 | Migrations 0001-0004 name the column `source_summary` (it holds what is `verified_root` in `pramaan_translations` in the dump). Update Audit 02's SQL, the pgTAP tests and any constraint or index names that mention the old name | OQ 5 |
| Step 3 | `popular_myth` must be nullable; if Audit 02's SQL makes it `NOT NULL`, change that. The interim schema has no field to attach a source to a common claim, so under OQ 2 and OQ 4 every `popular_myth` stays empty, record 1's included. Record 1's can be filled only if step 3 adds a place for its circulation source and a specific page is chosen (S21 names sites, not pages). Adding that field is an owner choice at step 3; it is not decided here | OQ 2, OQ 4, A |
| Step 3 | Provenance (OQ 8) needs a home. The interim schema has no provenance field. Either add a column in step 3, set by `0005` and `seed.sql`, or render one fixed line for every record in step 6. With requirement 9 accepted as the target, a column is the closer fit. Owner choice at step 3 | OQ 8, A |
| Step 3 | `supabase/seed.sql` no longer loads "the 5 existing records, all `status = 'draft'`" (Audit 04 OQ 2). It loads the same content as `0005`: the corrected drafts, records 1 and 4 `contested`, records 2, 3 and 5 `draft`, empty `popular_myth`, fixed UUIDs `11111111-…` to `55555555-…` unchanged. Local tests then cover both badge states. It stays local only | OQ 2, OQ 3 |
| Step 4 | Generated types, the `src/lib/data/pramaan.ts` mapper and its tests use `source_summary`, with no alias back to `verified_root`. The mapper treats `popular_myth` as nullable. Move `StatusBadge` into this step, next to `Notice` and `EmptyState`, because the step 5 picker needs it and steps run in order | OQ 5, OQ 6; Audit 04 B |
| Step 5 | Composer and picker copy follows the copy review (`ComposeSutra.tsx:257, 282, 401, 436, 471`). `PramaanPicker` shows each record's status badge. No other change | OQ 6 |
| Step 6 | Apply the copy review rows for `src/`: `page.tsx:16, 32, 41, 45, 70`; `pramaan/page.tsx:68, 69, 75`; `PramaanCard.tsx:89, 100, 137, 164, 175`; `SutraPostCard.tsx:96, 116`; `sutra/page.tsx:74`; `PramaanVaultView.tsx:76` (K-19). In particular: a neutral source icon in place of `ShieldCheck`; "Common claim" renders only when `popular_myth` is filled (and, once a source field exists, has a source); "What the sources say" in a neutral colour, with a check icon only for `reviewed`; "Original-language excerpt" only for a real quotation; never a date in the locator slot. The structured source list (`PramaanCard.tsx:175`) needs requirement 1, so until the launch subset is decided the card shows `primary_source` and `source_citation` as `0005` fills them | OQ 6, A |
| Step 6 | Status badges use the wording in this audit, on cards, the picker and the feed chip. Only `draft` and `contested` occur at launch. The `under_review` and `reviewed` badges need a reviewer's name, field and date (requirement 7), which the interim schema lacks; do not ship them with placeholder text | OQ 3, OQ 6, OQ 7 |
| Step 6 | Every record card shows "AI-drafted, not reviewed" (from the provenance column or the fixed line chosen at step 3) | OQ 8 |
| Step 6 | Revises Audit 04's step 6 row on C-14: the copy review's wording for `page.tsx:16, 41, 45, 70` is now owner-approved and is applied here. The rest of the scaffold copy (C-14) still waits for the owner's text after Audit 10 | OQ 6 |
| Step 9 | The README update applies the copy review rows for `README.md:4, 10, 17, 18, 19, 20, 25, 26, 104`, which removes "immutable" (K-17), "verified" and "Vedic" | OQ 6 |
| Step 9 | Launch gate: no record is marked `reviewed` or `under_review` without a recruited, qualified reviewer (Audit 10). If Audit 10 limits launch topics, `0005` loads only the records in scope | OQ 7, OQ 9 |
| Step 10 | `0005` contents are now set: the corrected drafts, with the statuses in OQ 3 and empty `popular_myth`. Title, `source_summary`, bullets and `original_script_text` come from each corrected draft and stay as stored where the draft is silent (for example record 1 त्रयस्त्रिंशत्त्वेव देवाः, record 4 அகம் / புறம்). `primary_source` and `source_citation` come from the draft's sources and locators: never a date, and record 5 without Aśoka Rock Edict XII. Notes addressed to the reviewer inside the drafts (for example record 2's "for the reviewer to cite", record 4's "The reviewer should supply glosses …") are not loaded as public text. Caveats telling the reader something is unconfirmed (for example "to be confirmed in print") stay. `0005` is not blocked on reviewer sign-off | OQ 2, OQ 3, OQ 4 |
| Step 10 | These decisions do not move `0005` out of step 10. When it lands, the vault rows leave `seed.sql` (Audit 04) and `data/seed_pramaan.json` is deleted. That file still uses `verified_root` and the old text; it is deleted, not renamed | OQ 2, OQ 5 |
| Step 10 | The vault versioning and richer-structure design targets requirements 1-12, but the launch subset, and so the scope of this design work, waits for Audit 10 | A |
