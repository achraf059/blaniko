# Blaniko Venue ID Crosswalk — pre-V3 (OLD) → V3 (CURRENT / canonical)

> Machine-readable companion: [`scripts/venue-id-crosswalk-pre-v3-to-v3.json`](../scripts/venue-id-crosswalk-pre-v3-to-v3.json)

## 1. Why two numbering systems exist
Blaniko venues were first numbered in Achraf's **old Google Sheet** (the pre-V3 list).
When the dataset was finalized into **V3**, a phantom slot was introduced at `BLK-0037`,
which pushed every venue from old `BLK-0037` onward up by one. The result is two parallel
BLK numbering systems for the same physical venues.

The two source tabs both live in `Blaniko_Venues_FINAL_v3.xlsx`:
- **OLD** = tab `BLANIKO 99 VENUES - BACKUP BEFORE...` — 99 venues, contiguous `BLK-0001..BLK-0099`.
- **CURRENT** = tab `Blaniko Official MVP` — 99 venues, `BLK-0001..BLK-0100` with a gap at `BLK-0037`. This tab matches production Supabase.

## 2. Canonical policy
**The CURRENT V3 BLK IDs are the permanent, canonical Blaniko venue identities.**
The OLD Google Sheet IDs are **historical aliases only**. Production is never renumbered back
to the old IDs, and no current `external_id` is ever changed.

## 3. OLD IDs are historical aliases
An old BLK number is meaningful **only** as a lookup key into this crosswalk. It must never be
treated as a current venue identity.

## 4. Divergence point
The numbering diverges at **OLD `BLK-0037` OASIS SPORTS CITY → CURRENT `BLK-0038`**.
Everything before it (OLD `BLK-0001..0036`) keeps the same ID.

## 5. Continuous +1 shift
From the divergence point the shift is a continuous **`current_id = old_id + 1`**, verified
by both venue name and Google Maps identity with **0 mismatches**, all the way through
**OLD `BLK-0099` LE M SPA → CURRENT `BLK-0100`**.

## 6. Reserved gap: CURRENT `BLK-0037`
`BLK-0037` in the CURRENT system is **NO_VENUE / RESERVED_GAP** — a permanent empty slot created
by the renumber. No venue occupies it; never assign one to it.

## 7. Retired CURRENT IDs
Three canonical IDs were retired from the MVP (current canonical count = **96**):
- **`BLK-0020` E-Blue Gaming Center** — permanently closed.
- **`BLK-0044` Étoile Football Académie (EFA)** — removed from MVP (owner/editorial decision).
- **`BLK-0045` FCC football sidi maarouf كرة القدم سيدي معروف** — removed from MVP (editorial decision).

## 8. Never infer identity from an old number
Never infer a venue's identity from an old BLK number without consulting this crosswalk.
Adjacency of BLK numbers does **not** imply the same venue.

## 9. Never reuse retired / gap IDs
`BLK-0020`, `BLK-0037`, `BLK-0044`, and `BLK-0045` are permanently reserved. Do not reuse them for any venue.

## 10. New work uses CURRENT IDs only
All new code, images, Storage objects, outreach, analytics, and partnership records must use
**CURRENT V3 IDs** exclusively.

## Image source archive note
Achraf's historical Desktop source archive `~/Desktop/Pictures for Blaniko ` (trailing
space intentional) was foldered using the **OLD** numbering for the early batch. The early image
manifest (`scripts/venue-image-source-map-early.json`) therefore intentionally maps:
- Desktop `BLK-0001..0036` → current same ID
- Desktop `BLK-0037..0049` → current ID **+1**

This is correct and must **not** be "fixed" by changing current DB IDs. The images already
uploaded to Storage and linked in the `venues` table use the **current** IDs and are correct.
(e.g. Desktop `BLK-0049` = AREA → current `BLK-0050`; Desktop `BLK-0048` = Sbata → current `BLK-0049`.)

