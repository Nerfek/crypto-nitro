// ===== ADMIN/JS/USER-MANAGEMENT.JS =====

console.log('👥 Module de gestion des utilisateurs chargé');

// ===== VARIABLES GLOBALES =====
let usersData = [];
let filteredUsers = [];
let currentPage = 1;
let usersPerPage = 10;
let sortBy = 'name';
let sortDirection = 'asc';

// ===== CHARGEMENT COMPLET DES UTILISATEURS =====
async function loadUsersTable() {
    try {
        showLoadingState();
        
        if (typeof firebaseDb !== 'undefined') {
            await loadUsersFromFirebase();
        } else {
            loadMockUsersData();
        }
        
        applyFilters();
        renderUsersTable();
        renderPagination();
        
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        showNotification('Erreur lors du chargement des utilisateurs', 'error');
        loadMockUsersData();
    }
}

// ===== CHARGEMENT DEPUIS FIREBASE =====
async function loadUsersFromFirebase() {
    try {
        const usersSnapshot = await firebaseDb.collection('users').get();
        
        usersData = usersSnapshot.docs.map(doc => {
            const userData = doc.data();
            return {
                id: doc.id,
                name: userData.displayName || userData.name || userData.email?.split('@')[0] || 'Utilisateur',
                email: userData.email || 'Non défini',
                role: userData.role || 'user',
                rank: userData.rank || 'cadet',
                portfolio: userData.portfolio || 0,
                joinDate: userData.createdAt ? 
                    new Date(userData.createdAt.seconds * 1000).toISOString().split('T')[0] : 
                    new Date().toISOString().split('T')[0],
                lastLogin: userData.lastLogin ? 
                    new Date(userData.lastLogin.seconds * 1000).toISOString().split('T')[0] : 
                    new Date().toISOString().split('T')[0],
                status: userData.status || 'active',
                country: userData.country || 'France',
                subscription: userData.subscription || 'basic',
                uid: userData.uid || doc.id
            };
        });
        
        console.log(`📊 ${usersData.length} utilisateurs chargés depuis Firebase`);
        
    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs Firebase:', error);
        throw error;
    }
}

// ===== DONNÉES DE TEST =====
function loadMockUsersData() {
    usersData = [
        {
            id: '1',
            name: 'Jean Dupont',
            email: 'jean.dupont@example.com',
            role: 'user',
            rank: 'cadet',
            portfolio: 580.00,
            joinDate: '2024-02-01',
            status: 'banned',
            lastLogin: '2025-01-18',
            country: 'France',
            subscription: 'basic'
        },
        {
            id: '4',
            name: 'Sophie Lambert',
            email: 'sophie.lambert@example.com',
            role: 'user',
            rank: 'expert',
            portfolio: 15670.50,
            joinDate: '2023-08-12',
            status: 'active',
            lastLogin: '2025-01-21',
            country: 'Canada',
            subscription: 'premium'
        },
        {
            id: '5',
            name: 'Thomas Rousseau',
            email: 'thomas.rousseau@example.com',
            role: 'admin',
            rank: 'maitre',
            portfolio: 45230.80,
            joinDate: '2023-05-03',
            status: 'active',
            lastLogin: '2025-01-21',
            country: 'France',
            subscription: 'premium'
        },
        {
            id: '6',
            name: 'Emma Wilson',
            email: 'emma.wilson@example.com',
            role: 'user',
            rank: 'confirmé',
            portfolio: 3250.25,
            joinDate: '2024-03-10',
            status: 'pending',
            lastLogin: '2025-01-19',
            country: 'UK',
            subscription: 'basic'
        },
        {
            id: '7',
            name: 'Lucas Garcia',
            email: 'lucas.garcia@example.com',
            role: 'formateur',
            rank: 'expert',
            portfolio: 12450.00,
            joinDate: '2023-09-25',
            status: 'active',
            lastLogin: '2025-01-20',
            country: 'Espagne',
            subscription: 'premium'
        },
        {
            id: '8',
            name: 'Amelia Davis',
            email: 'amelia.davis@example.com',
            role: 'user',
            rank: 'cadet',
            portfolio: 890.75,
            joinDate: '2024-04-18',
            status: 'active',
            lastLogin: '2025-01-21',
            country: 'USA',
            subscription: 'basic'
        }
    ];
    
    console.log(`📊 ${usersData.length} utilisateurs de test chargés`);
}

// ===== FILTRAGE ET RECHERCHE =====
function applyFilters() {
    const searchTerm = document.getElementById('user-search')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('user-role-filter')?.value || '';
    const statusFilter = document.getElementById('user-status-filter')?.value || '';
    
    filteredUsers = usersData.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm) || 
                             user.email.toLowerCase().includes(searchTerm);
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    // Appliquer le tri
    sortUsers();
    
    // Réinitialiser à la première page
    currentPage = 1;
}

