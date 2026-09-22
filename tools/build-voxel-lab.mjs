import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist','voxel-lab'),archive=path.join(root,'dist','voxel-lab.zip');
if(!output.startsWith(root+path.sep)||!archive.startsWith(root+path.sep))throw new Error('Output escaped workspace');
await fs.mkdir(path.join(output,'lab'),{recursive:true});await fs.mkdir(path.join(output,'vendor'),{recursive:true});
await fs.cp(path.join(root,'lab','voxel'),path.join(output,'lab','voxel'),{recursive:true});
for(const name of ['three.module.js','rapier.js','rapier.LICENSE','README.md'])await fs.copyFile(path.join(root,'vendor',name),path.join(output,'vendor',name));
await fs.copyFile(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(output,'THIRD_PARTY_NOTICES.md'));
const html=(await fs.readFile(path.join(root,'lab','voxel','index.html'),'utf8')).replace('./lab.css','./lab/voxel/lab.css').replace('./main.js','./lab/voxel/main.js');
await fs.writeFile(path.join(output,'index.html'),html);
const quote=s=>`'${s.replaceAll("'","''")}'`;
// .NET CreateFromDirectory uses Windows separators inside ZIP entry names.
// Write portable forward-slash entries into a task-owned temporary archive,
// then replace exactly this archive after successful closure.
const temporaryArchive=`${archive}.tmp`;
const zipScript=`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$voxelSource=${quote(output)}
$voxelTemporary=${quote(temporaryArchive)}
if (Test-Path -LiteralPath $voxelTemporary) { Remove-Item -LiteralPath $voxelTemporary }
$voxelZip=[System.IO.Compression.ZipFile]::Open($voxelTemporary,[System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $voxelSource -Recurse -File | ForEach-Object {
    $voxelRelative=$_.FullName.Substring($voxelSource.Length+1).Replace([char]92,'/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($voxelZip,$_.FullName,$voxelRelative,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $voxelZip.Dispose() }`;
execFileSync('powershell.exe',['-NoProfile','-Command',zipScript],{stdio:'inherit',windowsHide:true});
await fs.rm(archive,{force:true});
await fs.rename(temporaryArchive,archive);
async function bytes(dir){let total=0;for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);total+=e.isDirectory()?await bytes(p):(await fs.stat(p)).size;}return total;}
console.log(JSON.stringify({output,archive,unpackedBytes:await bytes(output),zipBytes:(await fs.stat(archive)).size}));
