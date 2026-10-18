// The animated background will live here (Milestone 15).
// Keep this component self-contained: nothing else should depend on it.
export function Background() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-canvas"
      style={{
        backgroundImage:
          'radial-gradient(60rem 40rem at 15% 10%, rgb(94 234 212 / 0.10), transparent 60%), radial-gradient(50rem 40rem at 85% 90%, rgb(99 102 241 / 0.12), transparent 60%)',
      }}
    />
  )
}