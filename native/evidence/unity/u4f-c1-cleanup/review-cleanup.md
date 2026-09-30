# Independent U4F-C1 visual review

**Reviewer:** `/root/u4f_generation_gate_review`, read-only and not the cleanup implementer.

**Disposition:** `U4FC1_RENDER_SOURCE_HOLD`. Do not proceed to decimation or build the two final derivatives from this candidate.

The largest-component repair is visually silhouette-preserving. It retains the raised rear cap and broad/lower front mass; raw-to-working mask IoU is 0.99297–0.99863 over the eight matched views. This does not establish reference fidelity: the raw already reads as a bulky base with a separate mesa-like cap, rather than candidate-04's coherent taller-offset-shoulder boulder and broad connected planes.

Severe high-frequency striped/moiré contour artifacts remain across the cap, shoulders, and much of the lower mass in all visible orientations. They are more distracting than the raw's speckle/normal noise and obscure the intended broad-plane read. The underside remains implausibly black/closed off and still has a radial/star-like shading pattern plus a striped rim. Removing disconnected islands and correcting winding did not solve those defects.

The repaired shell passes the recorded topology metrics, but numerical closure and high raw-to-working mask overlap do not make it an acceptable pristine render source. The sole focused repair is spent. A future attempt requires a structural method change and fresh owner direction; do not continue this candidate through reduction, stamp construction, Unity, U4G, or U5.

Reviewed captures: `captures/post-repair/pre-reduction-{primary,opposite,front,back,left,right,top,underside}.png`, their raw/working source renders and silhouette overlays, plus `metrics/post-repair-comparison.json` and `metrics/working-solid.json`.
