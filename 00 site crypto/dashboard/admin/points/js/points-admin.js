// ===== POINTS ADMIN JS ===== 

console.log('🎮 Initialisation Points Admin CryptoTraders Pro');

// ===== VÉRIFICATIONS FIREBASE =====
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            console.log('✅ Firebase déjà initialisé');
            window.firebaseDb = firebase.firestore();
            window.firebaseAuth = firebase.auth();
            resolve();
        } else {
            console.log('⏳ Attente Firebase...');
            let attempts = 0;
            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    console.log('✅ Firebase trouvé après attente');
                    window.firebaseDb = firebase.firestore();
                    window.firebaseAuth = firebase.auth();
                    clearInterval(checkFirebase);
                    resolve();
                } else {
                    attempts++;
                    if (attempts > 50) {
                        console.log('⚠️ Firebase non trouvé, mode dégradé');
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }
            }, 100);
        }
    });
}

// ===== ATTENDRE AUTH.JS =====
function waitForAuth() {
    return new Promise((resolve) => {
        // Vérifier si window.currentUser existe déjà
        if (window.currentUser && window.currentUser.name) {
            console.log('✅ Auth déjà chargé:', window.currentUser.name);
            resolve();
            return;
        }
        
        // Attendre que auth.js charge window.currentUser
        let attempts = 0;
        const checkAuth = setInterval(() => {
            if (window.currentUser && window.currentUser.name) {
                console.log('✅ Auth trouvé après attente:', window.currentUser.name);
                clearInterval(checkAuth);
                resolve();
            } else {
                attempts++;
                if (attempts > 30) { // 3 secondes max
                    console.log('⚠️ Auth non trouvé dans les temps');
                    clearInterval(checkAuth);
                    resolve();
                }
            }
        }, 100);
    });
}

// ===== FONCTIONS DE COMPATIBILITÉ =====
function showNotification(message, type = 'info') {
    // Ne PAS appeler window.showNotification pour éviter la boucle
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Fallback notification
    const container = getOrCreateToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#00ff88' : '#0099ff'};
        color: ${type === 'info' ? '#ffffff' : '#000'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10001;
        font-weight: 600;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 4000);
}

function getOrCreateToastContainer() {
    let container = document.querySelector('.toast-container-points');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container-points';
        container.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    return container;
}

function showModal(modalId, title, content) {
    // Supprimer toute modal existante
    const existingModal = document.querySelector('.modal-overlay-points');
    if (existingModal) {
        existingModal.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay-points';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(26, 0, 51, 0.8);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, rgba(255, 136, 0, 0.1), rgba(255, 107, 53, 0.1));
        border: 2px solid rgba(255, 136, 0, 0.3);
        border-radius: 20px;
        padding: 0;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        color: #ffffff;
        transform: translateY(30px) scale(0.9);
        transition: all 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: rgba(255, 136, 0, 0.15); padding: 1.5rem; border-bottom: 1px solid rgba(255, 136, 0, 0.2); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: #ff8800; font-size: 1.3rem;">${title}</h3>
            <button onclick="closeModal()" style="background: none; border: none; color: rgba(255, 255, 255, 0.7); font-size: 1.5rem; cursor: pointer; padding: 0.2rem; border-radius: 4px; transition: all 0.3s ease;">&times;</button>
        </div>
        <div style="padding: 2rem; max-height: 50vh; overflow-y: auto;">
            ${content}
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Afficher avec animation
    setTimeout(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    window.currentModal = overlay;
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay-points');
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('div').style.transform = 'translateY(30px) scale(0.9)';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
    window.currentModal = null;
}

function showConfirm(title, message, subtitle, callback) {
    const result = confirm(`${title}\n\n${message}\n\n${subtitle || ''}`);
    if (result && callback) {
        callback();
    }
}

// ===== VARIABLES GLOBALES =====
let pointsData = {
    totalDistributed: 0,
    activeChallenges: 0,
    topUsers: 0,
    avgLevel: 1.2,
    usersByLevel: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
    }
};

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM chargé, attente Firebase et Auth...');
    
    // Attendre Firebase d'abord
    await waitForFirebase();
    
    // Puis attendre que auth.js charge les données utilisateur
    await waitForAuth();
    
    // Initialiser l'interface
    initPointsAdmin();
});

async function initPointsAdmin() {
    console.log('🚀 Initialisation système points admin');
    
    try {
        // Récupérer les données de l'admin connecté
        await loadAdminData();
        
        // Charger les données
        await loadPointsStats();
        await loadLeaderboard();
        loadUsersByLevel();
        
        // Initialiser les événements
        initPointsEvents();
        
        console.log('✅ Points admin initialisé avec succès');
        // SUPPRIMER cette notification pour éviter le spam
        // showNotification('🎮 Interface points chargée', 'success');
        
    } catch (error) {
        console.error('❌ Erreur initialisation points admin:', error);
        // Garder seulement cette notification d'erreur si vraiment nécessaire
        showNotification('⚠️ Erreur de chargement (mode dégradé)', 'error');
        
        // Charger en mode dégradé
        loadMockPointsStats();
        loadMockLeaderboard();
    }
}

