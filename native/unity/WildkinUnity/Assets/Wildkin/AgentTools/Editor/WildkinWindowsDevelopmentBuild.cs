using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Wildkin.AgentTools
{
    /// <summary>
    /// Reproducible Windows x64 Development Build entry point for the U0/U1 smoke.
    /// </summary>
    public static class WildkinWindowsDevelopmentBuild
    {
        public static void Build()
        {
            string[] scenes = EditorBuildSettings.scenes
                .Where(scene => scene.enabled)
                .Select(scene => scene.path)
                .ToArray();
            if (scenes.Length == 0)
            {
                throw new InvalidOperationException("No enabled build scenes are configured.");
            }

            string outputPath = ResolveBuildOutputPath();
            string outputDirectory = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(outputDirectory))
            {
                Directory.CreateDirectory(outputDirectory);
            }

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = outputPath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.Development
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Windows Development Build ended with {report.summary.result}: {report.summary.totalErrors} errors.");
            }

            Debug.Log($"Wildkin Windows Development Build succeeded: {outputPath} ({report.summary.totalSize} bytes).");
        }

        private static string ResolveBuildOutputPath()
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int index = 0; index < args.Length - 1; index++)
            {
                if (string.Equals(args[index], "-buildOutput", StringComparison.OrdinalIgnoreCase))
                {
                    return Path.GetFullPath(args[index + 1]);
                }
            }

            throw new InvalidOperationException("Unity CLI did not provide -buildOutput.");
        }
    }
}
