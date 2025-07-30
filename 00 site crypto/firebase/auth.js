// ===== FIREBASE/AUTH.JS - VERSION COMPLÈTE RÉÉCRITE =====

console.log('🔐 Démarrage système authentification CryptoTraders Pro');

// ===== VARIABLES GLOBALES =====
window.currentUser = null;
window.isLoggedIn = false;

// Références Firebase
let firebaseAuth = null;
let firebaseDb = null;
let googleProvider = null;

// ===== INITIALISATION FIREBASE =====
function initFirebase() {
  try {
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    
    // EXPOSER IMMÉDIATEMENT GLOBALEMENT
    window.firebaseDb = firebaseDb;
    window.firebaseAuth = firebaseAuth;
    
    console.log('✅ Firebase initialisé et exposé globalement');
    console.log('🔍 firebaseDb exposé:', !!window.firebaseDb);
    return true;
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error);
    return false;
  }
}

// AJOUTER cette fonction utilitaire au début de auth.js
function compareUserData(oldData, newData) {
    // Comparer seulement les champs qui comptent vraiment
    const fieldsToCompare = ['rank', 'avatar', 'portfolio', 'dailyGain', 'level'];
    
    for (const field of fieldsToCompare) {
        if (oldData[field] !== newData[field]) {
            return false; // Différent
        }
    }
    return true; // Identique
}

// ===== GESTION DES NOTIFICATIONS =====
function showNotification(message, type = 'info') {
  // Supprimer notification existante
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  const colors = {
    success: 'rgba(0, 255, 136, 0.9)',
    error: 'rgba(255, 71, 87, 0.9)',
    info: 'rgba(0, 200, 255, 0.9)'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: ${type === 'info' ? '#ffffff' : '#000011'};
    padding: 1rem 1.5rem;
    border-radius: 8px;
    z-index: 10001;
    font-weight: 600;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    word-wrap: break-word;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.style.transform = 'translateX(0)', 100);
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ===== GESTION DES MODALS =====
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    console.log('📋 Modal ouverte:', modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    console.log('📋 Modal fermée:', modalId);
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('active');
  });
  document.body.style.overflow = '';
}

// ===== GESTION UTILISATEUR =====
async function createUserProfile(firebaseUser) {
  const userData = {
    name: firebaseUser.displayName || 'Astronaute',
    email: firebaseUser.email,
    avatar: '👨‍🚀',
    rank: '🚀 Cadet Spatial',
    portfolio: 500,
    dailyGain: 0,
    joinDate: firebase.firestore.FieldValue.serverTimestamp(),
    formations: {
      completed: 0,
      total: 12,
      progress: 0
    },
    // === AJOUTER LA STRUCTURE POINTS ===
    points: {
        total: 0,
        level: 1,
        levelName: "🌟 Astronaute Débutant",
        avatar: "👨‍🚀",
        history: [],
        dailyStreak: 0,
        lastLogin: null,
        stats: {
            totalEarned: 0,
            actionsCompleted: 0,
            streaksCompleted: 0
        }
    },
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  await firebaseDb.collection('users').doc(firebaseUser.uid).set(userData);
  console.log('✅ Profil utilisateur créé');
  
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    ...userData
  };
}

async function getUserData(firebaseUser) {
  try {
    const userDoc = await firebaseDb.collection('users').doc(firebaseUser.uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();

      // Charger/synchroniser les points
      let userPoints = userData.points;
      if (!userPoints) {
          // Créer structure points si manquante
          userPoints = {
              total: 0,
              level: 1,
              levelName: "🌟 Astronaute Débutant",
              avatar: "👨‍🚀",
              history: [],
              dailyStreak: 0,
              lastLogin: null,
              stats: { totalEarned: 0, actionsCompleted: 0, streaksCompleted: 0 }
          };
      }
      console.log('📊 Données utilisateur récupérées:', userData.name);
      
      // TOUJOURS recalculer le rang basé sur le portfolio
      const portfolio = userData.portfolio || 500;
      const rankData = calculateUserRank(portfolio);

      return {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData.name || firebaseUser.displayName || 'Astronaute',
        avatar: rankData.avatar,
        rank: rankData.rank,
        portfolio: portfolio,
        dailyGain: userData.dailyGain || 0,
        joinDate: userData.joinDate,
        formations: userData.formations || {
          completed: 0,
          total: 12,
          progress: 0
        },
        role: userData.role || 'user',
        isAdmin: userData.isAdmin || false,
        points: userPoints
      };
    } else {
      console.log('👤 Nouveau utilisateur - création profil');
      return await createUserProfile(firebaseUser);
    }
  } catch (error) {
    console.error('❌ Erreur getUserData:', error);
    
    // Données par défaut en cas d'erreur
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || 'Astronaute',
      avatar: calculateUserRank(500).avatar,
      rank: calculateUserRank(500).rank,
      portfolio: 500,
      dailyGain: 0,
      formations: { completed: 0, total: 12, progress: 0 }
    };
  }
}

