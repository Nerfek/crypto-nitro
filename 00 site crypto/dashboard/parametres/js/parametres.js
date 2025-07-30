// ===== PARAMETRES.JS - MODULE PARAMÈTRES COMPLET =====

console.log('⚙️ Initialisation module Paramètres');

// ===== VÉRIFICATION AUTHENTIFICATION =====
function checkParametersAuth() {
    // Vérifier si l'utilisateur est connecté
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Utilisateur connecté - continuer
                return;
            } else {
                // Rediriger vers la page d'accueil si non connecté
                window.location.href = '../../index.html';
            }
        });
    }
}

// ===== VARIABLES GLOBALES =====
let currentSettings = {
    profile: {
        name: 'Astronaute',
        email: 'astronaute@crypto.space',
        avatarColor: 'linear-gradient(45deg, #00ff88, #00ccff)'
    },
    notifications: {
        trading: true,
        courses: true,
        newsletter: false,
        security: true
    },
    interface: {
        theme: 'dark',
        language: 'fr',
        sounds: true
    },
    trading: {
        leverage: 10,
        amount: 50,
        confirmTrades: true
    }
};

// ===== FONCTION PRINCIPALE =====
function initSettings() {
    console.log('⚙️ Initialisation module paramètres');
    
    // Charger les paramètres utilisateur
    loadUserSettings();
    
    // Afficher l'interface
    displaySettings();
    
    // Initialiser les événements
    initSettingsEvents();
    
    console.log('✅ Module paramètres initialisé');
}



// ===== CHARGEMENT DES PARAMÈTRES =====
async function loadUserSettings() {
    if (!window.currentUser || !window.currentUser.id) return;
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            const userDoc = await firebaseDb.collection('users').doc(window.currentUser.id).get();
            
            if (userDoc.exists) {
                const data = userDoc.data();
                
                // Charger les settings généraux
                if (data.settings) {
                    currentSettings = { ...currentSettings, ...data.settings };
                }
                
                // FORCER le chargement de la couleur d'avatar
                if (data.avatarColor) {
                    currentSettings.profile.avatarColor = data.avatarColor;
                    console.log('🎨 Couleur avatar chargée:', data.avatarColor);
                }
                
                console.log('⚙️ Paramètres utilisateur chargés');
            }
        }
    } catch (error) {
        console.log('⚠️ Erreur chargement paramètres:', error);
    }
}



// ===== AFFICHAGE DE L'INTERFACE =====
function displaySettings() {
    console.log('⚙️ Affichage interface paramètres');
    
    // Mettre à jour les champs profil
    updateProfileFields();
    
    // Mettre à jour les toggles de notifications
    updateNotificationToggles();
    
    // Mettre à jour les préférences interface
    updateInterfaceSettings();
    
    // Initialiser la sélection de couleur d'avatar
    initAvatarColorSelector();
    
    // Mettre à jour l'avatar selon le niveau
    updateAvatarFromLevel();
}




function updateProfileFields() {
    const nameInput = document.getElementById('settings-name');
    const emailInput = document.getElementById('settings-email');
    
    if (nameInput) {
        nameInput.value = window.currentUser?.name || currentSettings.profile.name;
    }
    
    if (emailInput) {
        emailInput.value = window.currentUser?.email || currentSettings.profile.email;
    }
}

function updateNotificationToggles() {
    Object.keys(currentSettings.notifications).forEach(key => {
        const toggle = document.getElementById(`notif-${key}`);
        if (toggle) {
            toggle.checked = currentSettings.notifications[key];
        }
    });
}



function updateInterfaceSettings() {
    const themeSelect = document.getElementById('theme-select');
    const languageSelect = document.getElementById('language-select');
    const soundsToggle = document.getElementById('interface-sounds');
    
    if (themeSelect) themeSelect.value = currentSettings.interface.theme;
    if (languageSelect) languageSelect.value = currentSettings.interface.language;
    if (soundsToggle) soundsToggle.checked = currentSettings.interface.sounds;
    
    // AJOUTER CETTE PARTIE POUR LES COULEURS D'AVATAR
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.color === currentSettings.profile.avatarColor) {
            option.classList.add('active');
        }
    });
    
    // Appliquer la couleur sauvegardée aux avatars
    if (currentSettings.profile.avatarColor) {
        updateAvatarColorsInUI(currentSettings.profile.avatarColor);
    }
}



