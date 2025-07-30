// ===== CRYPTOTRADERS PRO - PWA INSTALL MANAGER =====

console.log('📱 PWA Install Manager chargé');

class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.installButton = null;
    
    this.init();
  }
  
  init() {
    // Enregistrer le Service Worker
    this.registerServiceWorker();
    
    // Écouter les événements d'installation
    this.setupInstallEvents();
    
    // Créer le bouton d'installation
    this.createInstallButton();
    
    // Vérifier si déjà installé
    this.checkIfInstalled();
    
    console.log('✅ PWA Installer initialisé');
  }
  
  // ===== SERVICE WORKER =====
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ PWA: Service Worker non supporté');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/pwa/service-worker.js');
      console.log('✅ PWA: Service Worker enregistré:', registration.scope);
      
      // Vérifier les mises à jour
      registration.addEventListener('updatefound', () => {
        console.log('🔄 PWA: Mise à jour détectée');
        this.showUpdateNotification();
      });
      
    } catch (error) {
      console.error('❌ PWA: Erreur enregistrement Service Worker:', error);
    }
  }
  
  // ===== ÉVÉNEMENTS D'INSTALLATION =====
  setupInstallEvents() {
    // Capturer l'événement beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('📱 PWA: Prompt d\'installation disponible');
      
      // Empêcher l'affichage automatique
      event.preventDefault();
      
      // Sauvegarder l'événement pour plus tard
      this.deferredPrompt = event;
      
      // Afficher notre bouton custom
      this.showInstallButton();
    });
    
    // Détection installation réussie
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA: Application installée avec succès');
      this.isInstalled = true;
      this.hideInstallButton();
      this.showInstalledNotification();
    });
  }
  
  // ===== BOUTON D'INSTALLATION =====
  createInstallButton() {
    // Ne pas créer si déjà installé
    if (this.isInstalled) return;
    
    const button = document.createElement('button');
    button.id = 'pwa-install-btn';
    button.innerHTML = '📱 Installer l\'app';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(45deg, #00ff88, #00ccff);
      color: #000011;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 5px 15px rgba(0, 255, 136, 0.4);
      display: none;
      opacity: 1;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    button.addEventListener('click', () => this.promptInstall());
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 8px 25px rgba(0, 255, 136, 0.6)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 5px 15px rgba(0, 255, 136, 0.4)';
    });
    
    document.body.appendChild(button);
    this.installButton = button;
  }
  
  showInstallButton() {
    if (this.installButton && !this.isInstalled) {
      this.installButton.style.display = 'block';
      
      // Animation d'apparition
      setTimeout(() => {
        this.installButton.style.transform = 'scale(1)';
        this.installButton.style.opacity = '1';
      }, 100);
    }
  }
  
  hideInstallButton() {
    if (this.installButton) {
      this.installButton.style.display = 'none';
    }
  }
  
  // ===== INSTALLATION =====
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('⚠️ PWA: Prompt d\'installation non disponible');
      this.showManualInstallInstructions();
      return;
    }
    
    try {
      // Afficher le prompt natif
      this.deferredPrompt.prompt();
      
      // Attendre la réponse de l'utilisateur
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA: Installation acceptée');
      } else {
        console.log('❌ PWA: Installation refusée');
      }
      
      // Nettoyer
      this.deferredPrompt = null;
      this.hideInstallButton();
      
    } catch (error) {
      console.error('❌ PWA: Erreur lors de l\'installation:', error);
    }
  }
  
  // ===== VÉRIFICATIONS =====
  checkIfInstalled() {
    // Vérifier si lancé en mode standalone (installé)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 PWA: Application déjà installée (standalone)');
      this.isInstalled = true;
      this.hideInstallButton();
      return;
    }
    
    // Vérifier si lancé depuis l'écran d'accueil (iOS)
    if (window.navigator && window.navigator.standalone === true) {
      console.log('📱 PWA: Application déjà installée (iOS)');
      this.isInstalled = true;
      this.hideInstallButton();
      return;
    }
    
    console.log('🌐 PWA: Application lancée dans le navigateur');
  }
  
  // ===== NOTIFICATIONS =====
  showUpdateNotification() {
    if (typeof showNotification === 'function') {
      showNotification('🔄 Nouvelle version disponible ! Rechargez la page.', 'info');
    } else {
      console.log('🔄 PWA: Nouvelle version disponible');
    }
  }
  
  showInstalledNotification() {
    if (typeof showNotification === 'function') {
      showNotification('🎉 CryptoTraders Pro installé avec succès !', 'success');
    }
  }
  
  showManualInstallInstructions() {
    const instructions = this.getManualInstallInstructions();
    
    // Créer modal avec instructions
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.8); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
      <div style="
        background: #1a1a2e; color: white; padding: 2rem; border-radius: 15px;
        max-width: 400px; text-align: center; border: 1px solid #00ff88;
      ">
        <h3 style="color: #00ff88; margin-bottom: 1rem;">📱 Installer CryptoTraders</h3>
        <div style="text-align: left; margin-bottom: 1rem;">
          ${instructions}
        </div>
        <button onclick="this.closest('div').remove()" style="
          background: #00ff88; color: #000; border: none; padding: 10px 20px;
          border-radius: 5px; cursor: pointer; font-weight: bold;
        ">Compris</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fermer en cliquant à côté
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  getManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      return `
        <strong>Sur iPhone/iPad :</strong><br>
        1. Appuyez sur <strong>⎙ Partager</strong><br>
        2. Sélectionnez <strong>"Sur l'écran d'accueil"</strong><br>
        3. Appuyez sur <strong>"Ajouter"</strong>
      `;
    } else if (isAndroid) {
      return `
        <strong>Sur Android :</strong><br>
        1. Appuyez sur <strong>⋮ Menu</strong><br>
        2. Sélectionnez <strong>"Installer l'application"</strong><br>
        3. Confirmez l'installation
      `;
    } else {
      return `
        <strong>Sur ordinateur :</strong><br>
        1. Cliquez sur <strong>⚙️</strong> dans la barre d'adresse<br>
        2. Sélectionnez <strong>"Installer CryptoTraders"</strong><br>
        3. Confirmez l'installation
      `;
    }
  }
}

// ===== INITIALISATION =====
let pwaInstaller = null;

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pwaInstaller = new PWAInstaller();
  });
} else {
  pwaInstaller = new PWAInstaller();
}

// ===== EXPOSITION GLOBALE =====
window.PWAInstaller = PWAInstaller;
window.pwaInstaller = pwaInstaller;

console.log('✅ PWA Install Manager prêt');