// ===== MISE À JOUR UI =====
function updateUI() {
  const authButtons = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  
  if (window.isLoggedIn && window.currentUser) {
    // Utilisateur connecté
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (userName) userName.textContent = window.currentUser.name;
    if (userAvatar) userAvatar.textContent = window.currentUser.avatar;
    
    console.log('🎨 UI mise à jour pour:', window.currentUser.name);
  } else {
    // Utilisateur déconnecté
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    
    console.log('🎨 UI mise à jour - utilisateur déconnecté');
  }
}

// ===== AUTHENTIFICATION =====
async function handleAuthStateChanged(user) {
  console.log('🔄 Changement état auth:', user ? user.email : 'déconnecté');
  
  if (user) {
    try {
      window.currentUser = await getUserData(user);

      // Initialiser/charger les points utilisateur
      if (typeof window.PointsSystem !== 'undefined') {
          console.log('🎮 Chargement points utilisateur...');
          await window.PointsSystem.loadUserPoints(user.uid);
          await window.PointsSystem.handleDailyLogin(user.uid);
      }

      // Migration automatique SEULEMENT si nécessaire
      await migrateUserRankSystem();
      window.isLoggedIn = true;
      
      const urlParams = new URLSearchParams(window.location.search);
      const fromDashboard = urlParams.get('from');

      if (typeof SessionProtection !== 'undefined') {
        setTimeout(() => {
          SessionProtection.init();
          console.log('🛡️ Protection session lancée');
        }, 1000);
      }

      // REDIRECTION ADMIN...
      const isAdmin = window.currentUser.role === 'admin' || window.currentUser.isAdmin === true;
      if (isAdmin) {
        const isOnHomePage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
        if (isOnHomePage) {
          setTimeout(() => {
            window.location.href = '../dashboard/admin/admin.html';
          }, 1500);
        }
      }
      
      updateUI();
      updateDashboardData();
      updateAllPagesUI();
      
      // ✅ NOUVEAU : Sauvegarder lastLogin seulement si > 30 minutes
      await updateLastLoginIfNeeded(user.uid);
      
      // Vérifier si c'est une nouvelle connexion
      const isNewLogin = !sessionStorage.getItem('user_already_welcomed');
      if (isNewLogin) {
        showNotification(`🎉 Bienvenue ${window.currentUser.name} !`, 'success');
        sessionStorage.setItem('user_already_welcomed', 'true');
      }
      
    } catch (error) {
      console.error('❌ Erreur handleAuthStateChanged:', error);
      showNotification('⚠️ Erreur de chargement des données', 'error');
    }
  } else {
    window.currentUser = null;
    window.isLoggedIn = false;
    updateUI();
    closeDashboard();
  }
}

async function updateLastLoginIfNeeded(userId) {
  try {
    // Récupérer la dernière connexion
    const userDoc = await firebaseDb.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    const lastLoginTime = userData.lastLogin?.toMillis() || 0;
    const now = Date.now();
    const timeDiff = now - lastLoginTime;
    
    // Sauvegarder seulement si > 30 minutes (1 800 000 ms)
    if (timeDiff > 1800000) {
      await firebaseDb.collection('users').doc(userId).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('💾 LastLogin mis à jour (> 30min)');
    } else {
      console.log('🚫 LastLogin pas mis à jour (< 30min)');
    }
  } catch (error) {
    console.error('❌ Erreur updateLastLogin:', error);
  }
}



