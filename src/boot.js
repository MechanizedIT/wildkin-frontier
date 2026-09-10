// A visible boot/recovery boundary surrounds the game module in dev and release.
const status = document.getElementById("boot-status");
const canvas = document.getElementById("c");
function recover(title, detail) {
  status.replaceChildren();
  const heading = document.createElement("h1"), description = document.createElement("p"), button = document.createElement("button");
  heading.textContent = title;
  description.textContent = detail;
  button.textContent = "RELOAD FRONTIER";
  button.addEventListener("click", () => location.reload());
  status.append(heading, description, button);
  status.hidden = false;
  button.focus();
}
canvas.addEventListener("webglcontextlost", event => {
  event.preventDefault();
  window.dispatchEvent(new Event("frontier:graphics-interrupted"));
  recover("Your graphics session paused", "Reload to return to Camp. Secured progress stays in this browser; an unfinished expedition cannot be restored.");
});
try {
  await import("./main.js");
  status.hidden = true;
} catch (error) {
  console.error("[Wildkin Frontier] Could not start", error);
  recover("The frontier couldn't open", "Try reloading in a current browser with WebGL enabled. Serve the game through its local server rather than opening the HTML file directly.");
}
