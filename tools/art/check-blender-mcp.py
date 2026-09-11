"""Exercise the installed Blender MCP over its real stdio protocol.

Read scene, capture viewport, scrub one preview frame, capture and restore.
The bridge is useful while a Codex task awaits its refreshed MCP tool list.
No production model or workbench file is saved by this check.
"""
import argparse
import asyncio
import base64
import json
import os
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def run(args):
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, BLENDER_HOST='127.0.0.1', BLENDER_PORT='9876',
               BLENDER_MCP_DISABLE_TELEMETRY='1', PYTHONUTF8='1')
    params = StdioServerParameters(command=args.server, env=env)
    report = {'transport': 'real MCP stdio', 'server': args.server, 'calls': []}
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            initialization = await session.initialize()
            listing = await session.list_tools()
            names = [tool.name for tool in listing.tools]
            required = {'get_scene_info', 'get_object_info', 'get_viewport_screenshot', 'execute_blender_code'}
            if not required <= set(names):
                raise RuntimeError(f'Missing tools: {required - set(names)}')
            report['serverInfo'] = initialization.serverInfo.model_dump()
            report['toolNames'] = names
            prompt = 'Go ahead and add a blender mcp to the toolset here so we can have more control?'
            async def call(name, params, label):
                result = await session.call_tool(name, dict(params, user_prompt=prompt))
                blocks = []
                for item in result.content:
                    if item.type == 'image':
                        path = output / f'{label}.png'
                        path.write_bytes(base64.b64decode(item.data))
                        blocks.append({'image': str(path), 'mimeType': item.mimeType})
                    elif item.type == 'text':
                        blocks.append({'text': item.text})
                        if item.text.lower().startswith(('error', 'failed')):
                            raise RuntimeError(item.text)
                report['calls'].append({'tool': name, 'label': label, 'error': bool(result.isError), 'content': blocks})
                if result.isError:
                    raise RuntimeError(f'MCP failure: {name}')
                return blocks
            await call('get_scene_info', {}, 'scene')
            await call('get_viewport_screenshot', {'max_size': 1000}, 'viewport-before')
            try:
                await call('execute_blender_code', {'code': "import bpy,json\ns=bpy.context.scene\ns['_mcp_previous_frame']=s.frame_current\ns.frame_set(6)\nprint(json.dumps({'frame':s.frame_current,'rigs':[{ 'name':o.name,'bones':len(o.data.bones)} for o in s.objects if o.type=='ARMATURE'],'actions':[a.name for a in bpy.data.actions]}))"}, 'scrub')
                await call('get_viewport_screenshot', {'max_size': 1000}, 'viewport-frame6')
            finally:
                await call('execute_blender_code', {'code': "import bpy,json\ns=bpy.context.scene\ns.frame_set(int(s.get('_mcp_previous_frame',0)))\nif '_mcp_previous_frame' in s: del s['_mcp_previous_frame']\nprint(json.dumps({'restored_frame':s.frame_current}))"}, 'restore')
    report['pass'] = True
    (output / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'pass': True, 'tools': len(names), 'output': str(output)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server', default='C:/Users/cwood/Tools/blender-mcp/.venv/Scripts/blender-mcp.exe')
    parser.add_argument('--output', default='.dream-loop/blender-workbench/mcp-proof')
    asyncio.run(run(parser.parse_args()))
