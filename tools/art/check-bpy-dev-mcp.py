"""Bounded side-by-side trial of bpy-dev MCP on an unchanged source copy.

Uses its actual stdio tools with existing Blender, not the CUDA-only render
shortcut. No addon installation, global registration, or production writes.
"""
import argparse
import asyncio
import hashlib
import json
import os
import time
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


async def run(args):
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    source = Path(args.source).resolve(strict=True)
    source_hash = sha(source)
    report = {'transport': 'real MCP stdio', 'source': str(source),
              'sourceBefore': source_hash, 'server': args.server,
              'blender': args.blender, 'calls': [], 'runtimeDocs': {}, 'pass': False}
    env = dict(os.environ, BLENDER_MCP_CLI_BACKEND='blender', BLENDER_PATH=args.blender,
               BLENDER_MCP_HOST='127.0.0.1', BLENDER_MCP_PORT='19877',
               PYTHONUTF8='1', OMP_NUM_THREADS='2', OPENBLAS_NUM_THREADS='2')
    try:
        async with stdio_client(StdioServerParameters(command=args.server, env=env)) as (read, write):
            async with ClientSession(read, write) as session:
                info = await session.initialize()
                listing = await session.list_tools()
                report['serverInfo'] = info.serverInfo.model_dump()
                report['tools'] = [tool.name for tool in listing.tools]
                required = {'get_blendfile_summary_datablocks_for_cli',
                            'get_runtime_python_api_docs_for_cli', 'execute_blender_code_for_cli'}
                if not required <= set(report['tools']):
                    raise RuntimeError('Missing required trial tools')

                async def call(name, params, label):
                    started = time.monotonic()
                    value = await session.call_tool(name, params)
                    data = value.model_dump(mode='json', exclude_none=True)
                    (out / (label + '.json')).write_text(json.dumps(data, indent=2), encoding='utf-8')
                    report['calls'].append({'tool': name, 'label': label,
                                            'seconds': round(time.monotonic()-started, 2),
                                            'isError': bool(value.isError)})
                    print(json.dumps(report['calls'][-1]), flush=True)
                    if value.isError:
                        raise RuntimeError('Tool failed: ' + label)
                    return data

                await call('get_blendfile_summary_datablocks_for_cli',
                           {'blend_file': str(source)}, 'source-summary')
                for identifier, label in [('bpy.types.Action.slots', 'action-slots-docs'),
                                           ('bpy.ops.export_scene.gltf', 'gltf-export-docs')]:
                    docs = await call('get_runtime_python_api_docs_for_cli',
                                      {'blend_file': str(source), 'identifier': identifier}, label)
                    report['runtimeDocs'][identifier] = docs.get('structuredContent', {}).get('found') is True

                output_blend = out / 'trial-edit.blend'
                output_png = out / 'trial-preview.png'
                code = f'''import bpy
from mathutils import Vector
s=bpy.context.scene
meshes=[o for o in s.objects if o.type=='MESH']
assert meshes, 'Expected a small prop mesh'
meshes[0].rotation_euler.z += .12
s.render.engine='CYCLES'
s.cycles.device='CPU'
s.cycles.samples=4
s.render.threads_mode='FIXED'
s.render.threads=2
s.render.resolution_x=384
s.render.resolution_y=384
s.render.resolution_percentage=100
if not s.camera:
    data=bpy.data.cameras.new('TrialCamera')
    camera=bpy.data.objects.new('TrialCamera',data)
    s.collection.objects.link(camera)
    s.camera=camera
s.camera.data.type='ORTHO'
s.camera.data.ortho_scale=4.5
s.camera.location=(4,-6,3.5)
s.camera.rotation_euler=(Vector((0,0,.7))-s.camera.location).to_track_quat('-Z','Y').to_euler()
for o in list(s.objects):
    if o.type=='LIGHT': bpy.data.objects.remove(o,do_unlink=True)
light=bpy.data.lights.new('TrialSoftbox','AREA')
light.energy=500
light.size=5
lamp=bpy.data.objects.new('TrialSoftbox',light)
s.collection.objects.link(lamp)
lamp.location=(2,-4,6)
lamp.rotation_euler=(Vector((0,0,.7))-lamp.location).to_track_quat('-Z','Y').to_euler()
s.render.image_settings.file_format='PNG'
s.render.filepath={str(output_png)!r}
bpy.ops.wm.save_as_mainfile(filepath={str(output_blend)!r})
bpy.ops.render.render(write_still=True)
result={{'blender':bpy.app.version_string,'mesh_count':len(meshes),'mesh':meshes[0].name,'render_engine':s.render.engine,'device':s.cycles.device,'samples':s.cycles.samples,'threads':s.render.threads,'output_blend':bpy.data.filepath,'preview':s.render.filepath}}
'''
                await call('execute_blender_code_for_cli',
                           {'blend_file': str(source), 'code': code,
                            'expected_output_blend': str(output_blend)}, 'copy-edit-render')
                assert output_blend.is_file() and output_png.is_file()
                report['artifacts'] = {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p)}
                                       for p in [output_blend, output_png]}
                report['sourceAfter'] = sha(source)
                assert report['sourceAfter'] == source_hash, 'Source changed during trial'
                report['copyEditRenderPass'] = True
                report['pass'] = all(report['runtimeDocs'].values())
    finally:
        report['sourceAfter'] = sha(source)
        (out/'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'pass': report['pass'], 'tools': len(report.get('tools', [])), 'output': str(out)}))
    if not report['pass']:
        raise RuntimeError('Core file operations passed, but requested runtime API lookup is unsupported; see report')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server', default='C:/Users/cwood/Tools/bpy-dev-blender-mcp/.venv/Scripts/blender-mcp.exe')
    parser.add_argument('--blender', default='C:/Users/cwood/Tools/blender-5.2.1-windows-x64/blender.exe')
    parser.add_argument('--source', default='art/source/verdant-cliff-kit-v1/candidate-v3/final/verdant-cliff-toe-editable.blend')
    parser.add_argument('--output', required=True)
    asyncio.run(run(parser.parse_args()))
