// Script per sopprimere completamente i warning React
(function() {
  'use strict';
  
  // Intercetta console.warn che è quello usato da React per i warning
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const message = args[0];
    if (typeof message === 'string') {
      // Blocca specificamente il warning sui ref
      if (message.includes('Function components cannot be given refs') ||
          message.includes('forwardRef') ||
          message.includes('SlotClone')) {
        return; // Non mostrare questi warning
      }
    }
    return originalWarn.apply(this, args);
  };

  // Intercetta anche console.error per sicurezza
  const originalError = console.error;
  console.error = function(...args) {
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('Function components cannot be given refs') ||
          message.includes('forwardRef') ||
          message.includes('SlotClone')) {
        return; // Non mostrare questi errori
      }
    }
    return originalError.apply(this, args);
  };

  // Sovrascrive React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactDebugCurrentFrame
  // per bloccare i warning a livello più profondo
  if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    const internals = window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    if (internals.ReactDebugCurrentFrame) {
      const originalGetStackAddendum = internals.ReactDebugCurrentFrame.getStackAddendum;
      internals.ReactDebugCurrentFrame.getStackAddendum = function() {
        return ''; // Ritorna sempre una stringa vuota per non mostrare lo stack
      };
    }
  }

  console.log('React warnings suppressed');
})();