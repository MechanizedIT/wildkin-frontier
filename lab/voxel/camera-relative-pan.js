export function cameraRelativePan(keys, yaw, distance) {
  const forward = [-Math.sin(yaw), -Math.cos(yaw)];
  const right = [Math.cos(yaw), -Math.sin(yaw)];
  let x = 0, z = 0;
  if (keys.has('KeyW')) { x += forward[0]; z += forward[1]; }
  if (keys.has('KeyS')) { x -= forward[0]; z -= forward[1]; }
  if (keys.has('KeyD')) { x += right[0]; z += right[1]; }
  if (keys.has('KeyA')) { x -= right[0]; z -= right[1]; }
  const length = Math.hypot(x, z);
  return length > 0 ? [x / length * distance, z / length * distance] : [0, 0];
}
