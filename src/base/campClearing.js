import { CAMP_DEBRIS_IDS } from './campLayout.js';

// Camp owns the permanent clearing decision; the resource system still owns
// hits, rewards, visuals and collision. Commit before the final irreversible hit.
export function createCampClearing({ progress, resources, isCamp, initialHidden = false, notify = () => {} }) {
  const debris = new Set(CAMP_DEBRIS_IDS);
  let hidden = initialHidden, signature = null, poll = 0, warningCooldown = 0;
  function sync() {
    const ids = hidden ? [] : progress.getBaseState().layout.clearedDebrisIds;
    const next = ids.join('|');
    if (next === signature) return;
    signature = next;
    resources.setRemovedResourceIds(ids);
  }
  sync();
  return {
    beforeHit(node) {
      if (!debris.has(node.id)) return true;
      if (hidden || !isCamp() || node.state.nodeState !== 'READY' || node.state.remainingChunks <= 0) return false;
      if (node.state.remainingChunks > 1) return true;
      const result = progress.clearCampDebris(node.id);
      if (result.cleared) return true;
      if (warningCooldown <= 0 && result.reason === 'storage-write-failed') {
        notify('Could not save', 'This bundle remains. Try the final hit again.'); warningCooldown = 3;
      }
      return false;
    },
    afterHit(node) {
      if (!debris.has(node.id) || node.state.remainingChunks > 0) return;
      sync();
      const count = progress.getBaseState().layout.clearedDebrisIds.length;
      notify('Camp clearing', count === CAMP_DEBRIS_IDS.length ? 'Yard cleared. Return to the amber console to secure its perimeter.' : `${count}/${CAMP_DEBRIS_IDS.length} bundles cleared. Follow the amber survey stakes.`);
    },
    update(dt, { hidden: nextHidden = false } = {}) {
      warningCooldown = Math.max(0, warningCooldown - dt);
      if (hidden !== nextHidden) { hidden = nextHidden; sync(); }
      poll += dt;
      if (poll >= .25) { poll = 0; sync(); }
    },
  };
}
