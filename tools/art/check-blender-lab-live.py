"""Small real-MCP live check after start-blender-lab.ps1; no model writes."""
import argparse
import asyncio
import base64
import hashlib
import json
import os
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def run(args):
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    source = Path('assets/models/mossling-v3/model.glb').resolve(strict=True)
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    report = {'source': str(source), 'sourceBefore': before, 'calls': [], 'pass': False}
    env = dict(os.environ, BLENDER_MCP_HOST='127.0.0.1', BLENDER_MCP_PORT='19877',
               BLENDER_MCP_CLI_BACKEND='blender', PYTHONUTF8='1')
    try:
        async with stdio_client(StdioServerParameters(command=args.server, env=env)) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                calls = [
                    ('get_objects_summary', {}, 'objects'),
                    ('get_screenshot_of_window_as_image', {'size_limit_in_bytes': 600000}, 'window'),
                    ('execute_blender_code', {'code': "import bpy\nresult={'version':bpy.app.version_string,'file':bpy.data.filepath,'armatures':[{'name':o.name,'bones':len(o.data.bones)} for o in bpy.context.scene.objects if o.type=='ARMATURE'],'actions':[{'name':a.name,'slots':len(a.slots)} for a in bpy.data.actions]}"}, 'rig-inspection'),
                    ('get_screenshot_of_area_as_image', {'area_ui_type': 'VIEW_3D', 'size_limit_in_bytes': 600000}, 'viewport'),
                ]
                for name, params, label in calls:
                    value = await session.call_tool(name, params)
                    record = value.model_dump(mode='json', exclude_none=True)
                    images = 0
                    for block in record.get('content', []):
                        if block['type'] == 'image':
                            path = out / f'{label}-{images}.png'
                            path.write_bytes(base64.b64decode(block.pop('data')))
                            block['savedPath'] = str(path)
                            images += 1
                    (out / f'{label}.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
                    report['calls'].append({'tool': name, 'isError': bool(value.isError), 'images': images})
                    print(json.dumps(report['calls'][-1]), flush=True)
                    assert not value.isError, f'Tool failed: {label}'
                    if 'screenshot' in name:
                        assert images == 1, 'Missing screenshot'
                    else:
                        structured = record.get('structuredContent', {})
                        assert structured.get('status') == 'ok', f'Unexpected result: {structured}'
                report['pass'] = True
    finally:
        report['sourceAfter'] = hashlib.sha256(source.read_bytes()).hexdigest()
        report['sourceUnchanged'] = report['sourceAfter'] == before
        report['pass'] = report['pass'] and report['sourceUnchanged']
        (out / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server', default='C:/Users/cwood/Tools/bpy-dev-blender-mcp/.venv/Scripts/blender-mcp.exe')
    parser.add_argument('--output', required=True)
    asyncio.run(run(parser.parse_args()))