## Crosswalk — OLD `BLK-0001..0036` (SAME_ID)
| OLD id | CURRENT id | Venue | Status |
|---|---|---|---|
| BLK-0001 | BLK-0001 | Astro Pool Lounge | SAME_ID |
| BLK-0002 | BLK-0002 | PARIS POOL | SAME_ID |
| BLK-0003 | BLK-0003 | LEVEL Club De Billard | SAME_ID |
| BLK-0004 | BLK-0004 | Blackspin | SAME_ID |
| BLK-0005 | BLK-0005 | Sons of Billiards - Pool Club | SAME_ID |
| BLK-0006 | BLK-0006 | Cavalli Club | SAME_ID |
| BLK-0007 | BLK-0007 | Billardaire | SAME_ID |
| BLK-0008 | BLK-0008 | First Havana Pool | SAME_ID |
| BLK-0009 | BLK-0009 | UK Academy | SAME_ID |
| BLK-0010 | BLK-0010 | Trocadero players | SAME_ID |
| BLK-0011 | BLK-0011 | Spirit Gaming | SAME_ID |
| BLK-0012 | BLK-0012 | Warriors Gaming | SAME_ID |
| BLK-0013 | BLK-0013 | Avatar Gaming | SAME_ID |
| BLK-0014 | BLK-0014 | Lpz gaming | SAME_ID |
| BLK-0015 | BLK-0015 | Temple Gaming | SAME_ID |
| BLK-0016 | BLK-0016 | House of Gaming | SAME_ID |
| BLK-0017 | BLK-0017 | Pixel & Play | SAME_ID |
| BLK-0018 | BLK-0018 | Casa Gaming | SAME_ID |
| BLK-0019 | BLK-0019 | Saw Gaming Club | SAME_ID |
| BLK-0020 | BLK-0020 | E-Blue Gaming Center | RETIRED_CURRENT |
| BLK-0021 | BLK-0021 | squizy | SAME_ID |
| BLK-0022 | BLK-0022 | Totem Kids Coffee (centre de loisirs casablanca ) | SAME_ID |
| BLK-0023 | BLK-0023 | Flokiz | SAME_ID |
| BLK-0024 | BLK-0024 | Au Pays des Rêves by Villa Eden | SAME_ID |
| BLK-0025 | BLK-0025 | Kidz Korner | SAME_ID |
| BLK-0026 | BLK-0026 | Yasmine Fun Park - Ovillage Sidi maarouf | SAME_ID |
| BLK-0027 | BLK-0027 | Quartier Libre, casablanca | SAME_ID |
| BLK-0028 | BLK-0028 | Play Planet | SAME_ID |
| BLK-0029 | BLK-0029 | MK INO Kids Play Café | SAME_ID |
| BLK-0030 | BLK-0030 | Fun Club | SAME_ID |
| BLK-0031 | BLK-0031 | Bisounours Ludothèque | SAME_ID |
| BLK-0032 | BLK-0032 | PADEL PRO | SAME_ID |
| BLK-0033 | BLK-0033 | Padel 4 | SAME_ID |
| BLK-0034 | BLK-0034 | DEPOT 4 - INDOOR PADEL CLUB | SAME_ID |
| BLK-0035 | BLK-0035 | Padel Social Club | SAME_ID |
| BLK-0036 | BLK-0036 | Padel Park by Sindibad | SAME_ID |

