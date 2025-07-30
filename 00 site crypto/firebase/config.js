// ===== FIREBASE/CONFIG.JS - CONFIGURATION FIREBASE =====

// ⚠️ REMPLACEZ CES VALEURS PAR VOTRE CONFIGURATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC80FH_vMaghEJhTgtgFqvK9j25L_1j5vo",
  authDomain: "buildtradeacademy.firebaseapp.com",
  projectId: "buildtradeacademy",
  storageBucket: "buildtradeacademy.firebasestorage.app",
  messagingSenderId: "216891258719",
  appId: "1:216891258719:web:a5e00edd48b9f0b14368ea",
  measurementId: "G-PXSZPFR802"
};

// Initialiser Firebase (version compat pour simplicité)
firebase.initializeApp(firebaseConfig);

// Configuration Firestore pour les règles de test
if (location.hostname === 'localhost') {
  console.log('🔥 Firebase en mode développement');
}

console.log('🔥 Firebase initialisé pour CryptoTraders Pro');
console.log('📊 Base de données Firestore connectée');
console.log('🔐 Authentication Firebase prête');

// Export global pour les autres fichiers - PAS DE DÉCLARATION DE VARIABLES ICI
window.firebaseConfig = firebaseConfig;
window.firebase = firebase;