// ===== CONNEXION =====
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  
  if (!email || !password) {
    showNotification('❌ Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (!email.includes('@')) {
    showNotification('❌ Format d\'email invalide', 'error');
    return;
  }
  
  try {
    showNotification('🚀 Connexion en cours...', 'info');
    console.log('🔐 Tentative connexion:', email);
    
    await firebaseAuth.signInWithEmailAndPassword(email, password);
    closeModal('login-modal');
    
    // Réinitialiser le formulaire
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    console.log('✅ Connexion réussie');
    
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    
    let message = '❌ Erreur de connexion';
    switch (error.code) {
      case 'auth/user-not-found':
        message = '❌ Aucun compte trouvé avec cet email';
        break;
      case 'auth/wrong-password':
      case 'auth/invalid-login-credentials':
        message = '❌ Email ou mot de passe incorrect';
        break;
      case 'auth/invalid-email':
        message = '❌ Format d\'email invalide';
        break;
      case 'auth/too-many-requests':
        message = '❌ Trop de tentatives. Réessayez plus tard';
        break;
      case 'auth/network-request-failed':
        message = '❌ Problème de réseau';
        break;
    }
    showNotification(message, 'error');
  }
}

// ===== INSCRIPTION =====
async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('register-name')?.value?.trim();
  const email = document.getElementById('register-email')?.value?.trim();
  const password = document.getElementById('register-password')?.value;
  const confirm = document.getElementById('register-confirm')?.value;
  const terms = document.getElementById('accept-terms')?.checked;
  
  // Validations
  if (!name || !email || !password || !confirm) {
    showNotification('❌ Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (name.length < 2) {
    showNotification('❌ Le nom doit contenir au moins 2 caractères', 'error');
    return;
  }
  
  if (!email.includes('@')) {
    showNotification('❌ Format d\'email invalide', 'error');
    return;
  }
  
  if (password !== confirm) {
    showNotification('❌ Les mots de passe ne correspondent pas', 'error');
    return;
  }
  
  if (password.length < 6) {
    showNotification('❌ Le mot de passe doit contenir au moins 6 caractères', 'error');
    return;
  }
  
  if (!terms) {
    showNotification('❌ Veuillez accepter les conditions d\'utilisation', 'error');
    return;
  }
  
  try {
    showNotification('🚀 Création du compte...', 'info');
    console.log('📝 Création compte:', email);
    
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    
    // Mettre à jour le profil
    await userCredential.user.updateProfile({
      displayName: name
    });
    
    closeModal('register-modal');
    
    // Réinitialiser le formulaire
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    document.getElementById('accept-terms').checked = false;
    
    console.log('✅ Compte créé:', email);
    showNotification('🎉 Compte créé ! Bonus de 500$ offert !', 'success');
    
  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    
    let message = '❌ Erreur lors de la création du compte';
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = '❌ Un compte existe déjà avec cet email';
        break;
      case 'auth/invalid-email':
        message = '❌ Format d\'email invalide';
        break;
      case 'auth/weak-password':
        message = '❌ Mot de passe trop faible (minimum 6 caractères)';
        break;
    }
    showNotification(message, 'error');
  }
}

// ===== CONNEXION GOOGLE =====
async function handleGoogleLogin() {
  try {
    showNotification('🚀 Connexion Google...', 'info');
    console.log('📱 Connexion Google');
    
    const result = await firebaseAuth.signInWithPopup(googleProvider);
    closeModal('login-modal');
    
    console.log('✅ Connexion Google réussie:', result.user.displayName);
    
  } catch (error) {
    console.error('❌ Erreur Google:', error);
    
    if (error.code !== 'auth/popup-closed-by-user' && 
        error.code !== 'auth/cancelled-popup-request') {
      showNotification('❌ Erreur lors de la connexion Google', 'error');
    }
  }
}

// ===== DÉCONNEXION =====
async function handleLogout() {
  try {
    console.log('🚪 Déconnexion:', window.currentUser?.name);
    sessionStorage.removeItem('user_already_welcomed');
    await firebaseAuth.signOut();
    showNotification('👋 À bientôt !', 'info');
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    showNotification('❌ Erreur lors de la déconnexion', 'error');
  }
}

// ===== MOT DE PASSE OUBLIÉ =====
async function handleForgotPassword() {
  const email = document.getElementById('login-email')?.value?.trim();
  
  if (!email) {
    showNotification('❌ Veuillez saisir votre email d\'abord', 'error');
    return;
  }
  
  try {
    await firebaseAuth.sendPasswordResetEmail(email);
    showNotification('📧 Email de réinitialisation envoyé !', 'success');
    console.log('📧 Reset email envoyé à:', email);
  } catch (error) {
    console.error('❌ Erreur reset:', error);
    
    let message = '❌ Erreur lors de l\'envoi de l\'email';
    if (error.code === 'auth/user-not-found') {
      message = '❌ Aucun compte trouvé avec cet email';
    }
    showNotification(message, 'error');
  }
}

