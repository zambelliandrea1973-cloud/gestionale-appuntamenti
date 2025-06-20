import { io } from 'socket.io-client';

// Determina l'URL della socket in base al protocollo (http/https)
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}`;

// Crea un'istanza del socket.io
export const socketIo = io(wsUrl, { path: '/phone-device-socket' });