// ===== SÉLECTEUR DE COULEUR D'AVATAR =====
function initAvatarColorSelector() {
    const colorOptions = document.querySelectorAll('.color-option');
    
    // Mettre à jour la sélection actuelle
    colorOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.color === currentSettings.profile.avatarColor) {
            option.classList.add('active');
        }
    });
    
    // Événements de sélection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Retirer l'ancienne sélection
            colorOptions.forEach(opt => opt.classList.remove('active'));
            
            // Ajouter la nouvelle sélection
            option.classList.add('active');
            
            // Mettre à jour les paramètres
            currentSettings.profile.avatarColor = option.dataset.color;
            
            // Mettre à jour les avatars dans l'interface
            updateAvatarColorsInUI(option.dataset.color);
            
            console.log('🎨 Couleur avatar changée:', option.dataset.color);
        });
    });
}

function updateAvatarColorsInUI(newColor) {
    // Mettre à jour tous les avatars dans l'interface
    const avatarElements = document.querySelectorAll('#user-avatar, .sidebar-avatar');
    avatarElements.forEach(el => {
        el.style.background = newColor;
    });
}

// ===== SYSTÈME DE NIVEAU D'AVATAR (UTILISE AUTH.JS) =====
function updateAvatarFromLevel() {
    if (!window.currentUser || !window.calculateUserRank) return;
    
    // Utiliser le système centralisé de auth.js
    const portfolio = window.currentUser.portfolio || 500;
    const rankData = window.calculateUserRank(portfolio);
    
    // Mettre à jour les avatars avec le bon emoji ET couleur
    const avatarElements = document.querySelectorAll('#user-avatar, .sidebar-avatar');
    avatarElements.forEach(el => {
        el.textContent = rankData.avatar;
        el.style.background = currentSettings.profile.avatarColor;
    });
    
    // Mettre à jour le rang
    const rankElement = document.querySelector('.user-rank');
    if (rankElement) {
        rankElement.textContent = rankData.rank;
    }
    
    console.log('🏆 Avatar mis à jour:', rankData.rank);
}

// ===== ÉVÉNEMENTS =====
function initSettingsEvents() {
    console.log('🎯 Événements paramètres initialisés');
    
    // Bouton sauvegarder profil
    initSaveProfileButton();
    
    // Boutons sécurité
    initSecurityButtons();
    
    // Toggles de notifications
    initNotificationToggles();
    
    // Préférences interface
    initInterfaceEvents();
    
    // Préférences trading
    initTradingEvents();
    
    // Zone danger
    initDangerZone();
}

function initSaveProfileButton() {
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('settings-name');
            const emailInput = document.getElementById('settings-email');
            
            if (nameInput) currentSettings.profile.name = nameInput.value;
            if (emailInput) currentSettings.profile.email = emailInput.value;
            
            await saveSettings();
            showNotification('💾 Profil sauvegardé !', 'success');
        });
    }
}

function initSecurityButtons() {
    const changePasswordBtn = document.getElementById('change-password-btn');
    const setup2faBtn = document.getElementById('setup-2fa-btn');
    const manageSessionsBtn = document.getElementById('manage-sessions-btn');
    
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            showNotification('🔑 Redirection vers la page de modification...', 'info');
        });
    }
    
    if (setup2faBtn) {
        setup2faBtn.addEventListener('click', () => {
            showNotification('📱 Configuration 2FA bientôt disponible !', 'info');
        });
    }
    
    if (manageSessionsBtn) {
        manageSessionsBtn.addEventListener('click', () => {
            showNotification('🚪 Gestion des sessions bientôt disponible !', 'info');
        });
    }
}

function initNotificationToggles() {
    Object.keys(currentSettings.notifications).forEach(key => {
        const toggle = document.getElementById(`notif-${key}`);
        if (toggle) {
            toggle.addEventListener('change', async () => {
                currentSettings.notifications[key] = toggle.checked;
                await saveSettings();
                
                const status = toggle.checked ? 'activées' : 'désactivées';
                showNotification(`🔔 Notifications ${key} ${status}`, 'success');
            });
        }
    });
}