// ===== DASHBOARD =====
function openDashboard() {
  console.log('🚀 Tentative ouverture dashboard');
  console.log('isLoggedIn:', window.isLoggedIn);
  console.log('currentUser:', window.currentUser);
  
  if (!window.isLoggedIn || !window.currentUser) {
    showNotification('❌ Veuillez vous connecter pour accéder au tableau de bord', 'error');
    openModal('login-modal');
    return;
  }
  
  const dashboard = document.getElementById('user-dashboard');
  if (!dashboard) {
    console.error('❌ Element dashboard non trouvé');
    showNotification('❌ Dashboard introuvable', 'error');
    return;
  }
  
  console.log('📊 Ouverture dashboard...');
  updateDashboardData();
  dashboard.classList.add('active');
  dashboard.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  // Activer la section par défaut
  setTimeout(() => switchDashboardSection('overview'), 100);
  
  console.log('✅ Dashboard ouvert pour:', window.currentUser.name);
}

function closeDashboard() {
  const dashboard = document.getElementById('user-dashboard');
  if (dashboard) {
    dashboard.classList.remove('active');
    dashboard.style.display = 'none';
    document.body.style.overflow = '';
    console.log('✅ Dashboard fermé');
  }
}

function switchDashboardSection(sectionName) {
  console.log('🔄 Changement section:', sectionName);
  
  // Désactiver toutes les sections
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  
  // Désactiver tous les nav items
  document.querySelectorAll('.dashboard-nav .nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Activer la section cible
  const targetSection = document.getElementById(`section-${sectionName}`);
  const targetNav = document.querySelector(`[data-section="${sectionName}"]`);
  
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
    console.log(`✅ Section ${sectionName} activée`);
  } else {
    console.error(`❌ Section ${sectionName} non trouvée`);
  }
  
  if (targetNav) {
    targetNav.classList.add('active');
  }
}

function updateDashboardData() {
  if (!window.currentUser) return;



if (window.location.pathname.includes('portfolio.html')) {
  console.log('🚫 Page portfolio - pas de mise à jour données portfolio');
  // Mettre à jour SEULEMENT l'UI utilisateur, pas les données portfolio
  const dashboardUserName = document.getElementById('dashboard-user-name');
  if (dashboardUserName) {
    dashboardUserName.textContent = window.currentUser.name;
  }
  return;
}
  
  console.log('📊 Mise à jour données dashboard');
  
  // Nom utilisateur
  const dashboardUserName = document.getElementById('dashboard-user-name');
  if (dashboardUserName) {
    dashboardUserName.textContent = window.currentUser.name;
  }
  
  // Portfolio - avec protection
  const portfolioValueElement = document.querySelector('.metric-value');
  if (portfolioValueElement) {
    const portfolio = window.currentUser.portfolio || 500;
    portfolioValueElement.textContent = `$${portfolio.toFixed(2)}`;
  }
  
  // Gains du jour - avec protection
  const metricValueElements = document.querySelectorAll('.metric-value');
  if (metricValueElements[1]) {
    const dailyGain = window.currentUser.dailyGain || 0;
    const sign = dailyGain >= 0 ? '+' : '';
    metricValueElements[1].textContent = `${sign}$${dailyGain.toFixed(2)}`;
  }
  
  // Champs paramètres
  const settingsName = document.getElementById('settings-name');
  const settingsEmail = document.getElementById('settings-email');
  
  if (settingsName) settingsName.value = window.currentUser.name || '';
  if (settingsEmail) settingsEmail.value = window.currentUser.email || '';
  
  console.log('✅ Dashboard data updated');
  updateAllPagesUI();
}

