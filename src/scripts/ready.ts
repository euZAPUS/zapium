/** La intro del hero espera a que termine la carga (si la hay). */
export const isLoading = (): boolean => document.documentElement.classList.contains('is-loading');

export const whenReady = (): Promise<void> =>
  isLoading()
    ? new Promise((resolve) => addEventListener('zapium:ready', () => resolve(), { once: true }))
    : Promise.resolve();