// ===== CHARGEMENT DONNÉES ADMIN =====
async function loadAdminData() {
    try {
        // Essayer de récupérer depuis window.currentUser (auth.js)
        if (window.currentUser && window.currentUser.name) {
            console.log('✅ Admin trouvé via window.currentUser:', window.currentUser.name);
            updateAdminDisplay(window.currentUser);
            return;
        }
        
        // Essayer de récupérer depuis Firebase Auth
        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            const user = window.firebaseAuth.currentUser;
            console.log('✅ Admin trouvé via Firebase Auth:', user.displayName || user.email);
            
            // Récupérer les données complètes depuis Firestore
            if (window.firebaseDb) {
                try {
                    const userDoc = await window.firebaseDb.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const adminData = {
                            id: user.uid,
                            name: userData.name || user.displayName || 'Administrateur',
                            email: user.email,
                            role: userData.role || 'admin',
                            isAdmin: userData.isAdmin || true
                        };
                        updateAdminDisplay(adminData);
                        return;
                    }
                } catch (error) {
                    console.log('⚠️ Erreur récupération données Firestore:', error);
                }
            }
            
            // Fallback avec données Firebase Auth
            const adminData = {
                name: user.displayName || user.email.split('@')[0] || 'Administrateur',
                email: user.email
            };
            updateAdminDisplay(adminData);
            return;
        }
        
        // Attendre que l'auth se charge
        console.log('⏳ Attente authentification...');
        setTimeout(loadAdminData, 1000);
        
    } catch (error) {
        console.error('❌ Erreur chargement admin:', error);
        // Données par défaut
        updateAdminDisplay({
            name: 'Administrateur',
            email: 'admin@cryptotraders.pro'
        });
    }
}

function updateAdminDisplay(adminData) {
    console.log('🔄 Mise à jour affichage admin:', adminData);
    
    // Mettre à jour le nom dans la sidebar
    const sidebarAdminName = document.getElementById('sidebar-admin-name');
    if (sidebarAdminName) {
        sidebarAdminName.textContent = adminData.name;
    }
    
    // Mettre à jour le nom dans le header
    const adminName = document.getElementById('admin-name');
    if (adminName) {
        adminName.textContent = adminData.name;
    }
    
    // Mettre à jour l'avatar (garder la couronne pour les admins)
    const adminAvatar = document.getElementById('admin-avatar');
    if (adminAvatar) {
        adminAvatar.textContent = '👑';
    }
    
    const sidebarAvatar = document.querySelector('.sidebar-avatar');
    if (sidebarAvatar) {
        sidebarAvatar.textContent = '👑';
    }
    
    console.log('✅ Interface admin mise à jour');
}

// ===== CHARGEMENT DONNÉES =====
async function loadPointsStats() {
    try {
        if (typeof firebaseDb !== 'undefined') {
            // Charger depuis Firebase
            await loadRealPointsStats();
        } else {
            // Données de test
            loadMockPointsStats();
        }
    } catch (error) {
        console.error('❌ Erreur chargement stats points:', error);
        loadMockPointsStats();
    }
}

async function loadRealPointsStats() {
    try {
        if (!window.firebaseDb) {
            console.log('❌ FirebaseDb non disponible');
            throw new Error('Firebase non initialisé');
        }
        
        const usersSnapshot = await window.firebaseDb.collection('users').get();
        let totalPoints = 0;
        let usersByLevel = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        let totalLevels = 0;
        
        usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            const userPoints = userData.points?.total || 0;
            const userLevel = userData.points?.level || 1;
            
            totalPoints += userPoints;
            usersByLevel[userLevel]++;
            totalLevels += userLevel;
        });
        
        const avgLevel = usersSnapshot.size > 0 ? (totalLevels / usersSnapshot.size).toFixed(1) : 1.0;
        
        pointsData = {
            totalDistributed: totalPoints,
            activeChallenges: 2, // À remplacer par vraies données
            topUsers: usersByLevel[5],
            avgLevel: parseFloat(avgLevel),
            usersByLevel: usersByLevel
        };
        
        updatePointsStatsUI();
        updateLevelCounts();
        
        console.log('✅ Stats points chargées depuis Firebase');
        
    } catch (error) {
        console.error('❌ Erreur données Firebase points:', error);
        throw error; // Relancer pour déclencher le fallback
    }
}

function loadMockPointsStats() {
    pointsData = {
        totalDistributed: 45280,
        activeChallenges: 3,
        topUsers: 12,
        avgLevel: 2.4,
        usersByLevel: {
            1: 156,
            2: 89,
            3: 34,
            4: 18,
            5: 12
        }
    };
    
    updatePointsStatsUI();
    updateLevelCounts();
}

function updatePointsStatsUI() {
    // Mettre à jour les statistiques dans l'interface
    const elements = {
        'total-points-distributed': pointsData.totalDistributed.toLocaleString(),
        'active-challenges': pointsData.activeChallenges,
        'top-users': pointsData.topUsers,
        'avg-level': pointsData.avgLevel,
        'points-change': '+1,240 cette semaine',
        'challenges-change': '1 terminé',
        'level5-change': '+3 ce mois',
        'avg-change': '+0.2'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (typeof value === 'number' && value > 1000) {
                animateNumber(element, value);
            } else {
                element.textContent = value;
            }
        }
    });
}

function updateLevelCounts() {
    Object.entries(pointsData.usersByLevel).forEach(([level, count]) => {
        const element = document.getElementById(`level${level}-count`);
        if (element) {
            element.textContent = count;
        }
    });
}

// ===== ANIMATION NOMBRES =====
function animateNumber(element, targetValue) {
    const startValue = 0;
    const duration = 1500;
    const increment = targetValue / (duration / 16);
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        
        element.textContent = Math.floor(currentValue).toLocaleString();
    }, 16);
}

// ===== CHARGEMENT CLASSEMENT =====
async function loadLeaderboard() {
    try {
        if (typeof firebaseDb !== 'undefined') {
            await loadRealLeaderboard();
        } else {
            loadMockLeaderboard();
        }
    } catch (error) {
        console.error('❌ Erreur chargement classement:', error);
        loadMockLeaderboard();
    }
}