// ===== SAUVEGARDE PROFIL =====
async function saveUserProfile() {
  if (!window.currentUser || !firebaseAuth.currentUser) {
    showNotification('❌ Utilisateur non connecté', 'error');
    return;
  }
  
  const nameInput = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  
  if (!nameInput || !emailInput) {
    showNotification('❌ Champs non trouvés', 'error');
    return;
  }
  
  const newName = nameInput.value.trim();
  const newEmail = emailInput.value.trim();
  
  if (!newName || !newEmail) {
    showNotification('❌ Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (newName.length < 2) {
    showNotification('❌ Le nom doit contenir au moins 2 caractères', 'error');
    return;
  }
  
  try {
    showNotification('💾 Sauvegarde en cours...', 'info');
    
    // Mettre à jour Firestore
    await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).update({
      name: newName,
      email: newEmail,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Mettre à jour profil Firebase Auth
    await firebaseAuth.currentUser.updateProfile({
      displayName: newName
    });
    
    // Mettre à jour données locales
    window.currentUser.name = newName;
    window.currentUser.email = newEmail;
    
    updateUI();
    updateDashboardData();
    updateAllPagesUI();
    
    showNotification('✅ Profil mis à jour avec succès', 'success');
    console.log('✅ Profil sauvegardé:', newName);
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
    showNotification('❌ Erreur lors de la sauvegarde', 'error');
  }
}

// ===== SAUVEGARDE PORTFOLIO INVESTISSEMENT =====
async function savePortfolioData(totalValue, totalProfit = 0) {
  if (!window.currentUser || !window.isLoggedIn || !firebaseAuth.currentUser) {
    console.error('🚫 Sauvegarde bloquée - session invalide');
    return;
  }
  

  // NOUVEAU : Éviter écriture si valeurs identiques
  if (window.currentUser.portfolio === totalValue && window.currentUser.dailyGain === totalProfit) {
    console.log('🚫 Portfolio inchangé, pas de sauvegarde');
    return;
  }


  try {
    console.log('✅ Portfolio INVESTISSEMENT sauvegardé:', { totalValue, totalProfit });
    
    // Utiliser le système de rang centralisé AVEC LE PORTFOLIO INVESTISSEMENT
    await updateUserRankGlobally(totalValue);
    
    // Récupérer l'ID du navigateur
    let browserId = localStorage.getItem('browser_id');
    if (!browserId) {
        browserId = 'browser_' + Date.now() + '_' + Math.random();
        localStorage.setItem('browser_id', browserId);
    }
    
    await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).update({
        portfolio: totalValue, // ← PORTFOLIO INVESTISSEMENT
        dailyGain: totalProfit, // ← PROFIT INVESTISSEMENT
        lastPortfolioUpdate: firebase.firestore.FieldValue.serverTimestamp(),
        lastBrowserId: browserId
    });
    
    // Mettre à jour les données locales
    window.currentUser.portfolio = totalValue;
    window.currentUser.dailyGain = totalProfit;
    updateAllPagesUI();
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde portfolio:', error);
  }
}

// ===== CHARGEMENT PORTFOLIO INVESTISSEMENT =====
async function loadPortfolioData() {
  if (!window.currentUser || !firebaseAuth.currentUser) {
    return { totalValue: 500, totalProfit: 0 };
  }
  
  try {
    const userDoc = await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).get();
    
    if (userDoc.exists) {
      const data = userDoc.data();
      return {
        totalValue: data.portfolio || 500,
        totalProfit: data.dailyGain || 0
      };
    }
  } catch (error) {
    console.error('❌ Erreur chargement portfolio:', error);
  }
  
  return { totalValue: 500, totalProfit: 0 };
}

// ===== ÉVÉNEMENTS =====
function initAuthEvents() {
  console.log('🔧 Initialisation événements auth...');
  
  // Bouton connexion
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => openModal('login-modal'));
  }
  
  // Formulaires
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  
  // Boutons sociaux
  const googleBtn = document.querySelector('.btn-social.google');
  if (googleBtn) {
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleGoogleLogin();
    });
  }
  
  // Mot de passe oublié
  const forgotBtn = document.querySelector('.forgot-password');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleForgotPassword();
    });
  }
  
  // Switch modals
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  
  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('login-modal');
      openModal('register-modal');
    });
  }
  
  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('register-modal');
      openModal('login-modal');
    });
  }
  
  // Fermeture modals
  const loginClose = document.getElementById('login-close');
  const registerClose = document.getElementById('register-close');
  
  if (loginClose) loginClose.addEventListener('click', () => closeModal('login-modal'));
  if (registerClose) registerClose.addEventListener('click', () => closeModal('register-modal'));
  
  // Fermeture sur overlay
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeAllModals();
    }
  });
  
  // Boutons menu utilisateur
  const logoutBtn = document.getElementById('logout-btn');
  const dashboardBtn = document.getElementById('dashboard-btn');
  const profileBtn = document.getElementById('profile-btn');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
  
