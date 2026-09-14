export const SCOUT_FLIGHT_CONFIG = Object.freeze({ speed: 8, fastSpeed: 20, verticalSpeed: 6, maxHeight: 500, worldLimit: 10000 });

// Debug-only displacement. The existing controller owns pose and the body.
export function resolveScoutFlight(position, direction, vertical, fast, dt, floorAt, halfExtent = .52) {
  const cfg = SCOUT_FLIGHT_CONFIG;
  const step = Math.max(0, Math.min(.05, Number(dt) || 0));
  const speed = fast ? cfg.fastSpeed : cfg.speed;
  const cap = value => Math.max(-cfg.worldLimit, Math.min(cfg.worldLimit, value));
  const length = Math.hypot(direction.x || 0, direction.z || 0);
  const factor = length > 1 ? 1 / length : 1;
  const x = cap(position.x + (direction.x || 0) * factor * speed * step);
  const z = cap(position.z + (direction.z || 0) * factor * speed * step);
  const floor = Number(floorAt?.(x, z));
  const minimum = Math.max(-2, Number.isFinite(floor) ? floor : position.y - halfExtent) + halfExtent + .02;
  const y = Math.max(minimum, Math.min(cfg.maxHeight, position.y + Math.max(-1, Math.min(1, vertical || 0)) * cfg.verticalSpeed * step));
  return { x, y, z };
}