// ===== TRI DES UTILISATEURS =====
function sortUsers() {
    filteredUsers.sort((a, b) => {
        let valueA = a[sortBy];
        let valueB = b[sortBy];
        
        // Conversion pour les valeurs numériques
        if (sortBy === 'portfolio') {
            valueA = parseFloat(valueA);
            valueB = parseFloat(valueB);
        }
        
        // Conversion pour les dates
        if (sortBy === 'joinDate' || sortBy === 'lastLogin') {
            valueA = new Date(valueA);
            valueB = new Date(valueB);
        }
        
        // Comparaison
        if (valueA < valueB) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

// ===== RENDU TABLE UTILISATEURS =====
function renderUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;
    
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const pageUsers = filteredUsers.slice(start, end);
    
    if (pageUsers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">👤</div>
                    <div>Aucun utilisateur trouvé</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = pageUsers.map(user => `
        <tr class="user-row" data-user-id="${user.id}">
            <td>
                <div class="user-cell">
                    <div class="user-avatar-sm">${getUserAvatar(user.portfolio)}</div>
                    <div class="user-info">
                        <div class="user-name">${user.name}</div>
                        <div class="user-country">${user.country || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="email-cell">
                    <span class="email-address">${user.email}</span>
                    <span class="subscription-badge ${user.subscription}">${user.subscription}</span>
                </div>
            </td>
            <td><span class="role-badge ${user.role}">${getRoleDisplay(user.role)}</span></td>
            <td><span class="rank-badge ${user.rank}">${getRankDisplay(user.rank)}</span></td>
            <td class="portfolio-cell">
                <span class="portfolio-amount">${user.portfolio.toLocaleString()}</span>
            </td>
            <td>
                <div class="date-cell">
                    <span class="join-date">${formatDate(user.joinDate)}</span>
                    <span class="last-login">Vu: ${formatDate(user.lastLogin)}</span>
                </div>
            </td>
            <td><span class="status-badge ${user.status}">${getStatusDisplay(user.status)}</span></td>
            <td>
                <div class="action-buttons">
                    <div class="dropdown">
                        <button class="dropdown-toggle action-btn-sm">⚙️</button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item" data-action="view" data-user-id="${user.id}">👁️ Voir détails</button>
                            <button class="dropdown-item" data-action="edit" data-user-id="${user.id}">✏️ Modifier</button>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item" data-action="promote" data-user-id="${user.id}">⬆️ Promouvoir</button>
                            <button class="dropdown-item" data-action="role" data-user-id="${user.id}">🔄 Changer rôle</button>
                            <div class="dropdown-divider"></div>
                            ${user.status === 'banned' ? 
                                `<button class="dropdown-item" data-action="unban" data-user-id="${user.id}">✅ Débannir</button>` :
                                `<button class="dropdown-item" data-action="ban" data-user-id="${user.id}">🚫 Bannir</button>`
                            }
                            <button class="dropdown-item text-danger" data-action="delete" data-user-id="${user.id}">🗑️ Supprimer</button>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Initialiser les dropdowns
    initTableDropdowns();
}

// ===== PAGINATION =====
function renderPagination() {
    const pagination = document.getElementById('users-pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const start = (currentPage - 1) * usersPerPage + 1;
    const end = Math.min(currentPage * usersPerPage, filteredUsers.length);
    
    pagination.innerHTML = `
        <div class="pagination-advanced">
            <div class="pagination-info">
                Affichage ${start}-${end} sur ${filteredUsers.length} utilisateurs
            </div>
            <div class="pagination-controls">
                <button class="page-btn" onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>⏮️</button>
                <button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀</button>
                
                ${generatePageNumbers(currentPage, totalPages)}
                
                <button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>▶</button>
                <button class="page-btn" onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>⏭️</button>
            </div>
        </div>
    `;
}

function generatePageNumbers(current, total) {
    const pages = [];
    const delta = 2; // Nombre de pages à afficher de chaque côté
    
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
        pages.push(`
            <button class="page-btn ${i === current ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `);
    }
    
    return pages.join('');
}

function changePage(page) {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderUsersTable();
        renderPagination();
    }
}


// ===== GESTION DES DROPDOWNS =====
function initTableDropdowns() {
    // Supprimer les anciens écouteurs pour éviter les doublons
    document.removeEventListener('click', closeAllDropdowns);
    
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    console.log(`🔧 Initialisation de ${dropdowns.length} dropdowns`);
    
    dropdowns.forEach((toggle, index) => {
        // Supprimer les anciens écouteurs
        toggle.replaceWith(toggle.cloneNode(true));
        const newToggle = document.querySelectorAll('.dropdown-toggle')[index];
        
        // Dans la partie où tu ajoutes l'événement click au toggle, remplace par :
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🖱️ Clic sur dropdown toggle');
            
            // Fermer tous les autres dropdowns
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                if (dropdown !== newToggle.parentElement) {
                    dropdown.classList.remove('active', 'bottom');
                }
            });
            
            // Toggle du dropdown actuel
            const parentDropdown = newToggle.parentElement;
            const isActive = parentDropdown.classList.contains('active');
            
            if (isActive) {
                parentDropdown.classList.remove('active', 'bottom');
                console.log('📤 Dropdown fermé');
            } else {
                // Vérifier si on est près du bas de l'écran
                const rect = newToggle.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const dropdownHeight = 200; // Hauteur approximative du dropdown
                
                // Si pas assez de place en bas, ouvrir vers le haut
                if (rect.bottom + dropdownHeight > windowHeight) {
                    parentDropdown.classList.add('active', 'bottom');
                    console.log('📥 Dropdown ouvert vers le haut');
                } else {
                    parentDropdown.classList.add('active');
                    console.log('📥 Dropdown ouvert vers le bas');
                }
            }
        });
    });
    
    // Gérer les clics sur les items du dropdown
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            e.preventDefault();
            e.stopPropagation();
            
            const action = e.target.dataset.action;
            const userId = e.target.dataset.userId;
            
            console.log(`🎯 Action: ${action} pour utilisateur: ${userId}`);
            
            // Fermer le dropdown
            closeAllDropdowns();
            
            // Exécuter l'action
            switch(action) {
                case 'view':
                    viewUserDetails(userId);
                    break;
                case 'edit':
                    editUser(userId);
                    break;
                case 'promote':
                    promoteUser(userId);
                    break;
                case 'role':
                    changeUserRole(userId);
                    break;
                case 'ban':
                    banUser(userId);
                    break;
                case 'unban':
                    unbanUser(userId);
                    break;
                case 'delete':
                    deleteUser(userId);
                    break;
                default:
                    console.log('❌ Action inconnue:', action);
            }
        }
    });
    
    // Fermer les dropdowns en cliquant ailleurs
    document.addEventListener('click', closeAllDropdowns);
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
    });
}


