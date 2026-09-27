namespace Wildkin.Matter
{
    public enum MatterSupportKnowledge : byte
    {
        Unknown = 0,
        Supported = 1,
        Unsupported = 2
    }

    /// <summary>
    /// U2 contract only. This does not perform a support query or implement collapse.
    /// Complete evidence of unsupported matter is required before a later phase may detach it.
    /// </summary>
    public static class MatterSupportContract
    {
        public static bool MayDetach(MatterSupportKnowledge knowledge)
            => knowledge == MatterSupportKnowledge.Unsupported;
    }
}
