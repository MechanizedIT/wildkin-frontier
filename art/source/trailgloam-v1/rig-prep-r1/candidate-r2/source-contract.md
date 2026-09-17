# Trailgloam rig R2 source contract

R1 is preserved as an invalid coordinate-space probe: it scaled/shifted mesh vertices but left bones and weight-distance queries raw, and keyed body bob rather than leg motion. R2 uses one **raw Blender source space** for mesh, landmarks, bone heads/tails, and all weight queries. It parents mesh and armature beneath one `TrailgloamMetricRoot` empty with the frozen uniform scale and ground shift, so the exported hierarchy applies the same transform to both.

Each leg receives coxa/knee/ankle/hoof deform regions selected by nearest raw-space segment, with rigid hoof assignment inside the recorded ankle radius; all remaining vertices are body. The walk keys actual coxa/knee/ankle rotations for alternating four-foot groups, with planted group rotations zero and swing group knee/ankle rotations moving through lift/mid/plant frames. Root/body bob is supplemental only.

The source must record: no unweighted vertices; maximum influences <=4; raw mesh vertex/triangle/UV counts before/after; expected armature bones/actions in the reimported GLB; actual clip duration; and selected sole target changes. No source mesh edits, UV changes, weld/remesh, or runtime admission.