// ===== ACTIONS UTILISATEURS AVANCÉES =====
function viewUserDetails(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    const detailsContent = `
        <div class="user-details">
            <div class="user-header">
                <div class="user-avatar-large">${getUserAvatar(user.portfolio)}</div>
                <div class="user-basic-info">
                    <h3>${user.name}</h3>
                    <p class="user-email">${user.email}</p>
                    <div class="user-badges">
                        <span class="role-badge ${user.role}">${getRoleDisplay(user.role)}</span>
                        <span class="rank-badge ${user.rank}">${getRankDisplay(user.rank)}</span>
                        <span class="status-badge ${user.status}">${getStatusDisplay(user.status)}</span>
                    </div>
                </div>
            </div>
            
            <div class="user-stats-grid">
                <div class="stat-item">
                    <label>💰 Portfolio</label>
                    <value class="portfolio">${user.portfolio.toLocaleString()} €</value>
                </div>
                <div class="stat-item">
                    <label>🌍 Pays</label>
                    <value>${user.country}</value>
                </div>
                <div class="stat-item">
                    <label>📅 Inscription</label>
                    <value>${formatDate(user.joinDate)}</value>
                </div>
                <div class="stat-item">
                    <label>👁️ Dernière connexion</label>
                    <value>${formatDate(user.lastLogin)}</value>
                </div>
                <div class="stat-item">
                    <label>💳 Abonnement</label>
                    <value class="subscription ${user.subscription}">${user.subscription.toUpperCase()}</value>
                </div>
                <div class="stat-item">
                    <label>🆔 ID Utilisateur</label>
                    <value class="user-id">${user.id}</value>
                </div>
            </div>
            
            <div class="user-actions-detailed">
                <button class="btn btn-primary" onclick="editUser('${user.id}'); closeModal();">✏️ Modifier</button>
                <button class="btn btn-warning" onclick="changeUserRole('${user.id}'); closeModal();">🔄 Changer rôle</button>
                ${user.status === 'banned' ? 
                    `<button class="btn btn-success" onclick="unbanUser('${user.id}'); closeModal();">✅ Débannir</button>` :
                    `<button class="btn btn-warning" onclick="banUser('${user.id}'); closeModal();">🚫 Bannir</button>`
                }
                <button class="btn btn-secondary" onclick="closeModal();">❌ Fermer</button>
            </div>
        </div>
    `;
    
    showModal('user-details-modal', `👁️ Détails de ${user.name}`, detailsContent);
}