function initInterfaceEvents() {
    const themeSelect = document.getElementById('theme-select');
    const languageSelect = document.getElementById('language-select');
    const soundsToggle = document.getElementById('interface-sounds');
    
    if (themeSelect) {
        themeSelect.addEventListener('change', async () => {
            currentSettings.interface.theme = themeSelect.value;
            await saveSettings();
            showNotification(`🎨 Thème changé: ${themeSelect.value}`, 'success');
        });
    }
    
    if (languageSelect) {
        languageSelect.addEventListener('change', async () => {
            currentSettings.interface.language = languageSelect.value;
            await saveSettings();
            showNotification(`🌍 Langue changée: ${languageSelect.value}`, 'success');
        });
    }
    
    if (soundsToggle) {
        soundsToggle.addEventListener('change', async () => {
            currentSettings.interface.sounds = soundsToggle.checked;
            await saveSettings();
            
            const status = soundsToggle.checked ? 'activés' : 'désactivés';
            showNotification(`🔊 Sons ${status}`, 'success');
        });
    }
}

function initTradingEvents() {
    const leverageSelect = document.getElementById('default-leverage');
    const amountInput = document.getElementById('default-amount');
    const confirmToggle = document.getElementById('confirm-trades');
    
    if (leverageSelect) {
        leverageSelect.addEventListener('change', async () => {
            currentSettings.trading.leverage = parseInt(leverageSelect.value);
            await saveSettings();
            showNotification(`💰 Levier par défaut: ${leverageSelect.value}x`, 'success');
        });
    }
    
    if (amountInput) {
        amountInput.addEventListener('change', async () => {
            currentSettings.trading.amount = parseInt(amountInput.value);
            await saveSettings();
            showNotification(`💰 Montant par défaut: $${amountInput.value}`, 'success');
        });
    }
    
    if (confirmToggle) {
        confirmToggle.addEventListener('change', async () => {
            currentSettings.trading.confirmTrades = confirmToggle.checked;
            await saveSettings();
            
            const status = confirmToggle.checked ? 'activées' : 'désactivées';
            showNotification(`⚠️ Confirmations ${status}`, 'success');
        });
    }
}

function initDangerZone() {
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const resetPortfolioBtn = document.getElementById('reset-portfolio-btn');
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            if (confirm('⚠️ ATTENTION ! Cette action est irréversible.\n\nÊtes-vous sûr de vouloir supprimer votre compte ?')) {
                showNotification('🗑️ Suppression en cours...', 'warning');
                // Logique de suppression à implémenter
            }
        });
    }
    
    if (resetPortfolioBtn) {
        resetPortfolioBtn.addEventListener('click', () => {
            if (confirm('🔄 Confirmer la réinitialisation du portfolio ?\n\nVotre solde sera remis à 500$.')) {
                showNotification('🔄 Portfolio réinitialisé !', 'success');
                // Logique de reset à implémenter
            }
        });
    }
}



// ===== SAUVEGARDE =====
async function saveSettings() {
  if (!window.currentUser || !window.currentUser.id) return;
  
  try {
    if (typeof firebaseDb !== 'undefined') {
      await firebaseDb.collection('users').doc(window.currentUser.id).update({
        settings: currentSettings,
        name: currentSettings.profile.name,
        email: currentSettings.profile.email,
        avatarColor: currentSettings.profile.avatarColor, // ← AJOUTER CETTE LIGNE
        updatedAt: new Date()
      });
      console.log('💾 Paramètres sauvegardés dans Firebase');
    }
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
    showNotification('❌ Erreur lors de la sauvegarde', 'error');
  }
}




// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Notification visuelle simple
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#00ff88' : '#00ccff'};
    color: ${type === 'success' ? '#000011' : '#ffffff'};
    padding: 1rem 1.5rem;
    border-radius: 8px;
    z-index: 10000;
    font-weight: 600;
  `;
  notification.textContent = message.replace(/[🎯🔔💾🎨🌍🔊💰⚠️🗑️🔄❌]/g, '');
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// ===== EXPOSITION GLOBALE =====
window.initSettings = initSettings;
window.currentSettings = currentSettings;

// ===== VÉRIFICATION AU CHARGEMENT =====
document.addEventListener('DOMContentLoaded', checkParametersAuth);


// Auto-démarrage si on est sur la page paramètres
if (window.location.pathname.includes('parametres.html')) {
    document.addEventListener('DOMContentLoaded', initSettings);
}

console.log('✅ Module paramètres complet chargé');