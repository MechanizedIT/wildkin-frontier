// The world prompt is only a presentation candidate. Activation rechecks the
// selected equipment before it can begin or advance a taming transaction.
export function describeWildkinInteraction({ species, eligibility, selectedItem, actionLabel, detail, requiredEquipmentId = species?.taming?.supply, requiredEquipmentName = requiredEquipmentId }) {
  if (selectedItem?.kind === 'tool') {
    return { action: 'attack', label: 'ATTACK', detail: `Attack ${species?.name ?? 'Wildkin'} with the Omni-tool.`, disabled: false };
  }
  if (selectedItem?.kind === 'taming' && selectedItem.id === requiredEquipmentId) {
    if (eligibility?.ok) return { action: 'catch', label: actionLabel, detail, disabled: false, requiredEquipmentId };
    return { action: 'catch', label: 'UNAVAILABLE', detail: eligibility?.reason ?? 'This Wildkin cannot be tamed now.', disabled: true, requiredEquipmentId };
  }
  const displayName = String(requiredEquipmentName ?? 'catch item').replaceAll('_', ' ');
  return {
    action: 'select-taming-item',
    label: `SELECT ${displayName.toUpperCase()}`,
    detail: `Select ${displayName} in your hotbar to tame this Wildkin.`,
    disabled: true,
    requiredEquipmentId,
  };
}

// Keep queued pointer/key activations harmless if the player swaps hotbar
// slots before the UI delivers the old interaction object.
export function resolveWildkinInteractionActivation(info, selectedItem) {
  if (!info || info.type !== 'bond') return null;
  if (info.action === 'attack') return selectedItem?.kind === 'tool' ? 'attack' : null;
  if (info.action === 'catch' && info.requiredEquipmentId
    && selectedItem?.kind === 'taming' && selectedItem.id === info.requiredEquipmentId) return 'catch';
  return null;
}