function changeUserRole(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    const roleContent = `
        <form id="change-role-form">
            <div class="user-role-preview">
                <div class="current-role">
                    <label>👤 Utilisateur actuel:</label>
                    <div class="user-preview">
                        <strong>${user.name}</strong> (${user.email})
                        <span class="role-badge ${user.role}">${getRoleDisplay(user.role)}</span>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="new-role">🔄 Nouveau rôle</label>
                <select id="new-role" class="form-control" required>
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>👤 Utilisateur Standard</option>
                    <option value="formateur" ${user.role === 'formateur' ? 'selected' : ''}>🎓 Formateur</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 Administrateur</option>
                </select>
                <small class="role-description" id="role-description">
                    Sélectionnez un rôle pour voir sa description
                </small>
            </div>

            <div class="form-group">
                <label for="role-reason">📝 Raison du changement</label>
                <textarea id="role-reason" class="form-control" rows="3" 
                          placeholder="Expliquez pourquoi ce changement est nécessaire..."></textarea>
            </div>

            <div class="role-permissions-info">
                <h4>ℹ️ Permissions par rôle</h4>
                <div class="permissions-grid">
                    <div class="permission-item">
                        <strong>👤 Utilisateur:</strong> Accès aux cours, portfolio personnel
                    </div>
                    <div class="permission-item">
                        <strong>🎓 Formateur:</strong> Création de cours, gestion des étudiants
                    </div>
                    <div class="permission-item">
                        <strong>👑 Admin:</strong> Gestion complète de la plateforme
                    </div>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">❌ Annuler</button>
                <button type="button" class="btn btn-primary" onclick="confirmRoleChange('${userId}')">✅ Changer le rôle</button>
            </div>
        </form>
    `;
    
    showModal('change-role-modal', `🔄 Changer le rôle de ${user.name}`, roleContent);
    
    // Ajouter l'écouteur pour les descriptions de rôles
    document.getElementById('new-role').addEventListener('change', updateRoleDescription);
    updateRoleDescription(); // Afficher la description initiale
}

function unbanUser(userId) {
    showConfirm(
        'Débannir utilisateur',
        'Voulez-vous vraiment débannir cet utilisateur ? Il pourra de nouveau accéder à la plateforme.',
        async () => {
            try {
                await updateUserStatus(userId, 'active');
                showNotification('Utilisateur débanni avec succès', 'success');
                loadUsersTable();
            } catch (error) {
                showNotification('Erreur lors du débannissement', 'error');
            }
        }
    );
}

// ===== MISE À JOUR UTILISATEUR =====
async function updateUserStatus(userId, newStatus) {
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(userId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Mode développement - mise à jour locale
            const userIndex = usersData.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                usersData[userIndex].status = newStatus;
            }
        }
    } catch (error) {
        console.error('Erreur mise à jour statut:', error);
        throw error;
    }
}

async function updateUserRole(userId, newRole, reason = '') {
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(userId).update({
                role: newRole,
                roleChangeReason: reason,
                roleChangedAt: firebase.firestore.FieldValue.serverTimestamp(),
                roleChangedBy: currentAdmin.id
            });
        } else {
            // Mode développement
            const userIndex = usersData.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                usersData[userIndex].role = newRole;
            }
        }
    } catch (error) {
        console.error('Erreur mise à jour rôle:', error);
        throw error;
    }
}

// ===== CRÉATION NOUVEL UTILISATEUR =====
function showAddUserForm() {
    const addUserContent = `
        <form id="add-user-form" class="user-form">
            <div class="form-group">
                <label for="new-user-name">Nom complet *</label>
                <input type="text" id="new-user-name" required placeholder="Jean Dupont">
            </div>
            <div class="form-group">
                <label for="new-user-email">Email *</label>
                <input type="email" id="new-user-email" required placeholder="jean@example.com">
            </div>
            <div class="form-group">
                <label for="new-user-password">Mot de passe *</label>
                <input type="password" id="new-user-password" required placeholder="Minimum 6 caractères">
            </div>
            <div class="form-group">
                <label for="new-user-role">Rôle</label>
                <select id="new-user-role">
                    <option value="user">👤 Utilisateur</option>
                    <option value="formateur">🎓 Formateur</option>
                    <option value="admin">👑 Administrateur</option>
                </select>
            </div>
            <div class="form-group">
                <label for="new-user-country">Pays</label>
                <input type="text" id="new-user-country" placeholder="France">
            </div>
            <div class="form-group">
                <label for="new-user-portfolio">Portfolio initial</label>
                <input type="number" id="new-user-portfolio" value="500" min="0" step="0.01">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">❌ Annuler</button>
                <button type="button" class="btn btn-primary" onclick="createNewUser()">✅ Créer utilisateur</button>
            </div>
        </form>
    `;
    
    showModal('add-user-modal', '➕ Ajouter un nouvel utilisateur', addUserContent);

    
    // Remplacer le bouton confirmer
    const confirmBtn = document.querySelector('.modal-footer .btn-primary');
    if (confirmBtn) {
        confirmBtn.onclick = createNewUser;
        confirmBtn.textContent = 'Créer utilisateur';
    }
}