async function loadRealLeaderboard() {
    try {
        const usersSnapshot = await firebaseDb.collection('users')
            .orderBy('points.total', 'desc')
            .limit(20)
            .get();
        
        const leaderboardData = [];
        
        usersSnapshot.docs.forEach((doc, index) => {
            const userData = doc.data();
            leaderboardData.push({
                rank: index + 1,
                id: doc.id,
                name: userData.name || 'Utilisateur',
                email: userData.email || '',
                points: userData.points?.total || 0,
                level: userData.points?.level || 1,
                levelName: userData.points?.levelName || '🌟 Astronaute Débutant',
                lastActivity: userData.lastLogin || null
            });
        });
        
        renderLeaderboard(leaderboardData);
        
    } catch (error) {
        console.error('❌ Erreur leaderboard Firebase:', error);
        loadMockLeaderboard();
    }
}

function loadMockLeaderboard() {
    const mockData = [
        {
            rank: 1,
            id: '1',
            name: 'Jean Dupont',
            email: 'jean@example.com',
            points: 18450,
            level: 5,
            levelName: '👑 Maître Trader',
            lastActivity: new Date()
        },
        {
            rank: 2,
            id: '2',
            name: 'Marie Martin',
            email: 'marie@example.com',
            points: 12680,
            level: 4,
            levelName: '🎖 Capitaine Stellaire',
            lastActivity: new Date(Date.now() - 86400000)
        },
        {
            rank: 3,
            id: '3',
            name: 'Pierre Durand',
            email: 'pierre@example.com',
            points: 9240,
            level: 4,
            levelName: '🎖 Capitaine Stellaire',
            lastActivity: new Date(Date.now() - 172800000)
        },
        {
            rank: 4,
            id: '4',
            name: 'Sophie Laurent',
            email: 'sophie@example.com',
            points: 7890,
            level: 4,
            levelName: '🎖 Capitaine Stellaire',
            lastActivity: new Date(Date.now() - 259200000)
        },
        {
            rank: 5,
            id: '5',
            name: 'Lucas Bernard',
            email: 'lucas@example.com',
            points: 6420,
            level: 3,
            levelName: '⭐ Commandant',
            lastActivity: new Date(Date.now() - 345600000)
        }
    ];
    
    renderLeaderboard(mockData);
}

function renderLeaderboard(data) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    
    tbody.innerHTML = data.map(user => `
        <tr>
            <td>
                <div class="rank-badge rank-${user.rank <= 3 ? user.rank : 'other'}">
                    ${user.rank}
                </div>
            </td>
            <td>
                <div class="user-info-cell">
                    <div class="user-avatar-small">${getUserAvatarByLevel(user.level)}</div>
                    <div class="user-details">
                        <h6>${user.name}</h6>
                        <span>${user.email}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="points-display">${user.points.toLocaleString()}</div>
            </td>
            <td>
                <div class="level-display level-${user.level}">${user.levelName}</div>
            </td>
            <td>
                <div class="activity-time">${formatActivityTime(user.lastActivity)}</div>
            </td>
            <td>
                <div class="action-buttons-small">
                    <button class="action-btn-small edit" onclick="editUserPoints('${user.id}')">✏️</button>
                    <button class="action-btn-small points" onclick="addUserPoints('${user.id}')">🎯</button>
                    <button class="action-btn-small ban" onclick="resetUserPoints('${user.id}')">🔄</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== UTILITAIRES =====
function getUserAvatarByLevel(level) {
    const avatars = {
        1: '👨‍🚀',
        2: '🚀',
        3: '⭐',
        4: '🎖',
        5: '👑'
    };
    return avatars[level] || '👨‍🚀';
}

function formatActivityTime(lastActivity) {
    if (!lastActivity) return 'Jamais connecté';
    
    const now = new Date();
    const activity = lastActivity.toDate ? lastActivity.toDate() : new Date(lastActivity);
    const diffMs = now - activity;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'À l\'instant';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return activity.toLocaleDateString('fr-FR');
}

// ===== GESTION DÉCONNEXION =====
function handleLogout() {
    if (typeof window.handleLogout === 'function') {
        window.handleLogout();
    } else if (window.firebaseAuth) {
        window.firebaseAuth.signOut().then(() => {
            window.location.href = '../../../index.html';
        });
    } else {
        window.location.href = '../../../index.html';
    }
}

// ===== ÉVÉNEMENTS =====
function initPointsEvents() {
    console.log('📝 Événements points initialisés');
    
    // Gestion du bouton de déconnexion
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}

// ===== MODALES ET ACTIONS =====
function openBulkPointsModal() {
    const modalContent = `
        <div class="bulk-points-section">
            <h4>🎯 Attribution de Points en Masse</h4>
            
            <div class="form-group">
                <label>Nombre de points à attribuer</label>
                <input type="number" id="bulk-points-amount" placeholder="Ex: 100" min="1" max="10000">
            </div>
            
            <div class="form-group">
                <label>Raison de l'attribution</label>
                <select id="bulk-points-reason">
                    <option value="event">Événement spécial</option>
                    <option value="bonus">Bonus mensuel</option>
                    <option value="compensation">Compensation</option>
                    <option value="celebration">Célébration</option>
                    <option value="custom">Raison personnalisée</option>
                </select>
            </div>
            
            <div class="form-group" id="custom-reason-group" style="display: none;">
                <label>Raison personnalisée</label>
                <input type="text" id="custom-reason-text" placeholder="Décrivez la raison...">
            </div>
            
            <div class="form-group">
                <label>Sélectionner les utilisateurs</label>
                <div class="user-selection" id="users-selection">
                    <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                        Chargement des utilisateurs...
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
                <button class="btn btn-primary" onclick="executeBulkPoints()">🎯 Attribuer Points</button>
            </div>
        </div>
    `;
    
    showModal('bulk-points-modal', '🎯 Attribution Points en Masse', modalContent);
    
    // Charger les utilisateurs après ouverture
    setTimeout(loadUsersForBulkPoints, 500);
    
    // Gérer la raison personnalisée
    document.getElementById('bulk-points-reason').addEventListener('change', function() {
        const customGroup = document.getElementById('custom-reason-group');
        customGroup.style.display = this.value === 'custom' ? 'block' : 'none';
    });
}

async function loadUsersForBulkPoints() {
    const container = document.getElementById('users-selection');
    if (!container) return;
    
    try {
        let users = [];
        
        if (typeof firebaseDb !== 'undefined') {
            const usersSnapshot = await firebaseDb.collection('users').limit(50).get();
            users = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || 'Utilisateur',
                email: doc.data().email || '',
                level: doc.data().points?.level || 1
            }));
        } else {
            // Utilisateurs fictifs
            users = [
                { id: '1', name: 'Jean Dupont', email: 'jean@example.com', level: 3 },
                { id: '2', name: 'Marie Martin', email: 'marie@example.com', level: 4 },
                { id: '3', name: 'Pierre Durand', email: 'pierre@example.com', level: 2 },
                { id: '4', name: 'Sophie Laurent', email: 'sophie@example.com', level: 1 },
                { id: '5', name: 'Lucas Bernard', email: 'lucas@example.com', level: 5 }
            ];
        }
        
        container.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="select-all-users" onchange="toggleAllUsers()">
                    <strong>Sélectionner tous les utilisateurs</strong>
                </label>
            </div>
            ${users.map(user => `
                <div class="user-checkbox">
                    <input type="checkbox" class="user-select" value="${user.id}">
                    <div class="user-info">
                        <div class="user-avatar-tiny">${getUserAvatarByLevel(user.level)}</div>
                        <div>
                            <strong>${user.name}</strong><br>
                            <small style="color: rgba(255,255,255,0.6);">${user.email}</small>
                        </div>
                    </div>
                    <div class="level-display level-${user.level}" style="font-size: 0.7rem;">
                        Niveau ${user.level}
                    </div>
                </div>
            `).join('')}
        `;
        
    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
        container.innerHTML = '<p style="color: #ff4757; text-align: center;">Erreur lors du chargement des utilisateurs</p>';
    }
}

