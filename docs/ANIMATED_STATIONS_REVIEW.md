# Physical fabrication — September 11 candidate

Three freely placed Camp stations now use reviewed articulated Blender models. Salvage assembles berry lures, woven snares and Trail rations; Matter fabricator makes medkits and reinforced tethers; Resonance makes calming chimes. These recipe assignments and costs are provisional. Existing basic Camp crafting remains available. Powered tools and ranged weapons are still pending. The later ration craft/equip/use proof is recorded in `FIELD_FOOD_REVIEW.md`.

The actual mechanism moves for a short 2.2-second operation: vise closure, carriage/nozzle travel, or rotor/core rotation. A completed product appears on the machine. Materials and packed output commit atomically once at Craft; the finish animation never grants a second item. Travel/reload clears transient presentation while preserving packed inventory. No unattended queue or duplicate item store was added.

## Evidence

- Separate reference author, Blender implementer and root model judge. Exact source hashes and reproduction builders are retained with each source package. All three model shape gates exceed 8/10; this is not owner acceptance.
- Independent native Edge review at 844×390 uses authoritative diagnostic placement of three station types and a second fabricator, followed by normal movement, touch buttons, Craft, Pack, orbit, reload and Author input. No animation state or rewards are advanced by the fixture.
- Only the activated fabricator moves. Pack pauses/resumes it. Walking away closes the picker. All three recipes grant once, reload retains four instances and their products, and the isolated Author fixture resets presentation without another grant. Zero browser exceptions.
- Real two-recipe panel is 300px wide; the one-recipe panel is 276px. Names are 15px and Craft/Close targets at least 48px. The reviewed frames keep health, Map, hotbar and right actions clear. A duplicate contextual button while the picker was open was removed.
- Medkit and snare are visibly seated. Initial floating chime was rejected, then laid on the existing left deck; three ordinary orbit views pass placement. It remains too small to identify independently of its recipe icon. Resonance motion is subtle at this camera, so transform changes alone are not claimed as motion-readability proof.

Actual captures and state receipts: `.dream-loop/overnight-station-runtime/README.md`, `proof.json`, `motion.json`, and `chime-seated.json`. Structural source reviews do not prove phone FPS; no physical-phone performance claim is made.

Packaged repeat at localhost:8081 loads all three station GLBs locally, repeats the three native craft/motion/count/reload paths, then crafts another item after network is offline. Zero external requests and page errors. Evidence: `.dream-loop/overnight-station-package/proof.json` and `packaged-offline-completed.png`. Its package was built before the subsequent world/harvest iteration, so it specifically proves the station checkpoint.

## Player replay

At the southern Camp clearing, place two Matter fabricators, a Salvage bench and a Resonance bench using extracted resources. Stand beside a fabricator, tap its floating button, select Field medkit and Craft once. Watch the nozzle lower while the other machine stays still. After completion, expect one packed medkit and a small case on the tray.

Start another operation, open Pack halfway through, then close it: the mechanism should pause/resume and the count must not increase again at completion. Walk away with a picker open; it should close. Craft a woven snare at Salvage and a chime at Resonance, close the panels and orbit to inspect the products. Reload: counts and built stations should remain. Report clipping, apparently floating pieces, unreadable controls, or repeated consumption/rewards.
