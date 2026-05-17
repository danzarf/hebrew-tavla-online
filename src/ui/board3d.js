export function createBoard3DLayer({ boardEl } = {}) {
  const active = !!boardEl;
  if (active) boardEl.classList.add('board3dActive');

  return {
    init: () => active,
    renderState: () => {},
    renderDice: () => {},
    isActive: () => active,
    isEnabled: () => active,
  };
}
