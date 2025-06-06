/**
 * Script di emergenza per ripristinare l'accesso all'applicazione
 */

const express = require('express');
const session = require('express-session');
const passport = require('passport');

// Crea un middleware di bypass temporaneo per l'autenticazione
function createEmergencyAuth() {
  return (req, res, next) => {
    // Simula un utente autenticato
    req.user = {
      id: 12,
      username: "zambelli.andrea.1973D@gmail.com",
      type: "customer",
      email: "zambelli.andrea.1973D@gmail.com"
    };
    req.isAuthenticated = () => true;
    next();
  };
}

console.log('Emergency auth middleware created');
module.exports = { createEmergencyAuth };