// One expedition-local attempt. Supplies and secured ownership stay in progress;
// creature locomotion stays in CreatureSystem and its Rapier controller.
export const FIELD_TAMING_CONFIG = Object.freeze({ interactionRange: 6, approachRange: 2.5, retreatRange: 2.8, feedSeconds: 3, trapSeconds: 14, lifetime: 100, quietSpeed: 2.2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function createFieldTaming({ getPlayer, getTarget, getSectionId, isActive, canStart, consume, placePoint, setIntent, clearIntent, capture, onMessage = () => {}, onVisual = () => {} }) {
  let attempt = null;
  function clear() { if (attempt) clearIntent(attempt.id); attempt = null; onVisual(null); }
  function fail(message) { clear(); onMessage("Taming interrupted", message); }
  function snapshot() {
    if (!attempt) return null;
    const a = attempt;
    return { id: a.id, speciesId: a.species.id, stage: a.stage, point: { ...a.point }, perch: a.perch, progress: Math.min(1, a.calm / FIELD_TAMING_CONFIG.feedSeconds), ...instruction(a) };
  }
  function instruction(a) {
    const map = {
      lure: ["GIVE SPACE", "Step away from the berries and let Mossling feed."],
      feed: ["LET IT FEED", "Stay back while Mossling eats; approach slowly when it trusts you."],
      ready: ["BOND", "Walk gently to your Wildkin and welcome it."],
      snare: ["LURE TO SNARE", "Back away from the baited snare so Tidefin can investigate."],
      trapped: ["RELEASE & BOND", "Walk to Tidefin and release the woven snare before it struggles free."],
      challenge: ["DODGE CHARGE", "Face Emberhorn, dodge its committed charge, then tether during recovery."],
      tether: ["USE TETHER", "Close in and use the reinforced tether before Emberhorn recovers."],
      offer: ["OFFER BERRIES", "Offer a berry lure to the tethered Emberhorn."],
      call: ["RING CHIME", `Walk quietly to the violet perch, keep your distance, then call (${a.perch + 1}/2).`],
      perch: ["FOLLOW QUIETLY", "Give Skydancer room to settle on the violet perch."],
    };
    const [label, detail] = map[a.stage] ?? ["BOND", a.species.taming.guide];
    return { label: `${label} · ${a.species.name}`, detail };
  }
  function spend(id) {
    const result = consume(id);
    if (result?.consumed) return true;
    onMessage("Field gear needed", result?.reason === "empty" ? "Craft the required gear at your Camp workbench." : "The gear could not be saved. Try again.");
    return false;
  }
  function begin(id, species) {
    if (attempt && attempt.id !== id) { onMessage("One Wildkin at a time", "Finish this attempt or move away to cancel it."); return false; }
    if (attempt) return act();
    const target = getTarget(id), player = getPlayer();
    const eligibility = canStart(target, species);
    if (!eligibility.ok) { onMessage("Cannot tame yet", eligibility.reason); return false; }
    if (!target || distance(player.pos, target.state.pos) > FIELD_TAMING_CONFIG.interactionRange || Math.abs(player.pos.y - target.state.pos.y) > 2.2) return false;
    if (!player.grounded) { onMessage("Find your footing", "Land on clear ground before preparing field gear."); return false; }
    const point = species.id === "emberhorn" ? { ...target.state.pos } : placePoint(player, target);
    if (!point) { onMessage("Choose clear ground", "Turn toward an open, dry patch before placing field gear."); return false; }
    if (species.id !== "emberhorn" && !spend(species.taming.supply)) return false;
    attempt = { id, species, point, startHealth: target.state.health, sectionId: getSectionId(), stage: { mossling: "lure", tidefin: "snare", emberhorn: "challenge", skydancer: "call" }[species.id], age: 0, calm: 0, stageTime: 0, perch: 0, chargeSerial: target.state.dodgedChargeSerial ?? 0 };
    setIntent(id, species.id === "emberhorn" ? { challenge: true } : { hold: true });
    onVisual(snapshot());
    return true;
  }
  function finish() {
    const a = attempt, target = getTarget(a.id);
    const eligibility = canStart(target, a.species);
    if (!eligibility.ok) { fail(eligibility.reason); return false; }
    if (!capture(a.id, a.species)) { fail("The Wildkin moved out of reach."); return false; }
    clear(); return true;
  }
  function act() {
    if (!attempt) return false;
    const a = attempt, target = getTarget(a.id), player = getPlayer();
    if (!target || !isActive() || a.sectionId !== getSectionId()) { clear(); return false; }
    const near = distance(player.pos, target.state.pos) <= FIELD_TAMING_CONFIG.approachRange && Math.abs(player.pos.y - target.state.pos.y) < 2.2;
    if ((a.stage === "ready" || a.stage === "trapped") && near && (player.speed ?? 0) <= FIELD_TAMING_CONFIG.quietSpeed) return finish();
    if (a.stage === "tether" && near && target.state.fieldTamingRecoveryRemaining > 0) {
      if (!spend("reinforced_tether")) return false;
      a.stage = "offer"; a.stageTime = 0; setIntent(a.id, { hold: true });
    } else if (a.stage === "offer" && near) {
      if (!canStart(target, a.species).ok || !spend("berry_lure")) return false;
      return finish();
    } else if (a.stage === "call" && distance(player.pos, a.point) <= (a.perch > 0 ? 2.8 : 4.5) && distance(player.pos, target.state.pos) >= 2.5 && (player.speed ?? 0) < 0.35) {
      a.stage = "perch"; a.calm = 0; setIntent(a.id, { targetPos: a.point, speed: 1.3, stopDistance: 0.65 });
    } else { onMessage(a.species.name, instruction(a).detail); return false; }
    onVisual(snapshot()); return true;
  }
  function update(dt, { hidden = false } = {}) {
    if (!attempt) return;
    const a = attempt, target = getTarget(a.id), player = getPlayer();
    if (hidden || !isActive() || a.sectionId !== getSectionId()) { clear(); return; }
    if (!target || target.state.playerDamaged || target.state.isDead || target.state.health < a.startHealth) { fail("The Wildkin's trust was broken. Try again on another expedition."); return; }
    a.age += dt; a.stageTime += dt;
    if (a.species.id === "emberhorn") a.point = { ...target.state.pos };
    if (a.age > FIELD_TAMING_CONFIG.lifetime || distance(player.pos, target.state.pos) > 18) { fail("You left the taming attempt behind."); return; }
    const gap = distance(player.pos, target.state.pos), foodGap = distance(player.pos, a.point), quiet = (player.speed ?? 0) <= FIELD_TAMING_CONFIG.quietSpeed;
    if (["ready", "trapped", "perch"].includes(a.stage) && !quiet && gap < 3.5) { fail("Rushing startled it. Prepare fresh gear and approach gently."); return; }
    if (a.stage === "lure" || a.stage === "feed" || a.stage === "snare") {
      const space = foodGap >= FIELD_TAMING_CONFIG.retreatRange && gap >= 2.2;
      setIntent(a.id, space ? { targetPos: a.point, speed: a.stage === "snare" ? 1.35 : 0.85, stopDistance: 0.6 } : { hold: true });
      if (distance(target.state.pos, a.point) < 0.85 && space && quiet) {
        if (a.stage === "snare") { a.stage = "trapped"; a.stageTime = 0; setIntent(a.id, { hold: true }); }
        else { a.stage = "feed"; a.calm += dt; if (a.calm >= FIELD_TAMING_CONFIG.feedSeconds) { a.stage = "ready"; setIntent(a.id, { hold: true }); } }
      } else if (a.stage === "feed") a.calm = Math.max(0, a.calm - dt);
    } else if (a.stage === "challenge" && (target.state.dodgedChargeSerial ?? 0) > a.chargeSerial && target.state.fieldTamingRecoveryRemaining > 0) {
      a.stage = "tether";
    } else if (a.stage === "tether" && !(target.state.fieldTamingRecoveryRemaining > 0)) {
      a.stage = "challenge"; a.chargeSerial = target.state.dodgedChargeSerial ?? 0;
    } else if ((a.stage === "trapped" || a.stage === "offer") && a.stageTime > FIELD_TAMING_CONFIG.trapSeconds) { fail("The Wildkin slipped free. Prepare fresh gear and try again."); return;
    } else if (a.stage === "perch" && distance(target.state.pos, a.point) < 0.9 && gap >= 2.5 && quiet) {
      a.calm += dt;
      if (a.calm >= 1.5) {
        setIntent(a.id, { hold: true });
        if (a.perch + 1 >= 2) { a.perch = 2; a.stage = "ready"; }
        else {
          // A second real destination, selected from clear ground near the
          // player. No creature teleport and no authored-world mutation.
          const point = placePoint(player, target, true);
          if (!point) { a.calm = 0; onMessage("Find another perch", "Face a nearby clear patch, then wait quietly."); return; }
          a.perch++; a.point = point; a.stage = "call"; a.calm = 0;
        }

      }
    }
    onVisual(snapshot());
  }
  return { begin, act, update, clear, getState: snapshot };
}
