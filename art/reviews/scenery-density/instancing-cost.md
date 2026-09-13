# Low-prop preparation timing

Local Node v22.17.1, Intel i9-11900H. The fixed benchmark uses the admitted Lush representative mix (reed/lily/mushroom/stone), deterministic transforms, `canPlaceGroundCover: () => false`, one warm-up, then five samples per size. It measures `createFrontierSceneryVisual` through completed merged geometry and excludes disposal time.

| Build | 18 low specs | 144 low specs |
| --- | ---: | ---: |
| Before prototype reuse | 20.8–25.0 ms run medians; 17.8 ms best | 130.9–138.6 ms run medians; 128.8 ms best |
| After prototype reuse | 14.2–14.5 ms run medians; 10.6 ms best | 52.4–54.2 ms run medians; 48.8 ms best |

Across the collected samples, the middle observed 18-spec time moved from about 21.1 ms to 14.5 ms (**31% lower**). The 144-spec time moved from about 137.2 ms to 52.8 ms (**61% lower**). Best-to-best improved by 40% and 62%, respectively. The benchmark is a local CPU microbenchmark rather than browser-frame or mobile-device proof; final merged vertex memory and triangle count are intentionally unchanged.

Fixture and command: `node .dream-loop/scenery-density/visual-prep-benchmark.mjs`.

## 12.5 m render-cell instancing

The admitted mix spans a representative 3x3 terrain window and its quarter-chunk render cells. Three invocations with five measured samples each produced:

| Count | Run medians | Occupied asset/cell batches | Rendered triangles | Unique geometry vertices |
| ---: | ---: | ---: | ---: | ---: |
| 144 | 16.1–17.7 ms | 144 | 126,126 | 10,812 |
| 576 | 38.9–41.1 ms | 449 | 503,444 | 10,812 |
| 2,304 | 118.8–123.7 ms | 570 | 2,012,544 | 10,812 |

The stress fixture deliberately spreads each asset across nearly every render cell; actual draws depend on occupied asset/cell pairs and native frustum rejection. The original world-merged path would retain 12.99 MiB of repeated position-normal-color attributes at 144 specs, 51.85 MiB at 576, and 207.29 MiB at 2,304. Instancing retains **0.371 MiB** of unique geometry in all three cases, plus 0.009, 0.035, or 0.141 MiB of instance matrices. This is about **35x, 140x, and 558x less geometry**, respectively, per retained CPU or GPU attribute copy.

The 144 preparation median remains about 87% below the original 130.9–138.6 ms merged baseline despite the deliberately maximal 144 render-cell batches. No equivalent 576 or 2,304 old-path timing was run; their old memory and triangle figures are exact recipe arithmetic rather than timing extrapolation. Browser/mobile rendering and the actual visible batch count remain separate native evidence.