async function createNewUser() {
    const form = document.getElementById('add-user-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const userData = {
        name: document.getElementById('new-user-name').value,
        email: document.getElementById('new-user-email').value,
        password: document.getElementById('new-user-password').value,
        role: document.getElementById('new-user-role').value,
        country: document.getElementById('new-user-country').value || 'France',
        portfolio: parseFloat(document.getElementById('new-user-portfolio').value) || 500,
        rank: 'cadet',
        status: 'active',
        subscription: 'basic',
        joinDate: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        createdBy: currentAdmin.id
    };
    
    // Validation simple
    if (!userData.name || !userData.email || !userData.password) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    if (userData.password.length < 6) {
        showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }
    
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            // Créer dans Firebase
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(userData.email, userData.password);
            
            // Ajouter les données utilisateur
            await firebaseDb.collection('users').doc(userCredential.user.uid).set({
                ...userData,
                uid: userCredential.user.uid
            });
            
            showNotification('Utilisateur créé avec succès', 'success');
        } else {
            // Mode développement
            userData.id = 'user_' + Date.now();
            usersData.push(userData);
            showNotification('Utilisateur créé (mode dev)', 'success');
        }
        
        closeModal();
        loadUsersTable();
        
    } catch (error) {
        console.error('Erreur création utilisateur:', error);
        showNotification('Erreur lors de la création: ' + error.message, 'error');
    }
}

// ===== ÉTAT DE CHARGEMENT =====
function showLoadingState() {
    const tableBody = document.getElementById('users-table-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <div class="loader large"></div>
                    <div style="margin-top: 1rem; color: rgba(255,255,255,0.7);">Chargement des utilisateurs...</div>
                </td>
            </tr>
        `;
    }
}

// ===== RECHERCHE EN TEMPS RÉEL =====
function initUserSearch() {
    const searchInput = document.getElementById('user-search');
    const roleFilter = document.getElementById('user-role-filter');
    const statusFilter = document.getElementById('user-status-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            applyFilters();
            renderUsersTable();
            renderPagination();
        }, 300));
    }
    
    if (roleFilter) {
        roleFilter.addEventListener('change', () => {
            applyFilters();
            renderUsersTable();
            renderPagination();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            applyFilters();
            renderUsersTable();
            renderPagination();
        });
    }
}

// ===== UTILITAIRE DEBOUNCE =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== TRI PAR COLONNE =====
function initTableSorting() {
    const headers = document.querySelectorAll('.users-table th[data-sort]');
    
    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            const newSortBy = header.dataset.sort;
            
            if (sortBy === newSortBy) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortBy = newSortBy;
                sortDirection = 'asc';
            }
            
            applyFilters();
            renderUsersTable();
            renderPagination();
            updateSortIndicators();
        });
    });
}

function updateSortIndicators() {
    document.querySelectorAll('.users-table th[data-sort]').forEach(header => {
        header.classList.remove('sorted-asc', 'sorted-desc');
        
        if (header.dataset.sort === sortBy) {
            header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// ===== EXPORT/IMPORT =====
function exportUsers() {
    const csvContent = [
        // Headers
        ['ID', 'Nom', 'Email', 'Rôle', 'Rang', 'Portfolio', 'Pays', 'Statut', 'Inscription', 'Dernière connexion'],
        // Data
        ...filteredUsers.map(user => [
            user.id,
            user.name,
            user.email,
            user.role,
            user.rank,
            user.portfolio,
            user.country,
            user.status,
            user.joinDate,
            user.lastLogin
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Export réalisé avec succès', 'success');
}


// ===== MISE À JOUR DESCRIPTION RÔLE =====
function updateRoleDescription() {
    const roleSelect = document.getElementById('new-role');
    const descriptionEl = document.getElementById('role-description');
    
    if (!roleSelect || !descriptionEl) return;
    
    const descriptions = {
        'user': '👤 Accès standard : cours, portfolio, profil personnel',
        'formateur': '🎓 Accès étendu : création de cours, gestion étudiants + accès utilisateur',
        'admin': '👑 Accès complet : gestion plateforme, utilisateurs, finances + tous les accès'
    };
    
    descriptionEl.textContent = descriptions[roleSelect.value] || '';
    descriptionEl.className = `role-description ${roleSelect.value}`;
}

// ===== CONFIRMER CHANGEMENT RÔLE =====
async function confirmRoleChange(userId) {
    const newRole = document.getElementById('new-role').value;
    const reason = document.getElementById('role-reason').value.trim();
    
    if (!newRole) {
        showNotification('Veuillez sélectionner un rôle', 'error');
        return;
    }
    
    if (!reason) {
        showNotification('Veuillez indiquer la raison du changement', 'error');
        return;
    }
    
    try {
        await updateUserRole(userId, newRole, reason);
        
        // Mettre à jour localement
        const userIndex = usersData.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            usersData[userIndex].role = newRole;
        }
        
        showNotification(`✅ Rôle changé vers ${getRoleDisplay(newRole)}`, 'success');
        closeModal();
        
        // Recharger la table
        setTimeout(() => {
            applyFilters();
            renderUsersTable();
        }, 500);
        
    } catch (error) {
        console.error('❌ Erreur changement rôle:', error);
        showNotification('❌ Erreur lors du changement de rôle', 'error');
    }
}

// ===== MISE À JOUR RÔLE FIREBASE =====
async function updateUserRole(userId, newRole, reason = '') {
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(userId).update({
                role: newRole,
                roleChangeReason: reason,
                roleChangedAt: firebase.firestore.FieldValue.serverTimestamp(),
                roleChangedBy: currentAdmin?.id || 'admin',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Rôle mis à jour: ${userId} → ${newRole}`);
        } else {
            // Mode développement
            console.log(`🔧 Mode dev - Rôle changé: ${userId} → ${newRole}`);
        }
    } catch (error) {
        console.error('❌ Erreur Firebase updateUserRole:', error);
        throw error;
    }
}

