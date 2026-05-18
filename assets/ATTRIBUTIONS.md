# Asset Attributions

This project includes user-provided audio assets with attribution recorded below.

## Current repository assets

| File | Source | License | Attribution required | Notes |
| --- | --- | --- | --- | --- |
| `assets/sounds/dice-roll-1.mp3` | [Freesound sound 538960](https://freesound.org/s/538960/) by VM83 | Attribution / CC BY | Yes | Original audio contained 3 dice throws. Before each throw there was shaking/mixing sound. This output was trimmed to keep only the clean dice landing / roll impact; small fade in/out and volume normalization were applied. |
| `assets/sounds/dice-roll-2.mp3` | [Freesound sound 538960](https://freesound.org/s/538960/) by VM83 | Attribution / CC BY | Yes | Original audio contained 3 dice throws. Before each throw there was shaking/mixing sound. This output was trimmed to keep only the clean dice landing / roll impact; small fade in/out and volume normalization were applied. |
| `assets/sounds/dice-roll-3.mp3` | [Freesound sound 538960](https://freesound.org/s/538960/) by VM83 | Attribution / CC BY | Yes | Original audio contained 3 dice throws. Before each throw there was shaking/mixing sound. This output was trimmed to keep only the clean dice landing / roll impact; small fade in/out and volume normalization were applied. |
| `assets/sounds/dice-roll.mp3` | [Freesound sound 538960](https://freesound.org/s/538960/) by VM83 | Attribution / CC BY | Yes | Kept as the dice-roll fallback. Original audio contained 3 dice throws. Before each throw there was shaking/mixing sound. This output was trimmed to keep only the clean dice landing / roll impact; small fade in/out and volume normalization were applied. |
| `assets/sounds/.gitkeep` | Project placeholder | N/A | No | Keeps the future sound folder in Git. |
| `assets/images/.gitkeep` | Project placeholder | N/A | No | Keeps the future image folder in Git. |
| `assets/models/dice-premium.glb` | ["Dices"](https://skfb.ly/oKKox) by mvision3d | [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/) | Yes | Uploaded GLB asset inspected for future premium dice styles. Not yet rendered in-game; current PR keeps CSS/DOM dice as the active fallback. |
| `assets/models/backgammon-board.glb` | ["Backgammon"](https://skfb.ly/6zGsY) by tridiart | [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/) | Yes | Uploaded GLB asset inspected for future board presentation. Not yet rendered in-game because it contains board/checker/dice meshes that require safe separation and point mapping. |
| `assets/models/.gitkeep` | Project placeholder | N/A | No | Keeps the future model folder in Git. |


## Asset requirements

Before selecting or uploading premium assets, follow the exact shopping/upload list in `assets/ASSET_REQUIREMENTS.md`. The game is wired to look for these sound file names automatically:

- `assets/sounds/dice-roll.mp3`
- `assets/sounds/checker-move.mp3`
- `assets/sounds/checker-hit.mp3`
- `assets/sounds/special-roll.mp3`
- `assets/sounds/win.mp3`
- `assets/sounds/last-chance.mp3`

## Required checklist before adding any external asset

For every future audio/image asset, add a row above with:

1. Exact file path in this repository.
2. Original source URL.
3. Creator name or username, if available.
4. Exact license name and license URL.
5. Whether commercial use is allowed.
6. Whether attribution is required, and the attribution text if required.
7. Whether the asset was modified, converted, trimmed, normalized, or mixed.

Allowed licenses/sources for this project:

- CC0 / Public Domain.
- Creative Commons licenses that allow commercial use, such as CC BY, with attribution recorded here.
- User-provided assets with written source/license proof.
- Assets created specifically for this project.

Avoid assets marked NonCommercial, NoDerivatives, unclear “free download”, random search-engine results, YouTube/TikTok extractions, or packs without clear commercial-use rights.
