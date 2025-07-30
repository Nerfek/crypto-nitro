// ===== PROTECTION CROSS-BROWSER AVEC DÉCONNEXION =====
// À ajouter dans auth.js ou créer un nouveau fichier

console.log('🛡️ Protection cross-browser avec déconnexion automatique');

// ===== VARIABLES GLOBALES =====
let sessionId = null;
let heartbeatInterval = null;
let checkSessionInterval = null;
let isSessionActive = true;

// ===== GÉNÉRATION SESSION ID =====
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===== PROTECTION SESSION UNIQUE =====
const SessionProtection = {
  
  // Initialiser la protection
    async init() {
      if (!window.currentUser || !window.firebaseDb) {
        console.log('⚠️ Utilisateur non connecté ou Firebase non disponible');
        return;
      }
      
      // DÉSACTIVER EN LOCAL
      if (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        console.log('🚫 Protection session DÉSACTIVÉE en environnement local');
        return;
      }
    
    sessionId = generateSessionId();
    console.log('🔰 Session ID généré:', sessionId);
    
    await this.claimSession();
    this.startHeartbeat();
    this.startMonitoring();
    
    console.log('✅ Protection session initialisée');
  },
  
// Revendiquer la session dans Firebase (ÉCRASE les anciennes)
// REMPLACER la fonction claimSession() existante par :
async claimSession() {
    if (!window.currentUser || !window.firebaseDb) return;

    // NOUVEAU : Anti-spam (max 1 écriture par 30 secondes)
    if (SessionProtection.lastWrite && (Date.now() - SessionProtection.lastWrite) < 30000) {
        console.log('🚫 Claim session bloqué (anti-spam)');
        return;
    }
    
    try {
        const userDoc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
        const existingSession = userDoc.data()?.activeSession;
        
        // VÉRIFIER si session déjà identique
        if (existingSession && existingSession.sessionId === sessionId) {
            console.log('✅ Session déjà active, pas d\'écriture Firebase');
            isSessionActive = true;
            return;
        }
        
        // ÉCRIRE seulement si différent
        const sessionData = {
            sessionId: sessionId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            browser: this.getBrowserInfo(),
            ip: await this.getClientIP(),
            url: window.location.href
        };
        
        await window.firebaseDb.collection('users').doc(window.currentUser.id).set({
            activeSession: sessionData
        }, { merge: true });

        // NOUVEAU : Délai anti-spam
        SessionProtection.lastWrite = Date.now();
        
        isSessionActive = true;
        console.log('👑 Session active revendiquée:', sessionId);
        
    } catch (error) {
        console.error('❌ Erreur claim session:', error);
    }
},
  
  // Obtenir info navigateur
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';
    
    return {
      name: browser,
      userAgent: ua,
      platform: navigator.platform
    };
  },
  
    // Obtenir IP (optionnel)
    async getClientIP() {
    if (location.protocol === 'file:') {
        return 'local-file';
    }
    
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
    },
  
  // Vérifier si cette session est toujours active
  async isActiveSession() {
    if (!window.currentUser || !window.firebaseDb) return false;
    
    try {
      const userDoc = await window.firebaseDb.collection('users').doc(window.currentUser.id).get();
      
      if (userDoc.exists) {
        const data = userDoc.data();
        const activeSession = data.activeSession;
        
        if (!activeSession) return false;
        
        // Vérifier si c'est notre session
        return activeSession.sessionId === sessionId;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Erreur vérification session:', error);
      return false;
    }
  },
  
// Heartbeat pour maintenir la session
startHeartbeat() {
  // ✅ PAS de heartbeat - la session reste active tant que la page est ouverte
  console.log('✅ Heartbeat désactivé - utilisation événements temps réel seulement');
},
  
  // Surveiller les conflits de session
  startMonitoring() {
    if (!window.currentUser || !window.firebaseDb) return;
    
    // Surveillance Firebase en temps réel
    this.unsubscribe = window.firebaseDb.collection('users').doc(window.currentUser.id)
      .onSnapshot((doc) => {
        if (doc.exists && isSessionActive) {
          const data = doc.data();
          const activeSession = data.activeSession;
          
          if (activeSession && activeSession.sessionId !== sessionId) {
              // Vérifier si c'est vraiment un conflit (pas notre propre remplacement)
              const timeDiff = Date.now() - (activeSession.timestamp?.toMillis() || 0);
              if (timeDiff > 5000) { // 5 secondes de grâce
                  console.log('🚨 CONFLIT DÉTECTÉ - Autre session active:', activeSession.sessionId);
                  this.handleSessionConflict(activeSession);
              } else {
                  console.log('🔄 Remplacement de session en cours, pas de conflit');
              }
          }
        }
      });
    
    // Vérification périodique de backup
    // Vérification périodique MOINS AGRESSIVE
    // ✅ PAS de polling - Firebase onSnapshot gère tout
    console.log('✅ Monitoring périodique désactivé - onSnapshot actif');
  },
  
  // Gérer le conflit de session
  handleSessionConflict(conflictSession = null) {
    isSessionActive = false;
    
    // Arrêter tous les intervalles
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    if (checkSessionInterval) {
      clearInterval(checkSessionInterval);
      checkSessionInterval = null;
    }
    
    // Arrêter le trading
    if (typeof priceUpdateInterval !== 'undefined' && priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
    }
    
    // Message d'information
    let message = '🚨 Session remplacée par un autre navigateur';
    if (conflictSession) {
      message += `\n\nAutre session détectée:\n• Navigateur: ${conflictSession.browser?.name || 'Inconnu'}\n• Platform: ${conflictSession.browser?.platform || 'Inconnue'}`;
    }
    
    // Afficher modal de déconnexion
    this.showSessionExpiredModal(message);
    
    // Déconnexion automatique après 3 secondes
    setTimeout(() => {
      this.forceLogout();
    }, 3000);
  },
  
  // Afficher modal de session expirée
  showSessionExpiredModal(message) {
    // Supprimer modal existante
    const existing = document.getElementById('session-expired-modal');
    if (existing) existing.remove();
    
    // Créer modal
    const modal = document.createElement('div');
    modal.id = 'session-expired-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      color: #ffffff;
      padding: 2rem;
      border-radius: 15px;
      max-width: 500px;
      text-align: center;
      border: 2px solid #ff4757;
      box-shadow: 0 20px 60px rgba(255, 71, 87, 0.3);
    `;
    
    content.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 1rem;">🚨</div>
      <h2 style="color: #ff4757; margin-bottom: 1rem;">Session Expirée</h2>
      <p style="margin-bottom: 1.5rem; line-height: 1.5;">${message.replace(/\n/g, '<br>')}</p>
      <p style="font-size: 0.9rem; opacity: 0.8;">Déconnexion automatique dans 3 secondes...</p>
      <button id="force-logout-btn" style="
        background: #ff4757;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        margin-top: 1rem;
        cursor: pointer;
        font-weight: 600;
      ">Se déconnecter maintenant</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Bouton déconnexion immédiate
    document.getElementById('force-logout-btn').addEventListener('click', () => {
      this.forceLogout();
    });
    
    // Notification sonore (optionnel)
    if (typeof showNotification === 'function') {
      showNotification('🚨 Session remplacée - Déconnexion automatique', 'error');
    }
  },
  
  // Forcer la déconnexion
  async forceLogout() {
    try {
      console.log('🚪 Déconnexion forcée - session expirée');
      
      // Supprimer modal
      const modal = document.getElementById('session-expired-modal');
      if (modal) modal.remove();
      
      console.log('🔧 Session non supprimée - autre navigateur actif');
      
      // Déconnexion Firebase Auth
      if (window.firebaseAuth) {
        await window.firebaseAuth.signOut();
      }
      
      // Nettoyer localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirection
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Erreur déconnexion forcée:', error);
      window.location.reload();
    }
  },
  
  // Nettoyer à la fermeture
  cleanup() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    if (checkSessionInterval) {
      clearInterval(checkSessionInterval);
      checkSessionInterval = null;
    }
    
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    // NE nettoyer que si c'est NOTRE session qui se ferme normalement
    if (isSessionActive && window.currentUser && window.firebaseDb && sessionId) {
      window.firebaseDb.collection('users').doc(window.currentUser.id).get().then(doc => {
        if (doc.exists && doc.data().activeSession?.sessionId === sessionId) {
          // C'est notre session, on peut la supprimer
          window.firebaseDb.collection('users').doc(window.currentUser.id).update({
            activeSession: firebase.firestore.FieldValue.delete()
          });
        }
      }).catch(e => console.log('Erreur cleanup session:', e));
    }
    
    console.log('🧹 Protection session nettoyée');
  }
};

// ===== INTÉGRATION AVEC AUTH =====
// À ajouter dans handleAuthStateChanged() après connexion réussie
function initSessionProtectionAfterLogin() {
  setTimeout(() => {
    if (window.currentUser) {
      SessionProtection.init();
    }
  }, 2000);
}

// ===== ÉVÉNEMENTS =====
window.addEventListener('beforeunload', () => {
  SessionProtection.cleanup();
});

window.addEventListener('unload', () => {
  SessionProtection.cleanup();
});

// ===== EXPOSITION GLOBALE =====
window.SessionProtection = SessionProtection;
window.initSessionProtection = initSessionProtectionAfterLogin;

// ===== DEBUG =====
window.debugSession = function() {
  console.log('🔍 === DÉBOGAGE SESSION ===');
  console.log('Session ID:', sessionId);
  console.log('Is Active:', isSessionActive);
  console.log('Heartbeat Active:', !!heartbeatInterval);
  console.log('Monitoring Active:', !!checkSessionInterval);
  console.log('User:', window.currentUser?.id);
};

console.log('✅ Protection session cross-browser chargée');
console.log('🎯 Initialisation automatique après connexion');
console.log('🔍 Tapez debugSession() pour déboguer');