// ===== AFFICHAGE AMÉLIORÉ DES RÔLES =====
function getRoleDisplay(role) {
    const roles = {
        'user': '👤 Utilisateur',
        'formateur': '🎓 Formateur', 
        'admin': '👑 Administrateur'
    };
    return roles[role] || '👤 Utilisateur';
}


// ===== MODIFICATION UTILISATEUR =====
function editUser(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) {
        showNotification('Utilisateur introuvable', 'error');
        return;
    }
    
    const editContent = `
        <form id="edit-user-form">
            <div class="user-edit-preview">
                <div class="edit-user-header">
                    <div class="user-avatar-large">${getUserAvatar(user.portfolio)}</div>
                    <div class="user-basic-info">
                        <h4>Modification de ${user.name}</h4>
                        <p class="user-email">${user.email}</p>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="edit-user-name">👤 Nom complet</label>
                <input type="text" id="edit-user-name" class="form-control" 
                       value="${user.name}" required>
            </div>

            <div class="form-group">
                <label for="edit-user-email">📧 Email</label>
                <input type="email" id="edit-user-email" class="form-control" 
                       value="${user.email}" required>
                <small class="form-hint">⚠️ Attention : changer l'email peut affecter la connexion</small>
            </div>

            <div class="form-group">
                <label for="edit-user-portfolio">💰 Portfolio</label>
                <input type="number" id="edit-user-portfolio" class="form-control" 
                       value="${user.portfolio}" min="0" step="0.01">
            </div>

            <div class="form-group">
                <label for="edit-user-country">🌍 Pays</label>
                <input type="text" id="edit-user-country" class="form-control" 
                       value="${user.country}">
            </div>

            <div class="form-group">
                <label for="edit-user-rank">🏆 Rang</label>
                <select id="edit-user-rank" class="form-control">
                    <option value="cadet" ${user.rank === 'cadet' ? 'selected' : ''}>🚀 Cadet</option>
                    <option value="confirmé" ${user.rank === 'confirmé' ? 'selected' : ''}>⭐ Confirmé</option>
                    <option value="expert" ${user.rank === 'expert' ? 'selected' : ''}>🏆 Expert</option>
                    <option value="maitre" ${user.rank === 'maitre' ? 'selected' : ''}>👑 Maître</option>
                </select>
            </div>

            <div class="form-group">
                <label for="edit-user-subscription">💳 Abonnement</label>
                <select id="edit-user-subscription" class="form-control">
                    <option value="basic" ${user.subscription === 'basic' ? 'selected' : ''}>Basic</option>
                    <option value="premium" ${user.subscription === 'premium' ? 'selected' : ''}>Premium</option>
                </select>
            </div>

            <div class="form-group">
                <label for="edit-user-status">🔘 Statut</label>
                <select id="edit-user-status" class="form-control">
                    <option value="active" ${user.status === 'active' ? 'selected' : ''}>✅ Actif</option>
                    <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>⏳ En attente</option>
                    <option value="banned" ${user.status === 'banned' ? 'selected' : ''}>🚫 Banni</option>
                </select>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">❌ Annuler</button>
                <button type="button" class="btn btn-primary" onclick="saveUserChanges('${userId}')">💾 Enregistrer</button>
            </div>
        </form>
    `;
    
    showModal('edit-user-modal', `✏️ Modifier ${user.name}`, editContent);
}

