# Rootbound R3 integration support receipt

- **Scope:** authoritative terrain chunks `-10,13` and `-9,13`; no other
  habitat or gameplay surface.
- **Rapier:** the real terrain-surface lifecycle added both indexed chunks,
  hit each scoped vertical ray at its shared sampler height, removed both
  (all rays missed), then re-added both with matching heights. The test records
  the expected stable chunk ID for each XZ witness because Rapier's returned
  collider wrapper is not the same JavaScript object used as the runtime map key.
- **Curated support:** all five Lantern/Thorn curated records in the field have
  final and pre-R3 support. Their support radius is the conservative
  circumscribed radius of the fully transformed visual bounds.
- **Sources:** three existing field resources retain final/pre-R3 support; no
  wildlife home lies in the scoped affected chunks, so no home comparison is
  claimed.

See support-proof.json for the numeric witnesses and support-proof.mjs for the
reproducible CPU/Rapier command. This is scoped evidence, not a replacement for
the root-owned native route/capture or aggregate checks.
