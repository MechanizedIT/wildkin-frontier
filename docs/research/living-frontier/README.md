# Living Frontier research refresh

September 12, 2026: repository-owned research, implementation evidence and owner direction.

- [Visual Fieldbook](Living-Frontier-Visual-Fieldbook.pdf): portrait pages with actual game screenshots, proposed mockups, process diagrams and an exploration-area graph.
- [Detailed Research Appendix](Living-Frontier-Research-Appendix.pdf) and [editable Markdown](Living-Frontier-Research-Appendix.md): current-state ledger, world generation, modular creatures, reproduction, habitat research, aging/DNA choices, community and sources.
- [Image manifest](image-manifest.md): exact sources and current/proposed distinctions. Game art targets are not game screenshots.
- [Build and evidence metadata](review/qa.json): final page counts, dimensions, sizes and hashes. Numbered contact sheets are rendered from the same PDFs.

The portable image copies live in `images/actual/` and `images/concept/`. The reproducible builder is [build_living_frontier_report.py](../../../tools/research/build_living_frontier_report.py); it uses ReportLab, Pillow, pypdf and pypdfium2 from the existing document runtime. The appendix PDF renders the Markdown source. The fieldbook's short captions and page arrangements are editable in the builder.

Original morning research remains preserved outside the repo at `C:/Users/cwood/Documents/Wildkin-Research/2026-09-12/`.

Existing phone links: [Google Drive Visual Fieldbook](https://drive.google.com/file/d/1CxksdXis14pKQ_3KyKvUHKMLhNly8D5y/view) and [Google Drive Detailed Appendix](https://drive.google.com/file/d/14Hbboycp5oFvID5TwbVpPR2uA_uvJph5/view). Delivery verification belongs in `delivery-receipt.json` after the authorized update succeeds; a link alone does not prove synchronization.