// ===== SAUVEGARDER MODIFICATIONS UTILISATEUR =====
async function saveUserChanges(userId) {
    const form = document.getElementById('edit-user-form');
    if (!form) return;
    
    const updatedData = {
        name: document.getElementById('edit-user-name').value.trim(),
        email: document.getElementById('edit-user-email').value.trim(),
        portfolio: parseFloat(document.getElementById('edit-user-portfolio').value) || 0,
        country: document.getElementById('edit-user-country').value.trim(),
        rank: document.getElementById('edit-user-rank').value,
        subscription: document.getElementById('edit-user-subscription').value,
        status: document.getElementById('edit-user-status').value
    };
    
    // Validation
    if (!updatedData.name) {
        showNotification('Le nom est obligatoire', 'error');
        return;
    }
    
    if (!updatedData.email || !isValidEmail(updatedData.email)) {
        showNotification('Email invalide', 'error');
        return;
    }
    
    try {
        // Mettre à jour dans Firebase
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(userId).update({
                ...updatedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentAdmin?.id || 'admin'
            });
        }
        
        // Mettre à jour localement
        const userIndex = usersData.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            usersData[userIndex] = { ...usersData[userIndex], ...updatedData };
        }
        
        showNotification('✅ Utilisateur modifié avec succès', 'success');
        closeModal();
        
        // Recharger la table
        setTimeout(() => {
            applyFilters();
            renderUsersTable();
        }, 500);
        
    } catch (error) {
        console.error('❌ Erreur modification utilisateur:', error);
        showNotification('❌ Erreur lors de la modification', 'error');
    }
}


// ===== SAUVEGARDER MODIFICATIONS UTILISATEUR =====
async function saveUserChanges(userId) {
    const form = document.getElementById('edit-user-form');
    if (!form) return;
    
    const updatedData = {
        name: document.getElementById('edit-user-name').value.trim(),
        email: document.getElementById('edit-user-email').value.trim(),
        portfolio: parseFloat(document.getElementById('edit-user-portfolio').value) || 0,
        country: document.getElementById('edit-user-country').value.trim(),
        rank: document.getElementById('edit-user-rank').value,
        subscription: document.getElementById('edit-user-subscription').value,
        status: document.getElementById('edit-user-status').value
    };
    
    // Validation
    if (!updatedData.name) {
        showNotification('Le nom est obligatoire', 'error');
        return;
    }
    
    if (!updatedData.email || !isValidEmail(updatedData.email)) {
        showNotification('Email invalide', 'error');
        return;
    }
    
    try {
        // Mettre à jour dans Firebase
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(userId).update({
                ...updatedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentAdmin?.id || 'admin'
            });
        }
        
        // Mettre à jour localement
        const userIndex = usersData.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            usersData[userIndex] = { ...usersData[userIndex], ...updatedData };
        }
        
        showNotification('✅ Utilisateur modifié avec succès', 'success');
        closeModal();
        
        // Recharger la table
        setTimeout(() => {
            applyFilters();
            renderUsersTable();
        }, 500);
        
    } catch (error) {
        console.error('❌ Erreur modification utilisateur:', error);
        showNotification('❌ Erreur lors de la modification', 'error');
    }
}



// ===== FONCTIONS D'ACTIONS UTILISATEUR =====
function promoteUser(userId) {
    showConfirm(
        'Promouvoir utilisateur',
        'Êtes-vous sûr de vouloir promouvoir cet utilisateur ?',
        async () => {
            try {
                const user = usersData.find(u => u.id === userId);
                if (!user) return;
                
                // Logique de promotion (exemple: augmenter le rang)
                const ranks = ['cadet', 'confirmé', 'expert', 'maitre'];
                const currentIndex = ranks.indexOf(user.rank);
                const newRank = currentIndex < ranks.length - 1 ? ranks[currentIndex + 1] : user.rank;
                
                if (typeof firebaseDb !== 'undefined') {
                    await firebaseDb.collection('users').doc(userId).update({
                        rank: newRank,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                // Mettre à jour localement
                const userIndex = usersData.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    usersData[userIndex].rank = newRank;
                }
                
                showNotification(`✅ Utilisateur promu vers ${getRankDisplay(newRank)}`, 'success');
                
                // Recharger la table
                setTimeout(() => {
                    applyFilters();
                    renderUsersTable();
                }, 500);
                
            } catch (error) {
                showNotification('❌ Erreur lors de la promotion', 'error');
            }
        }
    );
}

function banUser(userId) {
    showConfirm(
        'Bannir utilisateur',
        'Êtes-vous sûr de vouloir bannir cet utilisateur ?',
        async () => {
            try {
                await updateUserStatus(userId, 'banned');
                showNotification('🚫 Utilisateur banni', 'warning');
                
                // Recharger la table
                setTimeout(() => {
                    applyFilters();
                    renderUsersTable();
                }, 500);
                
            } catch (error) {
                showNotification('❌ Erreur lors du bannissement', 'error');
            }
        },
        'danger'
    );
}

function deleteUser(userId) {
    showConfirm(
        'Supprimer utilisateur',
        'Cette action est irréversible. Voulez-vous vraiment supprimer cet utilisateur ?',
        async () => {
            try {
                if (typeof firebaseDb !== 'undefined') {
                    await firebaseDb.collection('users').doc(userId).delete();
                }
                
                // Supprimer localement
                const userIndex = usersData.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    usersData.splice(userIndex, 1);
                }
                
                showNotification('🗑️ Utilisateur supprimé', 'info');
                
                // Recharger la table
                setTimeout(() => {
                    applyFilters();
                    renderUsersTable();
                }, 500);
                
            } catch (error) {
                showNotification('❌ Erreur lors de la suppression', 'error');
            }
        },
        'danger'
    );
}




// ===== EXPOSITION GLOBALE DES FONCTIONS =====
window.addNewUser = showAddUserForm;
window.loadUsersTable = loadUsersTable;
window.changePage = changePage;
window.viewUserDetails = viewUserDetails;
window.editUser = editUser;
window.saveUserChanges = saveUserChanges;
window.changeUserRole = changeUserRole;
window.confirmRoleChange = confirmRoleChange;
window.updateRoleDescription = updateRoleDescription;
window.promoteUser = promoteUser;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.deleteUser = deleteUser;
window.createNewUser = createNewUser;
window.exportUsers = exportUsers;

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    initUserSearch();
    initTableSorting();
});

