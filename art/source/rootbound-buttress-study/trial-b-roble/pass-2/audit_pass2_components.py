import bpy
import json
from pathlib import Path

obj = bpy.data.objects["GEO_B2_ConnectedButtressTree"]
mesh = obj.data
neighbors = {vertex.index: set() for vertex in mesh.vertices}
for edge in mesh.edges:
    a, b = edge.vertices
    neighbors[a].add(b)
    neighbors[b].add(a)
unseen = set(neighbors)
components = []
while unseen:
    seed = unseen.pop()
    component = {seed}
    frontier = [seed]
    while frontier:
        current = frontier.pop()
        fresh = neighbors[current] & unseen
        unseen -= fresh
        component |= fresh
        frontier.extend(fresh)
    components.append(len(component))
edge_uses = {}
for polygon in mesh.polygons:
    for i, vertex in enumerate(polygon.vertices):
        key = tuple(sorted((vertex, polygon.vertices[(i + 1) % len(polygon.vertices)])))
        edge_uses[key] = edge_uses.get(key, 0) + 1
report = {
    "mesh": obj.name,
    "vertexCount": len(mesh.vertices),
    "polygonCount": len(mesh.polygons),
    "connectedComponents": len(components),
    "componentVertexCountsDescending": sorted(components, reverse=True),
    "boundaryEdges": sum(1 for count in edge_uses.values() if count == 1),
    "nonManifoldEdges": sum(1 for count in edge_uses.values() if count > 2)
}
out = Path(r"C:/Users/cwood/Documents/mobile-rpg/art/source/rootbound-buttress-study/trial-b-roble/pass-2/output/component-audit.json")
out.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(report)
