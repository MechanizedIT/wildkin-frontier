# Frontier height-only sampling timing

Measured on Node v22.17.1 with `.dream-loop/scenery-density/height-benchmark.mjs`.
The fixed set contains 60,000 ordinary-world points using the same prebuilt region and
continent sampler shape as the chunk runtime; three untimed warmups precede seven
alternating-order timed rounds.

| sampler | median CPU time |
| --- | ---: |
| `sampleFrontier(...).height` | 419.764 ms |
| `sampleFrontierHeight(...)` | 394.964 ms |

The height-only path reduced median sampling time by 5.9%. Both paths produced the
same checksum (`30573.217573004604`). Raw full-sample rounds were 419.743,
421.436, 419.719, 420.730, 419.163, 423.905, and 419.764 ms. Raw
height-only rounds were 394.964, 397.361, 388.122, 395.246, 394.152, 386.478,
and 399.109 ms.

This is a bounded laptop CPU microbenchmark, not native-frame or phone evidence.