function toggleAllUsers() {
    const selectAll = document.getElementById('select-all-users');
    const userCheckboxes = document.querySelectorAll('.user-select');
    
    userCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
}

async function executeBulkPoints() {
    const pointsAmount = parseInt(document.getElementById('bulk-points-amount').value);
    const reason = document.getElementById('bulk-points-reason').value;
    const customReason = document.getElementById('custom-reason-text')?.value;
    const selectedUsers = Array.from(document.querySelectorAll('.user-select:checked')).map(cb => cb.value);
    
    // Validation
    if (!pointsAmount || pointsAmount <= 0) {
        showNotification('❌ Veuillez saisir un nombre de points valide', 'error');
        return;
    }
    
    if (selectedUsers.length === 0) {
        showNotification('❌ Veuillez sélectionner au moins un utilisateur', 'error');
        return;
    }
    
    if (reason === 'custom' && !customReason) {
        showNotification('❌ Veuillez saisir une raison personnalisée', 'error');
        return;
    }
    
    const finalReason = reason === 'custom' ? customReason : reason;
    
    try {
        showNotification('🎯 Attribution des points en cours...', 'info');
        
        if (typeof firebaseDb !== 'undefined' && typeof addPoints === 'function') {
            // Attribution réelle via Firebase
            for (const userId of selectedUsers) {
                await addPoints(userId, pointsAmount, finalReason);
            }
        } else {
            // Simulation
            console.log(`🎯 Attribution simulée: ${pointsAmount} points à ${selectedUsers.length} utilisateurs pour: ${finalReason}`);
        }
        
        showNotification(`✅ ${pointsAmount} points attribués à ${selectedUsers.length} utilisateur(s)`, 'success');
        closeModal();
        
        // Rafraîchir les données
        setTimeout(() => {
            loadPointsStats();
            loadLeaderboard();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erreur attribution points:', error);
        showNotification('❌ Erreur lors de l\'attribution des points', 'error');
    }
}

function openCreateChallengeModal() {
    const modalContent = `
        <div class="challenge-form-section">
            <h4>🏆 Créer un Nouveau Défi</h4>
            
            <div class="form-group">
                <label>Type de défi</label>
                <div class="challenge-type-selector">
                    <div class="challenge-type-option" data-type="trading" onclick="selectChallengeType('trading')">
                        <div class="type-icon">📈</div>
                        <div class="type-name">Trading</div>
                    </div>
                    <div class="challenge-type-option" data-type="learning" onclick="selectChallengeType('learning')">
                        <div class="type-icon">📚</div>
                        <div class="type-name">Formation</div>
                    </div>
                    <div class="challenge-type-option" data-type="social" onclick="selectChallengeType('social')">
                        <div class="type-icon">👥</div>
                        <div class="type-name">Social</div>
                    </div>
                    <div class="challenge-type-option" data-type="daily" onclick="selectChallengeType('daily')">
                        <div class="type-icon">🔄</div>
                        <div class="type-name">Quotidien</div>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Titre du défi</label>
                    <input type="text" id="challenge-title" placeholder="Ex: Défi Trading Mensuel">
                </div>
                <div class="form-group">
                    <label>Points récompense</label>
                    <input type="number" id="challenge-reward" placeholder="500" min="50" max="5000">
                </div>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea id="challenge-description" rows="3" placeholder="Décrivez l'objectif du défi..."></textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Date de fin</label>
                    <input type="date" id="challenge-end-date">
                </div>
                <div class="form-group">
                    <label>Participants max</label>
                    <input type="number" id="challenge-max-participants" placeholder="50" min="5" max="1000">
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
                <button class="btn btn-primary" onclick="createChallenge()">🏆 Créer Défi</button>
            </div>
        </div>
    `;
    
    showModal('create-challenge-modal', '🏆 Nouveau Défi', modalContent);
    
    // Définir date minimum (aujourd'hui)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('challenge-end-date').min = today;
}

function selectChallengeType(type) {
    document.querySelectorAll('.challenge-type-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    
    // Pré-remplir selon le type
    const titleInput = document.getElementById('challenge-title');
    const descInput = document.getElementById('challenge-description');
    const rewardInput = document.getElementById('challenge-reward');
    
    const presets = {
        trading: {
            title: 'Défi Trading Mensuel',
            description: 'Réalisez 10 trades profitables ce mois-ci',
            reward: 500
        },
        learning: {
            title: 'Marathon Formation',
            description: 'Terminez 3 cours cette semaine',
            reward: 300
        },
        social: {
            title: 'Défi Communauté',
            description: 'Participez aux discussions et aidez 5 membres',
            reward: 200
        },
        daily: {
            title: 'Connexion Quotidienne',
            description: 'Connectez-vous tous les jours pendant 7 jours',
            reward: 150
        }
    };
    
    if (presets[type]) {
        titleInput.value = presets[type].title;
        descInput.value = presets[type].description;
        rewardInput.value = presets[type].reward;
    }
}

async function createChallenge() {
    const selectedType = document.querySelector('.challenge-type-option.selected');
    if (!selectedType) {
        showNotification('❌ Veuillez sélectionner un type de défi', 'error');
        return;
    }
    
    const challengeData = {
        type: selectedType.dataset.type,
        title: document.getElementById('challenge-title').value,
        description: document.getElementById('challenge-description').value,
        reward: parseInt(document.getElementById('challenge-reward').value),
        endDate: document.getElementById('challenge-end-date').value,
        maxParticipants: parseInt(document.getElementById('challenge-max-participants').value)
    };
    
    // Validation
    if (!challengeData.title || !challengeData.description) {
        showNotification('❌ Veuillez remplir le titre et la description', 'error');
        return;
    }
    
    if (!challengeData.reward || challengeData.reward < 50) {
        showNotification('❌ La récompense doit être d\'au moins 50 points', 'error');
        return;
    }
    
    if (!challengeData.endDate) {
        showNotification('❌ Veuillez sélectionner une date de fin', 'error');
        return;
    }
    
    try {
        showNotification('🏆 Création du défi en cours...', 'info');
        
        if (typeof firebaseDb !== 'undefined') {
            // Créer dans Firebase
            await firebaseDb.collection('challenges').add({
                ...challengeData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                participants: [],
                createdBy: window.currentAdmin?.id || 'admin'
            });
        } else {
            // Simulation
            console.log('🏆 Défi créé (simulé):', challengeData);
        }
        
        showNotification('✅ Défi créé avec succès', 'success');
        closeModal();
        
        // Rafraîchir
        setTimeout(loadPointsStats, 1000);
        
    } catch (error) {
        console.error('❌ Erreur création défi:', error);
        showNotification('❌ Erreur lors de la création du défi', 'error');
    }
}

function openPointsHistoryModal() {
    const modalContent = `
        <div style="max-height: 500px; overflow-y: auto;">
            <h4>📊 Historique des Points</h4>
            
            <div class="form-row" style="margin-bottom: 1.5rem;">
                <div class="form-group">
                    <label>Filtrer par utilisateur</label>
                    <select id="history-user-filter">
                        <option value="">Tous les utilisateurs</option>
                        <option value="user1">Jean Dupont</option>
                        <option value="user2">Marie Martin</option>
                        <option value="user3">Pierre Durand</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Période</label>
                    <select id="history-period-filter">
                        <option value="7">7 derniers jours</option>
                        <option value="30">30 derniers jours</option>
                        <option value="90">3 derniers mois</option>
                        <option value="all">Tout l'historique</option>
                    </select>
                </div>
            </div>
            
            <table class="points-history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Utilisateur</th>
                        <th>Points</th>
                        <th>Raison</th>
                        <th>Total après</th>
                    </tr>
                </thead>
                <tbody id="history-table-body">
                    <tr>
                        <td>21/01/2025 14:30</td>
                        <td>Jean Dupont</td>
                        <td><span class="points-amount positive">+50</span></td>
                        <td><span class="reason-badge">Trade profitable</span></td>
                        <td>18,450</td>
                    </tr>
                    <tr>
                        <td>21/01/2025 12:15</td>
                        <td>Marie Martin</td>
                        <td><span class="points-amount positive">+100</span></td>
                        <td><span class="reason-badge">Cours complété</span></td>
                        <td>12,680</td>
                    </tr>
                    <tr>
                        <td>20/01/2025 19:45</td>
                        <td>Pierre Durand</td>
                        <td><span class="points-amount positive">+25</span></td>
                        <td><span class="reason-badge">Connexion quotidienne</span></td>
                        <td>9,240</td>
                    </tr>
                    <tr>
                        <td>20/01/2025 16:20</td>
                        <td>Sophie Laurent</td>
                        <td><span class="points-amount negative">-10</span></td>
                        <td><span class="reason-badge">Correction admin</span></td>
                        <td>7,890</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="exportPointsHistory()">💾 Exporter</button>
            <button class="btn btn-primary" onclick="closeModal()">Fermer</button>
        </div>
    `;
    
    showModal('points-history-modal', '📊 Historique Points', modalContent);
}

// ===== ACTIONS UTILISATEURS =====
function editUserPoints(userId) {
    const modalContent = `
        <div class="form-group">
            <label>Ajuster les points de l'utilisateur</label>
            <input type="number" id="edit-points-amount" placeholder="Points à ajouter/retirer" step="1">
            <small style="color: rgba(255,255,255,0.6); margin-top: 0.5rem; display: block;">
                Utilisez un nombre positif pour ajouter, négatif pour retirer
            </small>
        </div>
        
        <div class="form-group">
            <label>Raison de l'ajustement</label>
            <select id="edit-points-reason">
                <option value="admin_bonus">Bonus administrateur</option>
                <option value="correction">Correction d'erreur</option>
                <option value="compensation">Compensation</option>
                <option value="penalty">Pénalité</option>
                <option value="custom">Raison personnalisée</option>
            </select>
        </div>
        
        <div class="form-group" id="edit-custom-reason" style="display: none;">
            <label>Raison personnalisée</label>
            <input type="text" id="edit-custom-reason-text" placeholder="Décrivez la raison...">
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="executeEditUserPoints('${userId}')">✅ Confirmer</button>
        </div>
    `;
    
    showModal('edit-user-points-modal', '✏️ Modifier Points Utilisateur', modalContent);
    
    // Gérer raison personnalisée
    document.getElementById('edit-points-reason').addEventListener('change', function() {
        const customDiv = document.getElementById('edit-custom-reason');
        customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
    });
}

async function executeEditUserPoints(userId) {
    const amount = parseInt(document.getElementById('edit-points-amount').value);
    const reason = document.getElementById('edit-points-reason').value;
    const customReason = document.getElementById('edit-custom-reason-text')?.value;
    
    if (!amount || amount === 0) {
        showNotification('❌ Veuillez saisir un nombre de points', 'error');
        return;
    }
    
    if (reason === 'custom' && !customReason) {
        showNotification('❌ Veuillez saisir une raison personnalisée', 'error');
        return;
    }
    
    const finalReason = reason === 'custom' ? customReason : reason;
    
    try {
        if (typeof addPoints === 'function') {
            await addPoints(userId, amount, finalReason);
        }
        
        showNotification(`✅ Points ${amount > 0 ? 'ajoutés' : 'retirés'} avec succès`, 'success');
        closeModal();
        
        setTimeout(() => {
            loadPointsStats();
            loadLeaderboard();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erreur modification points:', error);
        showNotification('❌ Erreur lors de la modification', 'error');
    }
}

function addUserPoints(userId) {
    const modalContent = `
        <div class="form-group">
            <label>Points à attribuer</label>
            <input type="number" id="add-points-amount" placeholder="100" min="1" max="5000">
        </div>
        
        <div class="form-group">
            <label>Raison</label>
            <select id="add-points-reason">
                <option value="manual_bonus">Bonus manuel</option>
                <option value="excellent_performance">Performance excellente</option>
                <option value="community_help">Aide à la communauté</option>
                <option value="special_event">Événement spécial</option>
                <option value="custom">Raison personnalisée</option>
            </select>
        </div>
        
        <div class="form-group" id="add-custom-reason" style="display: none;">
            <label>Raison personnalisée</label>
            <input type="text" id="add-custom-reason-text" placeholder="Décrivez la raison...">
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="executeAddUserPoints('${userId}')">🎯 Attribuer</button>
        </div>
    `;
    
    showModal('add-user-points-modal', '🎯 Attribuer Points', modalContent);
    
    // Gérer raison personnalisée
    document.getElementById('add-points-reason').addEventListener('change', function() {
        const customDiv = document.getElementById('add-custom-reason');
        customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
    });
}

async function executeAddUserPoints(userId) {
    const amount = parseInt(document.getElementById('add-points-amount').value);
    const reason = document.getElementById('add-points-reason').value;
    const customReason = document.getElementById('add-custom-reason-text')?.value;
    
    if (!amount || amount <= 0) {
        showNotification('❌ Veuillez saisir un nombre de points valide', 'error');
        return;
    }
    
    if (reason === 'custom' && !customReason) {
        showNotification('❌ Veuillez saisir une raison personnalisée', 'error');
        return;
    }
    
    const finalReason = reason === 'custom' ? customReason : reason;
    
    try {
        if (typeof addPoints === 'function') {
            await addPoints(userId, amount, finalReason);
        }
        
        showNotification(`✅ ${amount} points attribués avec succès`, 'success');
        closeModal();
        
        setTimeout(() => {
            loadPointsStats();
            loadLeaderboard();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erreur attribution points:', error);
        showNotification('❌ Erreur lors de l\'attribution', 'error');
    }
}

async function resetUserPoints(userId) {
    showConfirm(
        'Réinitialiser les points',
        'Êtes-vous sûr de vouloir remettre les points de cet utilisateur à zéro ?',
        'Cette action est irréversible.',
        async () => {
            try {
                if (typeof firebaseDb !== 'undefined') {
                    await firebaseDb.collection('users').doc(userId).update({
                        'points.total': 0,
                        'points.level': 1,
                        'points.levelName': '🌟 Astronaute Débutant',
                        'points.history': firebase.firestore.FieldValue.arrayUnion({
                            points: 'reset',
                            reason: 'Réinitialisation admin',
                            date: firebase.firestore.FieldValue.serverTimestamp(),
                            total: 0
                        })
                    });
                }
                
                showNotification('🔄 Points réinitialisés', 'success');
                
                setTimeout(() => {
                    loadPointsStats();
                    loadLeaderboard();
                }, 1000);
                
            } catch (error) {
                console.error('❌ Erreur reset points:', error);
                showNotification('❌ Erreur lors de la réinitialisation', 'error');
            }
        }
    );
}

// ===== AUTRES ACTIONS =====
function refreshLeaderboard() {
    showNotification('🔄 Actualisation du classement...', 'info');
    loadLeaderboard();
    loadPointsStats();
}

function exportLeaderboard() {
    showNotification('💾 Export en cours...', 'info');
    // Simulation export
    setTimeout(() => {
        showNotification('✅ Classement exporté', 'success');
    }, 2000);
}

function exportPointsHistory() {
    showNotification('💾 Export historique en cours...', 'info');
    setTimeout(() => {
        showNotification('✅ Historique exporté', 'success');
    }, 2000);
}

function editLevels() {
    showNotification('⚙️ Configuration des niveaux (à venir)', 'info');
}

function editPointsConfig() {
    const modalContent = `
        <div class="points-config-section">
            <h4>⚙️ Configuration des Points par Action</h4>
            
            <div class="config-form" style="max-height: 400px; overflow-y: auto;">
                
                <!-- Trading avec tranches -->
                <div class="config-category">
                    <h5>📈 Trading Profitable (Réel)</h5>
                    <div class="config-row">
                        <label>🟢 Profit 0-5%</label>
                        <input type="number" id="config-real_trade_low" value="50" min="10" max="200">
                    </div>
                    <div class="config-row">
                        <label>🟡 Profit 5-10%</label>
                        <input type="number" id="config-real_trade_mid" value="75" min="20" max="300">
                    </div>
                    <div class="config-row">
                        <label>🔴 Profit 10%+</label>
                        <input type="number" id="config-real_trade_high" value="150" min="50" max="500">
                    </div>
                </div>
                
                <div class="config-category">
                    <h5>🎯 Trading Profitable (Paper)</h5>
                    <div class="config-row">
                        <label>🟢 Profit 0-5%</label>
                        <input type="number" id="config-paper_trade_low" value="10" min="5" max="50">
                    </div>
                    <div class="config-row">
                        <label>🟡 Profit 5-10%</label>
                        <input type="number" id="config-paper_trade_mid" value="20" min="10" max="80">
                    </div>
                    <div class="config-row">
                        <label>🔴 Profit 10%+</label>
                        <input type="number" id="config-paper_trade_high" value="40" min="20" max="100">
                    </div>
                </div>
                
                <!-- Autres actions simples -->
                <div class="config-category">
                    <h5>💼 Autres Actions</h5>
                    <div class="config-row">
                        <label>💼 Transaction Portfolio</label>
                        <input type="number" id="config-portfolio_transaction" value="25" min="10" max="100">
                    </div>
                    
                    <div class="config-row">
                        <label>🔄 Connexion Quotidienne</label>
                        <input type="number" id="config-daily_login" value="10" min="5" max="50">
                    </div>
                    
                    <div class="config-row">
                        <label>🔥 Série 7 Jours</label>
                        <input type="number" id="config-weekly_streak" value="100" min="50" max="200">
                    </div>
                    
                    <div class="config-row">
                        <label>📚 Vidéo Formation</label>
                        <input type="number" id="config-watch_formation_video" value="30" min="20" max="100">
                    </div>
                    
                    <div class="config-row">
                        <label>✅ Quiz Complété</label>
                        <input type="number" id="config-complete_quiz" value="50" min="30" max="150">
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
                <button class="btn btn-primary" onclick="savePointsConfig()">💾 Sauvegarder</button>
            </div>
        </div>
    `;
    
    showModal('points-config-modal', '⚙️ Configuration Points', modalContent);
}

async function savePointsConfig() {
    try {
        const newConfig = {
            rewards: {
                // Trading avec tranches
                profitable_trade_real: {
                    low: parseInt(document.getElementById('config-real_trade_low').value),    // 0-5%
                    mid: parseInt(document.getElementById('config-real_trade_mid').value),    // 5-10%
                    high: parseInt(document.getElementById('config-real_trade_high').value)   // 10%+
                },
                profitable_trade_paper: {
                    low: parseInt(document.getElementById('config-paper_trade_low').value),   // 0-5%
                    mid: parseInt(document.getElementById('config-paper_trade_mid').value),   // 5-10%
                    high: parseInt(document.getElementById('config-paper_trade_high').value)  // 10%+
                },
                // Actions simples
                portfolio_transaction: parseInt(document.getElementById('config-portfolio_transaction').value),
                daily_login: parseInt(document.getElementById('config-daily_login').value),
                weekly_streak: parseInt(document.getElementById('config-weekly_streak').value),
                watch_formation_video: parseInt(document.getElementById('config-watch_formation_video').value),
                complete_quiz: parseInt(document.getElementById('config-complete_quiz').value)
            }
        };
        
        showNotification('💾 Sauvegarde en cours...', 'info');
        
        if (window.firebaseDb) {
            await window.firebaseDb.collection('config').doc('points').update(newConfig);
            showNotification('✅ Configuration sauvegardée avec succès', 'success');
        }
        
        closeModal();
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde config:', error);
        showNotification('❌ Erreur lors de la sauvegarde', 'error');
    }
}

function updatePointsConfigDisplay() {
    // Mettre à jour les valeurs affichées dans le tableau
    const configItems = document.querySelectorAll('.points-config-item .points-value');
    if (configItems.length >= 5) {
        configItems[0].textContent = `${pointsConfig.rewards.profitable_trade_real} pts`;
        configItems[1].textContent = `${pointsConfig.rewards.profitable_trade_paper} pts`;
        configItems[2].textContent = `${pointsConfig.rewards.watch_formation_video} pts`;
        configItems[3].textContent = `${pointsConfig.rewards.daily_login} pts`;
        configItems[4].textContent = `${pointsConfig.rewards.weekly_streak} pts`;
    }
}

function createNewChallenge() {
    openCreateChallengeModal();
}

function editChallenge(challengeId) {
    showNotification('✏️ Modification du défi (à venir)', 'info');
}

function deleteChallenge(challengeId) {
    showConfirm(
        'Supprimer le défi',
        'Êtes-vous sûr de vouloir supprimer ce défi ?',
        'Les participants perdront leurs progrès.',
        () => {
            showNotification('🗑️ Défi supprimé', 'success');
        }
    );
}

// ===== VALIDATION TRADE SUSPECT =====
async function validateSuspiciousTrade(alertId, userId, tradeData, approved) {
    try {
        if (!window.firebaseDb) return;
        
        // Marquer l'alerte comme traitée
        await window.firebaseDb.collection('admin_alerts').doc(alertId).update({
            status: approved ? 'approved' : 'rejected',
            reviewedBy: window.currentUser?.id || 'admin',
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
            decision: approved ? 'Points attribués' : 'Points refusés'
        });
        
        if (approved && window.PointsSystem) {
            // ✅ ATTRIBUER LES POINTS RÉTROACTIVEMENT
            try {
                await window.PointsSystem.awardTradingPoints(
                    userId,
                    true, // trading réel
                    tradeData.profitPercent,
                    `Trade validé par admin - ${tradeData.token} +${tradeData.profitPercent.toFixed(1)}%`
                );
                
                showNotification(`✅ Points attribués rétroactivement à l'utilisateur`, 'success');
                console.log(`🎯 Points rétroactifs attribués:`, tradeData);
                
            } catch (pointsError) {
                console.error('❌ Erreur attribution points rétroactifs:', pointsError);
                showNotification('⚠️ Erreur attribution points', 'error');
            }
        }
        
        const decision = approved ? 'approuvé' : 'rejeté';
        showNotification(`🔍 Trade ${decision} avec succès`, 'success');
        
        // Rafraîchir la liste des alertes
        setTimeout(() => {
            loadAdminAlerts();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erreur validation trade:', error);
        showNotification('❌ Erreur lors de la validation', 'error');
    }
}

// ===== CHARGEMENT ALERTES ADMIN =====
async function loadAdminAlerts() {
    if (!window.firebaseDb) return;
    
    try {
        const alertsSnapshot = await window.firebaseDb
            .collection('admin_alerts')
            .where('type', '==', 'suspicious_trade')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        const alertsContainer = document.getElementById('admin-alerts-container');
        if (!alertsContainer) return;
        
        if (alertsSnapshot.empty) {
            alertsContainer.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">Aucune alerte en attente</p>';
            return;
        }
        
        alertsContainer.innerHTML = alertsSnapshot.docs.map(doc => {
            const alert = doc.data();
            const details = alert.details;
            
            return `
                <div class="alert-card suspicious-trade" style="background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <div class="alert-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="color: #ffc107; margin: 0;">🚨 ${alert.title}</h4>
                        <span class="alert-priority ${alert.priority}" style="padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; background: rgba(255,193,7,0.2); color: #ffc107;">
                            ${alert.priority.toUpperCase()}
                        </span>
                    </div>
                    
                    <div class="alert-details" style="margin-bottom: 1rem;">
                        <p style="color: rgba(255,255,255,0.8); margin-bottom: 0.5rem;">${alert.message}</p>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem;">
                            <div>
                                <strong style="color: #ffc107;">Utilisateur:</strong>
                                <p style="margin: 0; color: rgba(255,255,255,0.8);">${details.userName} (${details.userEmail})</p>
                            </div>
                            <div>
                                <strong style="color: #ffc107;">Token:</strong>
                                <p style="margin: 0; color: rgba(255,255,255,0.8);">${details.token}</p>
                            </div>
                            <div>
                                <strong style="color: #ffc107;">Profit:</strong>
                                <p style="margin: 0; color: ${details.profitAmount >= 0 ? '#4caf50' : '#f44336'};">
                                    +${details.profitPercent.toFixed(1)}% (+$${details.profitAmount.toFixed(2)})
                                </p>
                            </div>
                            <div>
                                <strong style="color: #ffc107;">Levier:</strong>
                                <p style="margin: 0; color: rgba(255,255,255,0.8);">${details.leverage}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert-actions" style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn-success" onclick="validateSuspiciousTrade('${doc.id}', '${details.userId}', ${JSON.stringify(details).replace(/"/g, '&quot;')}, true)" style="background: #4caf50; border: none; color: #fff; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                            ✅ Approuver & Attribuer Points
                        </button>
                        <button class="btn btn-danger" onclick="validateSuspiciousTrade('${doc.id}', '${details.userId}', ${JSON.stringify(details).replace(/"/g, '&quot;')}, false)" style="background: #f44336; border: none; color: #fff; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                            ❌ Rejeter Trade
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log(`🚨 ${alertsSnapshot.docs.length} alertes chargées`);
        
    } catch (error) {
        console.error('❌ Erreur chargement alertes:', error);
    }
}

async function loadUsersByLevel() {
    // Cette fonction charge la répartition des utilisateurs par niveau
    // Elle est déjà appelée dans loadPointsStats()
    console.log('📊 Répartition par niveau mise à jour');
}

// ===== EXPOSITION GLOBALE ALERTES =====
window.validateSuspiciousTrade = validateSuspiciousTrade;
window.loadAdminAlerts = loadAdminAlerts;

// ===== AUTO-CHARGEMENT ALERTES =====
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadAdminAlerts();
        // Actualiser toutes les 30 secondes
        setInterval(loadAdminAlerts, 30000);
    }, 2000);
});

// ===== EXPOSITION GLOBALE =====
window.openBulkPointsModal = openBulkPointsModal;
window.openCreateChallengeModal = openCreateChallengeModal;
window.openPointsHistoryModal = openPointsHistoryModal;
window.toggleAllUsers = toggleAllUsers;
window.executeBulkPoints = executeBulkPoints;
window.selectChallengeType = selectChallengeType;
window.createChallenge = createChallenge;
window.editUserPoints = editUserPoints;
window.addUserPoints = addUserPoints;
window.resetUserPoints = resetUserPoints;
window.executeEditUserPoints = executeEditUserPoints;
window.executeAddUserPoints = executeAddUserPoints;
window.refreshLeaderboard = refreshLeaderboard;
window.exportLeaderboard = exportLeaderboard;
window.exportPointsHistory = exportPointsHistory;
window.editLevels = editLevels;
window.editPointsConfig = editPointsConfig;
window.createNewChallenge = createNewChallenge;
window.editChallenge = editChallenge;
window.deleteChallenge = deleteChallenge;

console.log('✅ Points Admin JavaScript chargé et prêt');