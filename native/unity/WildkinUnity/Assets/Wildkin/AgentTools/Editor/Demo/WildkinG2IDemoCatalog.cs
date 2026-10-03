#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Wildkin.AgentTools.Editor.Demo
{
    public static class WildkinG2IDemoCatalog
    {
        public const string BrowserUrl = "http://127.0.0.1:8080/?g2i=1";
        public const string U4DScene = "Assets/Wildkin/Scenes/Tech/U4DLocalMatterDomain.unity";
        public const string U4EScene = "Assets/Wildkin/Scenes/Tech/U4EMultiDomainFormation.unity";
        public const string ViewCode = "Assets/Wildkin/Matter/Unity/MatterDomainQualificationView.cs";
        public const string CoreCode = "Assets/Wildkin/Matter/Core/MatterDomain.cs";
        public const string Spec = "docs/prompts/UNITY_06D_LOCAL_HIGH_RES_MATTER_DOMAIN.md";
        public const string CurrentSlice = "docs/CURRENT_SLICE.md";
        public const string U4DProof = "native/evidence/unity/u4d-local-matter-domain/README.md";
        public const string U4DReview = "native/evidence/unity/u4d-local-matter-domain/review.md";
        public const string U4EReview = "native/evidence/unity/u4e-multi-domain-formations/review.md";
        public const string U4EGallery = "native/evidence/unity/u4e-multi-domain-formations/metrics/gallery.json";
        public const string G1Review = "native/evidence/unity/u4f-g1-staged-trellis/review-raw-source.md";
        public const string C1Review = "native/evidence/unity/u4f-c1-cleanup/review-cleanup.md";
        public const string TargetImage = "art/source/u4f-rock-002/reference/candidate-04.png";
        public const string RawImage = "native/evidence/unity/u4f-g1-staged-trellis/captures/raw-primary.png";
        public const string CleanupImage = "native/evidence/unity/u4f-c1-cleanup/captures/post-repair/working-primary.png";
        // Pinned to gallery.json and review.md; both are technically accepted, neither is a visual PASS.
        public const int HeroSeed = 7004;
        public const int WeakSeed = 7019;
        public const string HeroId = "u4d-rock-0125-boulder";

        public sealed class Chapter
        {
            public readonly string Title, Purpose, Proves;
            public Chapter(string title, string purpose, string proves)
            { Title = title; Purpose = purpose; Proves = proves; }
        }

        public static readonly IReadOnlyList<Chapter> Chapters = Array.AsReadOnly(new[]
        {
            new Chapter("1 — Wildkin Frontier", "A real exploration, creature-life and building project motivates the engine work.",
                "Game-development/design context. The browser build is a playable historical reference while the PC-native architecture is being qualified in Unity."),
            new Chapter("2 — Unity Native Matter", "Edit, move and reconstruct independent high-resolution matter in Unity.",
                "Hands-on Unity/C# game-engine work, deterministic simulation architecture, testing, editing and persistence."),
            new Chapter("3 — How I Direct AI Work", "Follow a real bounded specification through implementation and review.",
                "AI is being used as an implementation collaborator inside a controlled engineering/evaluation loop—not as an unchecked game generator."),
            new Chapter("4 — Evaluation: Passing Tests Isn't Enough", "Compare an accepted bounded proof with a technically valid visual HOLD.",
                "The evaluator distinguishes machine-valid output from good game-development output and does not let passing tests overrule perceptual/gameplay quality."),
            new Chapter("5 — AI Asset Pipeline: Stop Bad Output Early", "Inspect the approved target, raw candidate and rejected cleanup using existing evidence.",
                "The same evaluation discipline applies to AI-generated art/content as to code.")
        });

        public static string ProjectRoot => Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
        public static string RepositoryRoot => Path.GetFullPath(Path.Combine(ProjectRoot, "../../.."));
        public static string RepositoryFile(string path) => Path.GetFullPath(Path.Combine(RepositoryRoot, path));
        public static IEnumerable<string> ReferencedFiles
        {
            get
            {
                yield return "README.md"; yield return Spec; yield return CurrentSlice;
                yield return U4DProof; yield return U4DReview; yield return U4EReview;
                yield return U4EGallery; yield return G1Review; yield return C1Review;
                yield return TargetImage; yield return RawImage; yield return CleanupImage;
            }
        }

        public static string TemporaryFile(string filename)
        {
            if (string.IsNullOrWhiteSpace(filename) || filename != Path.GetFileName(filename) ||
                filename.IndexOfAny(new[] { '/', '\\', ':' }) >= 0 || filename == "." || filename == "..")
                throw new ArgumentException("Use a simple filename inside the disposable demo directory.", nameof(filename));
            string root = Path.GetFullPath(Path.Combine(ProjectRoot, "Library/WildkinG2IDemo"));
            string result = Path.GetFullPath(Path.Combine(root, filename));
            if (!result.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Demo output must stay inside Library/WildkinG2IDemo.");
            return result;
        }
    }
}
#endif
