# Ironspine narrow rockbank R2 — independent builder source review

## Decision: PASS

The revised script now audits the untouched literal mesh before any normal operation, records `normalRepair` as none with no changed faces, writes the pre-render receipt including cap orientation, and fails on malformed directed edges, volume, bounds, cap signs, or topology before rendering. It no longer conceals an input winding problem through an automatic recalculation. The isolated cap coverage proof remains scoped to the cap faces and compares rendered alpha against their projected polygon area.

This passes the source gate for the frozen R2 input only. The actual massing still requires independent visual judgment before material or native projection.