if (dashboardBtn) {
  dashboardBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('🔥 CLICK Dashboard button');
    
    const isAdmin = window.currentUser?.role === 'admin' || window.currentUser?.isAdmin === true;
    
    if (isAdmin) {
      console.log('👑 Admin → Dashboard admin');
      window.location.href = '../dashboard/admin/admin.html';  // ← CHEMIN ABSOLU
    } else {
      console.log('👤 User → Dashboard utilisateur');
      window.location.href = '../dashboard/vu ensemble/dashboard.html';  // ← CHEMIN ABSOLU
    }
  });
}

if (profileBtn) {
  profileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('🔥 CLICK Profile button');
    window.location.href = '../dashboard/parametres/parametres.html';
  });
}
  
  console.log('✅ Événements auth initialisés');
}

function initDashboardEvents() {
  console.log('🔧 Initialisation événements dashboard...');
  
  const dashboardClose = document.getElementById('dashboard-close');
  if (dashboardClose) {
    dashboardClose.addEventListener('click', (e) => {
      e.preventDefault();
      closeDashboard();
    });
  }
  
  // Navigation dashboard
  const navItems = document.querySelectorAll('.dashboard-nav .nav-item');
  navItems.forEach(item => {
    // Supprimer anciens événements
    const newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);
    
    newItem.addEventListener('click', (e) => {
      e.preventDefault();
      const section = newItem.dataset.section;
      console.log('🔥 CLICK Nav item:', section);
      if (section) {
        switchDashboardSection(section);
      }
    });
  });
  
  // Bouton sauvegarde profil
  const saveButtons = document.querySelectorAll('.settings-group .btn-primary');
  saveButtons.forEach(btn => {
    if (btn.textContent.includes('Sauvegarder')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        saveUserProfile();
      });
    }
  });

  // Initialiser le trading quand on ouvre l'onglet trading
  const tradingNav = document.querySelector('[data-section="trading"]');
  if (tradingNav) {
    tradingNav.addEventListener('click', () => {
      setTimeout(() => {
        if (typeof initTradingSystem === 'function') {
          console.log('🚀 Initialisation trading system');
          initTradingSystem();
        }
      }, 500);
    });
  console.log('✅ Event trading ajouté');
}
  
  console.log('✅ Événements dashboard initialisés');
}

// ===== FONCTIONS DE DÉBOGAGE =====
function debugAuth() {
  console.log('🔍 === DÉBOGAGE AUTHENTIFICATION ===');
  console.log('Firebase Auth:', firebaseAuth);
  console.log('Firebase DB:', firebaseDb);
  console.log('Current User:', window.currentUser);
  console.log('Is Logged In:', window.isLoggedIn);
  console.log('Dashboard element:', document.getElementById('user-dashboard'));
  console.log('Dashboard button:', document.getElementById('dashboard-btn'));
  console.log('Profile button:', document.getElementById('profile-btn'));
  console.log('Logout button:', document.getElementById('logout-btn'));
}

// ===== INITIALISATION PRINCIPALE =====
function initCryptoTradersAuth() {
  console.log('🚀 Initialisation CryptoTraders Auth...');
  
  if (!initFirebase()) {
    showNotification('❌ Erreur Firebase', 'error');
    return;
  }
  
  // Écouter les changements d'authentification
  firebaseAuth.onAuthStateChanged(handleAuthStateChanged);
  
  // Initialiser les événements
  initAuthEvents();
  
  console.log('✅ CryptoTraders Auth initialisé');
}

