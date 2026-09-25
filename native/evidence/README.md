# Native engine evidence

Native qualification sessions should write durable receipts/captures below this folder.

Suggested structure:

```
native/evidence/
  unity/
    u0-agent-smoke/
    u1-matter-kernel/
    u2-mesher-resolution/
    u3-material-rock-stamp/
    u4-destruction-slice/
  unreal/
    # only if challenger is activated
```

Prefer small PNG/JPEG comparison images plus JSON/Markdown receipts. Do not commit Unity Library caches, raw profiler captures or huge generated builds unless a later phase explicitly needs them.