console.log('✅ Module gestion utilisateurs prêt');

// ===== ACTIONS BULK (SELECTION MULTIPLE) =====
function initBulkActions() {
    const selectAllCheckbox = document.getElementById('select-all-users');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
    }
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-users');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    
    userCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkActionsVisibility();
}

// ===== STATISTIQUES UTILISATEURS =====
function getUserStats() {
    const stats = {
        total: usersData.length,
        active: usersData.filter(u => u.status === 'active').length,
        banned: usersData.filter(u => u.status === 'banned').length,
        pending: usersData.filter(u => u.status === 'pending').length,
        admins: usersData.filter(u => u.role === 'admin').length,
        formateurs: usersData.filter(u => u.role === 'formateur').length,
        totalPortfolio: usersData.reduce((sum, u) => sum + u.portfolio, 0),
        averagePortfolio: usersData.length > 0 ? usersData.reduce((sum, u) => sum + u.portfolio, 0) / usersData.length : 0
    };
    
    return stats;
}

// ===== VALIDATION EMAIL =====
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===== GESTION ERREURS =====
function handleUserActionError(error, action) {
    console.error(`Erreur ${action}:`, error);
    
    let message = `Erreur lors de ${action}`;
    
    if (error.code === 'permission-denied') {
        message = 'Permissions insuffisantes pour cette action';
    } else if (error.code === 'not-found') {
        message = 'Utilisateur introuvable';
    } else if (error.message) {
        message = error.message;
    }
    
    showNotification(message, 'error');
}


// ===== UTILITAIRES UTILISATEURS =====
function getUserAvatar(portfolio) {
    if (portfolio >= 5000) return '👑';
    if (portfolio >= 2000) return '🏆';
    if (portfolio >= 1000) return '🌟';
    return '👨‍🚀';
}

function getRankDisplay(rank) {
    const ranks = {
        'cadet': '🚀 Cadet',
        'confirmé': '⭐ Confirmé',
        'expert': '🏆 Expert',
        'maitre': '👑 Maître'
    };
    return ranks[rank] || rank;
}

function getStatusDisplay(status) {
    const statuses = {
        'active': 'Actif',
        'banned': 'Banni',
        'pending': 'En attente'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
}


// ===== UTILISATION DES FONCTIONS GLOBALES =====
function showModal(modalId, title, content) {
    // Créer directement une modale simple
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(26, 0, 51, 0.9); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a0033, #2d1b69);
        border: 2px solid rgba(255, 136, 0, 0.3);
        border-radius: 15px; padding: 2rem; max-width: 600px;
        width: 90%; max-height: 80vh; overflow-y: auto; color: #ffffff;
    `;
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255, 136, 0, 0.2);">
            <h3 style="color: #ff8800; margin: 0;">${title}</h3>
            <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; padding: 0.5rem; border-radius: 4px; transition: all 0.3s ease;">&times;</button>
        </div>
        <div>${content}</div>
    `;
    
    // Ajouter l'événement de fermeture après création
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn.addEventListener('click', () => overlay.remove());
    
    // Effet hover sur le bouton fermer
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(255, 71, 87, 0.2)';
        closeBtn.style.color = '#ff4757';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none';
        closeBtn.style.color = '#fff';
    });
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Fermer en cliquant à l'extérieur
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

function showConfirm(title, message, onConfirm) {
    if (confirm(`${title}\n\n${message}`)) {
        onConfirm();
    }
}

function closeModal() {
    const modals = document.querySelectorAll('div[style*="z-index: 10000"]');
    modals.forEach(modal => modal.remove());
}

function showNotification(message, type = 'info') {
    const colors = {
        success: '#00ff88',
        error: '#ff4757', 
        warning: '#ffa502',
        info: '#00ccff'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 100px; right: 20px; z-index: 10001;
        background: rgba(26, 0, 51, 0.95); border: 1px solid ${colors[type]};
        border-radius: 10px; padding: 1rem; color: #fff; min-width: 300px;
        transform: translateX(100%); transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

console.log('✅ Module gestion utilisateurs COMPLET');