// ===== MIGRATION SYSTÈME DE RANGS =====
async function migrateUserRankSystem() {
    if (!window.currentUser || !firebaseAuth.currentUser) return;
    
    try {
      // ✅ NOUVEAU : Vérifier d'abord si déjà migré
      const userDoc = await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      // Si déjà migré, ne rien faire
      if (userData.migrated) {
        console.log('🚫 Utilisateur déjà migré');
        return;
      }
      
      // Vérifier si l'utilisateur a l'ancien système
      const needsMigration = (
          window.currentUser.rank === 'Cadet Terrestre' || 
          !window.currentUser.rank.includes('🚀') ||
          !window.currentUser.level
      );
      
      if (needsMigration) {
          console.log('🔧 Migration du système de rangs pour:', window.currentUser.name);
          
          const portfolio = window.currentUser.portfolio || 500;
          const newRankData = calculateUserRank(portfolio);
          
          await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).update({
              rank: newRankData.rank,
              avatar: newRankData.avatar,
              level: newRankData.level,
              migrated: true, // ← Empêche remigration
              migrationDate: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Mettre à jour les données locales
          window.currentUser.rank = newRankData.rank;
          window.currentUser.avatar = newRankData.avatar;
          window.currentUser.level = newRankData.level;
          
          updateAllPagesUI();
          console.log('✅ Migration terminée');
      }
    } catch (error) {
        console.error('❌ Erreur migration:', error);
    }
}


// ===== EXPOSITION GLOBALE =====
window.openDashboard = openDashboard;
window.closeDashboard = closeDashboard;
window.switchDashboardSection = switchDashboardSection;
window.debugAuth = debugAuth;
window.showNotification = showNotification;
window.firebaseDb = firebaseDb; // ← AJOUTER
window.firebaseAuth = firebaseAuth; // ← AJOUTER
window.savePortfolioData = savePortfolioData; // ← NOUVEAU
window.loadPortfolioData = loadPortfolioData; // ← NOUVEAU

// ===== LANCEMENT =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 DOM chargé - Lancement CryptoTraders Auth');
  
  if (typeof firebase !== 'undefined') {
    initCryptoTradersAuth();
  } else {
    console.log('⏳ Attente Firebase...');
    setTimeout(() => {
      if (typeof firebase !== 'undefined') {
        initCryptoTradersAuth();
      } else {
        console.error('❌ Firebase non disponible');
        showNotification('❌ Erreur de chargement Firebase', 'error');
      }
    }, 2000);
  }
});

// ===== SYSTÈME DE RANGS CENTRALISÉ =====
function calculateUserRank(portfolio) {
    if (portfolio >= 5000) {
        return {
            rank: '👑 Maître de l\'Univers',
            avatar: '👑',
            level: 4
        };
    } else if (portfolio >= 2000) {
        return {
            rank: '🏆 Expert Galactique',
            avatar: '🏆',
            level: 3
        };
    } else if (portfolio >= 1000) {
        return {
            rank: '🌟 Trader Confirmé',
            avatar: '🌟',
            level: 2
        };
    } else {
        return {
            rank: '🚀 Cadet Spatial',
            avatar: '👨‍🚀',
            level: 1
        };
    }
}