## Crosswalk — OLD `BLK-0037..0099` → CURRENT +1 (SHIFTED_ID)
| OLD id | CURRENT id | Venue | Status |
|---|---|---|---|
| BLK-0037 | BLK-0038 | OASIS SPORTS CITY | SHIFTED_ID |
| BLK-0038 | BLK-0039 | Arena Ville Verte | SHIFTED_ID |
| BLK-0039 | BLK-0040 | Laser Game Evolution Casablanca | SHIFTED_ID |
| BLK-0040 | BLK-0041 | EyeDive | SHIFTED_ID |
| BLK-0041 | BLK-0042 | Ginga Sport Casablanca | SHIFTED_ID |
| BLK-0042 | BLK-0043 | City Foot 5 | SHIFTED_ID |
| BLK-0043 | BLK-0044 | Étoile Football Académie (EFA) | RETIRED_CURRENT |
| BLK-0044 | BLK-0045 | FCC football sidi maarouf كرة القدم سيدي معروف | RETIRED_CURRENT |
| BLK-0045 | BLK-0046 | Street 5 Soccer | SHIFTED_ID |
| BLK-0046 | BLK-0047 | CAMPUS SPORT | SHIFTED_ID |
| BLK-0047 | BLK-0048 | Juventus Academy CASABLANCA | SHIFTED_ID |
| BLK-0048 | BLK-0049 | Terrain espace sbata ملعب فضاء سباتة | SHIFTED_ID |
| BLK-0049 | BLK-0050 | AREA SPORTS & EVENTS CENTER | SHIFTED_ID |
| BLK-0050 | BLK-0051 | City Foot Academy | SHIFTED_ID |
| BLK-0051 | BLK-0052 | SAM PARK Morocco | SHIFTED_ID |
| BLK-0052 | BLK-0053 | Anfa Surf School casablanca | SHIFTED_ID |
| BLK-0053 | BLK-0054 | Casablanca Surf coaching | SHIFTED_ID |
| BLK-0054 | BLK-0055 | Waves School Darbouazza Surf Maroc | SHIFTED_ID |
| BLK-0055 | BLK-0056 | Sindibad Karting | SHIFTED_ID |
| BLK-0056 | BLK-0057 | KOJUMP Casablanca | SHIFTED_ID |
| BLK-0057 | BLK-0058 | Sky Jump Casablanca | SHIFTED_ID |
| BLK-0058 | BLK-0059 | Quad Friends , Casablanca, Morocco 🇲🇦 | SHIFTED_ID |
| BLK-0059 | BLK-0060 | The DoorZ Escape room | SHIFTED_ID |
| BLK-0060 | BLK-0061 | Get Out Casablanca - Escape Game | SHIFTED_ID |
| BLK-0061 | BLK-0062 | Plein Ciel Paradise | SHIFTED_ID |
| BLK-0062 | BLK-0063 | Oceanic Club de Casablanca | SHIFTED_ID |
| BLK-0063 | BLK-0064 | COC Tennis | SHIFTED_ID |
| BLK-0064 | BLK-0065 | Tamaris Bowling & Parc De Jeux | SHIFTED_ID |
| BLK-0065 | BLK-0066 | Badr Funtour | SHIFTED_ID |
| BLK-0066 | BLK-0067 | Royal Golf Anfa | SHIFTED_ID |
| BLK-0067 | BLK-0068 | Place Nevada | SHIFTED_ID |
| BLK-0068 | BLK-0069 | Parc Sindibad | SHIFTED_ID |
| BLK-0069 | BLK-0070 | Parc Loupi Land | SHIFTED_ID |
| BLK-0070 | BLK-0071 | Dream World | SHIFTED_ID |
| BLK-0071 | BLK-0072 | Crazy Park | SHIFTED_ID |
| BLK-0072 | BLK-0073 | Yasmine Fun Park - Tachfine | SHIFTED_ID |
| BLK-0073 | BLK-0074 | Tamaris Aquaparc | SHIFTED_ID |
| BLK-0074 | BLK-0075 | Jungle Park | SHIFTED_ID |
| BLK-0075 | BLK-0076 | Pathé Californie Casablanca | SHIFTED_ID |
| BLK-0076 | BLK-0077 | Ain Sebaa Zoo | SHIFTED_ID |
| BLK-0077 | BLK-0078 | Flèche Casablanca de Tir à l'Arc | SHIFTED_ID |
| BLK-0078 | BLK-0079 | Maroc Skydive | SHIFTED_ID |
| BLK-0079 | BLK-0080 | Tahiti Beach Club | SHIFTED_ID |
| BLK-0080 | BLK-0081 | Victoria Academy Pool & Snooker | SHIFTED_ID |
| BLK-0081 | BLK-0082 | PlayerZ Gaming Arena | SHIFTED_ID |
| BLK-0082 | BLK-0083 | TRUE GAMERS Casablanca - Café Gaming | SHIFTED_ID |
| BLK-0083 | BLK-0084 | Kama gaming cafe | SHIFTED_ID |
| BLK-0084 | BLK-0085 | First One Club | SHIFTED_ID |
| BLK-0085 | BLK-0086 | Century Break Academy | SHIFTED_ID |
| BLK-0086 | BLK-0087 | The Break Pool | SHIFTED_ID |
| BLK-0087 | BLK-0088 | Versus Arena Gaming | SHIFTED_ID |
| BLK-0088 | BLK-0089 | Arena Gaming | SHIFTED_ID |
| BLK-0089 | BLK-0090 | Fun Art Place | SHIFTED_ID |
| BLK-0090 | BLK-0091 | Club Alpin Français de Casablanca | SHIFTED_ID |
| BLK-0091 | BLK-0092 | Royal Club Equestre Anfa Casablanca | SHIFTED_ID |
| BLK-0092 | BLK-0093 | Skate Park | SHIFTED_ID |
| BLK-0093 | BLK-0094 | Suan Thaï Casablanca | SHIFTED_ID |
| BLK-0094 | BLK-0095 | Zen Thai Spa | SHIFTED_ID |
| BLK-0095 | BLK-0096 | Spany Flor | SHIFTED_ID |
| BLK-0096 | BLK-0097 | Spa Diva Casablanca | SHIFTED_ID |
| BLK-0097 | BLK-0098 | MAGIC Spa By Hotel Unico | SHIFTED_ID |
| BLK-0098 | BLK-0099 | ZAHA Hammam & Spa Casablanca | SHIFTED_ID |
| BLK-0099 | BLK-0100 | LE M SPA – Hammam & Massage Spa Casablanca | SHIFTED_ID |

## Validation
Generated and validated programmatically from the two workbook tabs:
99 mappings · 99 unique old IDs · 99 unique current IDs · old 0001–0036 map 1:1 ·
old 0037–0099 map +1 · 0 identity mismatches. Anchor checks: OASIS 0037→0038 ·
Street 5 Soccer 0045→0046 · Terrain espace Sbata 0048→0049 · AREA 0049→0050 ·
City Foot Academy 0050→0051 · LE M SPA 0099→0100.
