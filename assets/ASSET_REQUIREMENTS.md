# Premium Asset Requirements

This document is the practical shopping/upload list for premium audio and visual assets. Do not add any third-party file unless its source and license are recorded in `assets/ATTRIBUTIONS.md`.

## Current download status

Shell downloads are currently unreliable in this environment. Safe checks against `https://example.com` failed with a proxy/CONNECT `403`, and Node `fetch` failed as well. Because of that, the safest workflow is for a human to choose/download files manually, verify the license, upload them to this repository, and record attribution before merging.

## Sound files to upload

The game automatically looks for the following files when a matching sound event plays. If a file is missing, muted, blocked by the browser, or fails to decode, the game falls back to a quiet generated tone and continues.

| Sound | Required file path | Format | Max size | Max duration | Suggested volume target | Plays when | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dice roll | `assets/sounds/dice-roll.mp3` | MP3, 44.1 kHz or 48 kHz, stereo or mono | 150 KB | 0.6–1.2 sec | Quiet/medium-low; no sharp peaks | Dice roll starts and normal roll reveal finishes | Generated `roll` tone |
| Checker move | `assets/sounds/checker-move.mp3` | MP3, mono is fine | 80 KB | 0.12–0.35 sec | Quiet; must tolerate frequent repetition | A checker finishes a non-hit move animation | Generated `move` tone |
| Checker hit | `assets/sounds/checker-hit.mp3` | MP3, mono is fine | 90 KB | 0.15–0.45 sec | Slightly louder than move, not aggressive | A checker finishes a hit/capture animation | Generated `hit` tone |
| Special roll | `assets/sounds/special-roll.mp3` | MP3 | 140 KB | 0.4–1.0 sec | Quiet sparkle/energy, not arcade | A roll reveal is 4–5, 5–6, or any double | Generated `special` tone |
| Win | `assets/sounds/win.mp3` | MP3 | 200 KB | 0.8–1.8 sec | Elegant, short success cue; no loud fanfare | Victory banner/game win | Generated `win` tone |
| Last Chance / Jerusalem | `assets/sounds/last-chance.mp3` | MP3 | 180 KB | 0.7–1.6 sec | Tense and elegant; not scary/casino | Jerusalem / Last Chance roll starts, including remote view | Generated `lastChance` tone |

### Sound design direction

- Premium, clean, warm, and restrained.
- Avoid casino slot-machine sounds, cartoon sounds, childish arcade sounds, harsh alarms, and long musical stingers.
- Normalize conservatively. Short UI/game SFX should feel quieter than the player's expectation, not louder.
- Prefer dry sounds or very subtle room tone/reverb so repeated gameplay stays pleasant.

## Current model status

The repository currently contains `assets/models/dice-premium.glb` and `assets/models/backgammon-board.glb`. They are intentionally not wired into the live game yet.

- `assets/models/dice-premium.glb`: GLB 2.0, about 18.3 MB, with separate dice-style meshes/materials named plastic, metal, bone, and marble; no built-in animations. This is useful for a future dice-style selector or WebGL prototype, but it is too large/risky to make mandatory without a WebGL fallback.
- `assets/models/backgammon-board.glb`: GLB 2.0, about 13.9 MB, with board, checkers, dice, hinge, wood, and fabric materials; no built-in animations. It should be treated as a visual reference/prototype until the 24 point hit zones can be mapped and the included checkers/dice can be hidden or separated.

## Visual assets to find later

Do not replace visuals until the chosen direction is reviewed on desktop and mobile. CSS/SVG is likely safer than bitmap textures for dice and checkers because it keeps edges sharp, reduces download size, and avoids click-zone issues.

| Visual | Best format now | Recommended dimensions | File size limit | Where used | Risks / notes |
| --- | --- | --- | --- | --- | --- |
| Premium dice visual | SVG or CSS first; PNG/WebP only if truly better | SVG scalable; bitmap at least 256×256 per die face at 2x | SVG < 25 KB total, bitmap < 120 KB total | `.die` elements inside `#diceDock` | Must preserve die size, click target, RTL layout, roll animation, and mobile readability |
| Premium checker/piece visual | CSS/SVG first; PNG/WebP sprite only if reviewed | SVG scalable; bitmap at least 192×192 per color at 2x | SVG < 30 KB total, bitmap < 150 KB total | `.piece` and `.floatingPiece` | Must not change board coordinates, stacking, hit animation, or tap targets |
| Board/felt/wood texture | Subtle WebP/PNG only after review; CSS gradient is currently safer | 1024×576 or 1536×864 max; seamless if possible | < 250 KB | `.board`, `.boardInner`, optional background | Can look cheap, reduce contrast, hurt mobile performance, or obscure points/checkers |

## Recommended next visual direction

1. Start with SVG/CSS dice and checker refinements.
2. Add real image textures only if they are subtle, CC0/commercial-safe, compressed, and tested on mobile.
3. User-provided or AI-generated assets can be considered if ownership and usage rights are clear and documented.

## Safe sources and licenses

- Freesound: use only CC0 or CC BY sounds. Avoid CC BY-NC, Sampling+, unclear uploads, and sounds that resemble copyrighted packs/media. CC BY requires attribution.
- Kenney: game assets are generally Public Domain / CC0 on Kenney asset pages, attribution not required but appreciated. Still record the pack URL and license in `ATTRIBUTIONS.md`.
- OpenGameArt: use only assets with a clearly safe license. Prefer CC0 or CC BY. Avoid NonCommercial, NoDerivatives, GPL/LGPL, and ShareAlike unless the consequences are explicitly accepted.
- User-provided assets: acceptable if the user provides written source/license proof or confirms the assets were created specifically for this project.
- AI-generated assets: acceptable only when generated for this project with a tool/license that permits commercial use, and when the asset does not imitate a protected brand, known game, living artist style, or copyrighted work.
