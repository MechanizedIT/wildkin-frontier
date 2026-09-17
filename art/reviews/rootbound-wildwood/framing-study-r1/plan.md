# Rootbound portrait framing study

Baseline commit 608f360. Asset experiments remain paused. Read-only production study: temporary diagnostic HTML only, no runtime edits or new scenery.

Compare the current 36-degree centered portrait camera with A: same camera and player scale, projection raised by 12% of image height; and B: same projection offset with existing pitch control at 28 degrees. Capture Meadow, Galleries and Crown in all three configurations at the previous route poses. This tests whether camera framing hides the region, not whether new assets are necessary. A projection offset is rendering-only in this fixture and is restored each frame, so these images do not establish interaction/collision compatibility of a shipped projection change.

Independent visual review selects useful direction or retains baseline. No score veto, no more than one consolidation. A runtime camera change would require a separate scoped implementation with sibling landscape, pointer targeting, camera obstruction, near-plane and resize checks. Production remains unchanged during this study.

One final consolidation from the independent technical audit: capture C, 32-degree pitch only with centered projection. This uses the existing orbit control and avoids introducing a new projection/label ownership contract. Compare actual images with A before any implementation choice.