// ===== MISE À JOUR AUTOMATIQUE DU RANG =====
async function updateUserRankGlobally(newPortfolio) {
    if (!window.currentUser || !firebaseAuth.currentUser) return;
    
    try {
        // ✅ NOUVEAU : Récupérer les données actuelles de Firebase
        const userDoc = await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).get();
        const currentData = userDoc.exists ? userDoc.data() : {};
        
        const currentPortfolio = currentData.portfolio || 500;
        const portfolioChange = Math.abs(newPortfolio - currentPortfolio);
        
        // Sauvegarder seulement si changement > $10 ou > 1%
        const percentChange = currentPortfolio > 0 ? (portfolioChange / currentPortfolio) * 100 : 0;
        
        if (portfolioChange < 10 && percentChange < 1) {
            console.log('🚫 Changement portfolio trop faible, pas de sauvegarde');
            // Mettre à jour seulement les données locales
            window.currentUser.portfolio = newPortfolio;
            updateAllPagesUI();
            return;
        }
        
        const oldRankData = calculateUserRank(currentPortfolio);
        const newRankData = calculateUserRank(newPortfolio);
        
        // Mettre à jour seulement si le rang a changé OU changement significatif
        if (oldRankData.level !== newRankData.level) {
            // Changement de rang
            await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).update({
                portfolio: newPortfolio,
                rank: newRankData.rank,
                avatar: newRankData.avatar,
                level: newRankData.level,
                lastRankUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            window.currentUser.portfolio = newPortfolio;
            window.currentUser.rank = newRankData.rank;
            window.currentUser.avatar = newRankData.avatar;
            
            updateAllPagesUI();
            showNotification(`🎉 Nouveau rang atteint : ${newRankData.rank}`, 'success');
            console.log('🏆 Rang mis à jour globalement:', newRankData.rank);
            
        } else {
            // Pas de changement de rang, mais changement significatif de portfolio
            await firebaseDb.collection('users').doc(firebaseAuth.currentUser.uid).update({
                portfolio: newPortfolio,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            window.currentUser.portfolio = newPortfolio;
            updateAllPagesUI();
            console.log('💰 Portfolio mis à jour:', newPortfolio);
        }
        
    } catch (error) {
        console.error('❌ Erreur mise à jour rang:', error);
    }
}



// ===== MISE À JOUR UI TOUTES PAGES =====
function updateAllPagesUI() {
    if (!window.currentUser) return;

    // AJOUTER CETTE VÉRIFICATION :
if (window.location.pathname.includes('portfolio.html')) {
  console.log('🎯 Page portfolio - mise à jour UI seulement');
  // Mettre à jour SEULEMENT nom/avatar/rang, PAS les données portfolio
  const headerUserName = document.getElementById('user-name');
  const headerAvatar = document.getElementById('user-avatar');
  const sidebarUserName = document.getElementById('sidebar-user-name');
  const sidebarAvatar = document.querySelector('.sidebar-avatar');
  const sidebarRank = document.querySelector('.user-rank');
  
  if (headerUserName) headerUserName.textContent = window.currentUser.name;
  if (headerAvatar) headerAvatar.textContent = window.currentUser.avatar;
  if (sidebarUserName) sidebarUserName.textContent = window.currentUser.name;
  if (sidebarAvatar) sidebarAvatar.textContent = window.currentUser.avatar;
  if (sidebarRank) sidebarRank.textContent = window.currentUser.rank;
  return;
}
    
    console.log('🔄 Mise à jour UI globale pour:', window.currentUser.name);
    
    // === HEADER PRINCIPAL ===
    const headerUserName = document.getElementById('user-name');
    const headerAvatar = document.getElementById('user-avatar');
    
    if (headerUserName) headerUserName.textContent = window.currentUser.name;
    if (headerAvatar) headerAvatar.textContent = window.currentUser.avatar;
    
    // === SIDEBAR DASHBOARD ===
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarAvatar = document.querySelector('.sidebar-avatar');
    const sidebarRank = document.querySelector('.user-rank');
    
    if (sidebarUserName) sidebarUserName.textContent = window.currentUser.name;
    if (sidebarAvatar) sidebarAvatar.textContent = window.currentUser.avatar;
    if (sidebarRank) sidebarRank.textContent = window.currentUser.rank;

    // Animer l'apparition du rang
    const userRank = document.querySelector('.user-rank');
    if (userRank) {
        userRank.classList.add('loaded');
    }
    
    // === DASHBOARD SECTIONS ===
    const dashboardUserName = document.getElementById('dashboard-user-name');
    if (dashboardUserName) dashboardUserName.textContent = window.currentUser.name;
    
    // === PORTFOLIO DISPLAY ===
    const portfolioElements = document.querySelectorAll('.portfolio-value, .current-balance');
    portfolioElements.forEach(el => {
        if (el && window.currentUser.portfolio) {
            el.textContent = `$${window.currentUser.portfolio.toFixed(2)}`;
        }
    });
    
    // === SETTINGS FORMS ===


    // === BLOC NIVEAU DASHBOARD ===
    const levelIcon = document.querySelector('.card-icon');
    const rankName = document.getElementById('rank-name');
    const rankLevel = document.getElementById('rank-level');
    const progressFill = document.querySelector('.progress-fill');

    if (levelIcon) levelIcon.textContent = window.currentUser.avatar;

    if (rankName) {
      rankName.textContent = window.currentUser.rank;
    }

    if (rankLevel) {
        const portfolio = window.currentUser.portfolio || 500;
        const rankData = calculateUserRank(portfolio);
        rankLevel.textContent = `🌟 Niveau ${rankData.level}`;
    }

    if (progressFill) {
        const portfolio = window.currentUser.portfolio || 500;
        let progressPercent = 0;

        if (portfolio < 1000) {
            progressPercent = (portfolio / 1000) * 100; // 0% à 100% vers Trader Confirmé
        } else if (portfolio < 2000) {
            progressPercent = ((portfolio - 1000) / 1000) * 100; // 0% à 100% vers Expert Galactique
        } else if (portfolio < 5000) {
            progressPercent = ((portfolio - 2000) / 3000) * 100; // 0% à 100% vers Maître de l'Univers
        } else {
            progressPercent = 100; // Niveau max atteint
        }

        progressFill.style.width = Math.min(progressPercent, 100) + '%';
    }
}

// ===== EXPOSITION GLOBALE =====
window.updateUserRankGlobally = updateUserRankGlobally;
window.updateAllPagesUI = updateAllPagesUI;
window.calculateUserRank = calculateUserRank; 

console.log('✅ Script CryptoTraders Auth chargé - Tapez window.debugAuth() pour déboguer');