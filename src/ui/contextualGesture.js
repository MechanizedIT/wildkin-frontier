// A press belongs to the exact action the player saw, including its stage.
const key = (info, secondary) => info && `${info.type}|${info.id}|${secondary ? info.secondary?.action : info.action}|${secondary ? info.secondary?.label : info.label}`;
export function createContextualGesture() {
  let pressed = null;
  return {
    begin(info, secondary = false) { pressed = key(info, secondary); },
    cancel() { pressed = null; },
    complete(info, { secondary = false, keyboard = false, visible = false } = {}) {
      const same = keyboard || (pressed !== null && pressed === key(info, secondary));
      pressed = null;
      return !!info && visible && same && (secondary ? !!info.secondary : !info.disabled);
    },
  };
}
