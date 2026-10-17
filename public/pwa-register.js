if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('YoResuelvo: no se pudo habilitar el modo sin conexión.', error);
    });
  });
}
