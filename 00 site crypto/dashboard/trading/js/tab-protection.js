// ===== PROTECTION ANTI-CONFLIT SIMPLE =====

console.log('🛡️ Protection anti-conflit de données');

let canSaveToFirebase = true;

// Détecter conflit et bloquer sauvegardes
const ConflictProtection = {
  
  // Vérifier s'il y a conflit avant sauvegarde
async checkConflict() {
  if (!window.currentUser || !window.firebaseDb) return false;
  
  try {
    const doc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
    
    if (doc.exists) {
      const data = doc.data();
      const lastUpdate = data.lastTradingUpdate?.toMillis() || 0;
      const sessionStart = parseInt(sessionStorage.getItem('session_start')) || Date.now();
      
      // Créer un ID unique pour ce navigateur
      let browserId = localStorage.getItem('browser_id');
      if (!browserId) {
        browserId = 'browser_' + Date.now() + '_' + Math.random();
        localStorage.setItem('browser_id', browserId);
      }
      
      // Si c'est le même navigateur (localStorage partagé), pas de conflit
      const lastBrowser = data.lastBrowserId;
      if (lastBrowser === browserId) {
        return false; // Même navigateur = OK
      }
      
      // Sinon, vérifier le timing comme avant
      if (lastUpdate > sessionStart) {
        console.log('⚠️ CONFLIT DÉTECTÉ - autre navigateur actif');
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Erreur vérification conflit:', error);
    return false;
  }
},
  
  // Initialiser la session
  init() {
    sessionStorage.setItem('session_start', Date.now());
    console.log('✅ Protection anti-conflit initialisée');
  }
};

// Wrapper pour protéger saveTradingData
function protectFirebaseSave() {
  if (typeof window.saveTradingData === 'function') {
    const originalSave = window.saveTradingData;
    
    window.saveTradingData = async function(...args) {
      // Vérifier conflit avant sauvegarde
      const hasConflict = await ConflictProtection.checkConflict();
      
      if (hasConflict) {
        if (typeof showNotification === 'function') {
          showNotification('⚠️ Conflit détecté - sauvegarde bloquée. Rechargez la page.', 'error');
        }
        console.log('🚫 Sauvegarde bloquée pour éviter conflit');
        return;
      }
      
      // Sauvegarder normalement
      return originalSave.apply(this, args);
    };
    
    console.log('✅ saveTradingData protégée');
  }
}

// Initialisation
ConflictProtection.init();

// Protéger après chargement
setTimeout(protectFirebaseSave, 2000);

window.ConflictProtection = ConflictProtection;