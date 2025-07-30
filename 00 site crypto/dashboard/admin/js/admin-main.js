// ===== ADMIN/JS/ADMIN-MAIN.JS - VERSION COMPLÈTE =====

console.log('🛡️ Initialisation Admin Dashboard CryptoTraders Pro');

// ===== VARIABLES GLOBALES =====
let currentAdmin = null;
let currentSection = 'overview';
let charts = {};

// ===== VÉRIFICATION AUTHENTIFICATION ADMIN =====
function checkAdminAuthentication() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // Vérifier si l'utilisateur est admin
                const isAdmin = await checkAdminRole(user.uid);
                
                if (isAdmin) {
                    currentAdmin = {
                        id: user.uid,
                        email: user.email,
                        name: user.displayName || 'Administrateur',
                        role: 'admin'
                    };
                    
                    initAdminDashboard();
                    loadAdminData();
                } else {
                    // Rediriger vers dashboard utilisateur
                    showNotification('Accès refusé - Privilèges administrateur requis', 'error');
                    setTimeout(() => {
                        window.location.href = '../dashboard/dashboard.html';
                    }, 2000);
                }
            } else {
                window.location.href = '../../index.html';
            }
        });
    } else {
        // Mode développement
        currentAdmin = {
            id: 'admin-dev',
            email: 'admin@crypto.space',
            name: 'Admin Dev',
            role: 'admin'
        };
        
        initAdminDashboard();
        loadMockData();
    }
}

// ===== VÉRIFICATION RÔLE ADMIN =====
async function checkAdminRole(userId) {
    // FORCER HTTP/HTTPS seulement
    if (location.protocol === 'file:') {
        console.log('🚫 Admin bloqué en mode file://');
        return false;
    }
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            const userDoc = await firebaseDb.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                return userData.role === 'admin' || userData.isAdmin === true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.log('⚠️ Erreur vérification admin:', error);
        return false;
    }
}

// ===== INITIALISATION DASHBOARD ADMIN =====
function initAdminDashboard() {
    updateAdminDisplay();
    initAdminNavigation();
    initCharts();
    initLevelFilters();
    initializeCoursesOrder();
    showSection('overview');

    // NOUVEAU : Vérifier si on doit rafraîchir les formations
    checkForRefreshSignal();
    
    // Charger les données toutes les 30 secondes
    setInterval(refreshDashboardData, 30000);
    
    console.log('✅ Dashboard Admin initialisé');
}

// ===== MISE À JOUR UI ADMIN =====
function updateAdminDisplay() {
    const adminName = document.getElementById('admin-name');
    const adminAvatar = document.getElementById('admin-avatar');
    const sidebarAdminName = document.getElementById('sidebar-admin-name');
    
    if (adminName) adminName.textContent = currentAdmin.name;
    if (adminAvatar) adminAvatar.textContent = '👑';
    if (sidebarAdminName) sidebarAdminName.textContent = currentAdmin.name;
}

// ===== NAVIGATION ADMIN =====
function initAdminNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-section]');
    
    [...navItems, ...mobileNavItems].forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    // Masquer toutes les sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Retirer active de tous les nav items
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Afficher la section demandée
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
    }
    
    // Activer les nav items correspondants
    document.querySelectorAll(`[data-section="${sectionName}"]`).forEach(item => {
        item.classList.add('active');
    });
    
    // Charger les données spécifiques à la section
    loadSectionData(sectionName);
}

// ===== CHARGEMENT DONNÉES SECTION =====
function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'formations':
            loadFormationsData();
            break;
        case 'lives':
            loadLivesData();
            break;
        case 'finances':
            loadFinancesData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// ===== CHARGEMENT DONNÉES ADMIN =====
async function loadAdminData() {
    try {
        if (typeof firebaseDb !== 'undefined') {
            // Charger les statistiques depuis Firebase
            await loadRealAdminData();
        } else {
            // Charger les données de test
            loadMockData();
        }
    } catch (error) {
        console.log('⚠️ Erreur chargement données admin:', error);
        loadMockData();
    }
}

// ===== DONNÉES RÉELLES FIREBASE =====
async function loadRealAdminData() {
    try {
        // Calculer les dates (7 derniers jours de jeudi à jeudi)
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        // Compter les utilisateurs
        const usersSnapshot = await firebaseDb.collection('users').get();
        const allUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt,
            lastLogin: doc.data().lastLogin
        }));
        
        const totalUsers = allUsers.length;
        
        // Nouveaux utilisateurs des 7 derniers jours
        const newUsersThisWeek = allUsers.filter(user => {
            if (!user.createdAt) return false;
            const userDate = user.createdAt.toDate();
            return userDate >= sevenDaysAgo && userDate <= today;
        }).length;
        
        // Utilisateurs actifs (connectés dans les 7 derniers jours)
        const activeUsersThisWeek = allUsers.filter(user => {
            if (!user.lastLogin) return false;
            const loginDate = user.lastLogin.toDate();
            return loginDate >= sevenDaysAgo && loginDate <= today;
        }).length;
        
        // Compter les cours
        const coursesSnapshot = await firebaseDb.collection('cours').get();
        const allCourses = coursesSnapshot.docs.map(doc => doc.data());
        const totalCourses = allCourses.filter(course => course.status === 'published').length;
        const draftCourses = allCourses.filter(course => course.status === 'draft').length;
        
        // Calculer revenus (exemple basique)
        const revenue = totalUsers * 29.99;
        
        updateStats({
            totalUsers: totalUsers,
            totalCourses: totalCourses,
            totalLives: 12,
            totalRevenue: revenue,
            draftsCount: draftCourses,
            newUsersThisWeek: newUsersThisWeek,
            activeUsersThisWeek: activeUsersThisWeek
        });
        
        // Générer les données pour le graphique
        await generateUserActivityChart(allUsers);
        
    } catch (error) {
        console.log('⚠️ Erreur données Firebase:', error);
        loadMockData();
    }
}

// ===== DONNÉES DE TEST =====
function loadMockData() {
    const mockStats = {
        totalUsers: 1247,
        totalCourses: 25, // Cours publiés
        totalLives: 15,
        totalRevenue: 37410,
        draftsCount: 3 // Brouillons
    };
    
    updateStats(mockStats);
    loadMockUsers();
    loadMockCourses();
    loadMockTransactions();
}


// ===== CHARGEMENT COURS ADMIN =====
// ===== VARIABLES GLOBALES POUR NIVEAUX =====
let currentLevelFilter = 'all';
let coursesByLevel = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: []
};

// ===== CHARGEMENT COURS ADMIN AVEC NIVEAUX =====
async function loadCoursesFromFirebaseAdmin() {
    try {
        if (typeof firebaseDb !== 'undefined') {
            // Récupérer TOUS les cours d'abord sans orderBy
            const coursesSnapshot = await firebaseDb.collection('cours').get();
            
            const firebaseCourses = coursesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`📚 ${firebaseCourses.length} cours chargés pour admin`);
            
            // Trier manuellement par niveau puis par ordre
            firebaseCourses.sort((a, b) => {
                const levelA = a.difficulty || 1;
                const levelB = b.difficulty || 1;
                
                if (levelA !== levelB) {
                    return levelA - levelB;
                }
                
                // Même niveau : trier par ordre (ou par date si pas d'ordre)
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                
                // Fallback sur la date de création
                const dateA = a.createdAt ? a.createdAt.seconds : 0;
                const dateB = b.createdAt ? b.createdAt.seconds : 0;
                return dateB - dateA;
            });
            
            // Organiser les cours par niveau
            organizeCoursesByLevel(firebaseCourses);
            
            // Afficher tous les cours par défaut
            renderCoursesByLevel('all', firebaseCourses);
            
            // Mettre à jour les statistiques
            updateLevelStats(firebaseCourses);
        }
    } catch (error) {
        console.error('❌ Erreur chargement cours admin:', error);
        // Charger des cours de test en cas d'erreur
        loadMockCoursesWithLevels();
    }
}

// ===== INITIALISATION ORDRE AUTOMATIQUE =====
async function initializeCoursesOrder() {
    if (typeof firebaseDb === 'undefined') {
        console.log('🔄 Initialisation ordre simulée (mode dev)');
        return;
    }
    
    try {
        // Récupérer tous les cours publiés, organisés par niveau
        const coursesSnapshot = await firebaseDb.collection('cours')
            .where('status', '==', 'published')
            .get();
        
        const allCourses = coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ref: doc.ref,
            ...doc.data()
        }));
        
        // Grouper par niveau de difficulté
        const coursesByLevel = {};
        allCourses.forEach(course => {
            const level = course.difficulty || 1;
            if (!coursesByLevel[level]) {
                coursesByLevel[level] = [];
            }
            coursesByLevel[level].push(course);
        });
        
        const batch = firebaseDb.batch();
        let hasChanges = false;
        
        // Pour chaque niveau, assigner des ordres séquentiels
        Object.keys(coursesByLevel).forEach(level => {
            const courses = coursesByLevel[level];
            
            // Trier par ordre existant puis par date de création
            courses.sort((a, b) => {
                if (a.order && b.order && a.order !== b.order) {
                    return a.order - b.order;
                }
                const dateA = a.createdAt ? a.createdAt.seconds : 0;
                const dateB = b.createdAt ? b.createdAt.seconds : 0;
                return dateA - dateB;
            });
            
            // Assigner des ordres séquentiels (1, 2, 3, ...)
            courses.forEach((course, index) => {
                const newOrder = index + 1;
                if (!course.order || course.order !== newOrder) {
                    batch.update(course.ref, { 
                        order: newOrder,
                        updatedAt: new Date()
                    });
                    hasChanges = true;
                    console.log(`📋 Cours "${course.title}" : ordre ${newOrder} (niveau ${level})`);
                }
            });
        });
        
        if (hasChanges) {
            await batch.commit();
            console.log('✅ Ordres des cours initialisés');
            showNotification('Ordre des cours synchronisé', 'success');
        } else {
            console.log('ℹ️ Tous les cours ont déjà un ordre correct');
        }
        
    } catch (error) {
        console.error('❌ Erreur initialisation ordre:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
    }
}

// ===== ORGANISER COURS PAR NIVEAU =====
function organizeCoursesByLevel(courses) {
    // Réinitialiser
    coursesByLevel = {1: [], 2: [], 3: [], 4: [], 5: []};
    
    courses.forEach(course => {
        // Utiliser la CATÉGORIE au lieu de la difficulté
        const level = mapCategoryToLevelNumber(course.category || 'debutant');
        if (coursesByLevel[level]) {
            coursesByLevel[level].push(course);
        }
    });
}

function mapCategoryToLevelNumber(category) {
    const categoryToLevel = {
        'debutant': 1,
        'intermediaire': 2,
        'avance': 3,
        'expert': 4,
        'maitre': 5
    };
    
    const normalizedCategory = category.toLowerCase().trim();
    return categoryToLevel[normalizedCategory] || 1;
}

// ===== RENDU COURS PAR NIVEAU =====
function renderCoursesByLevel(level, allCourses = null) {
    const coursesToRender = level === 'all' ? 
        (allCourses || Object.values(coursesByLevel).flat()) : 
        coursesByLevel[level] || [];
    
    const targetGrid = level === 'all' ? 
        document.getElementById('courses-grid-all') : 
        document.getElementById(`courses-grid-${level}`);
    
    if (!targetGrid) return;
    
    // Vider la grille
    targetGrid.innerHTML = '';
    
    if (coursesToRender.length === 0) {
        targetGrid.innerHTML = `
            <div class="empty-level">
                <div class="empty-level-icon">${getLevelIcon(level)}</div>
                <h4>Aucun cours ${getLevelName(level)}</h4>
                <p>Créez votre premier cours de ce niveau</p>
                <button class="btn btn-primary" onclick="window.location.href='cours/creation.html'">
                    ➕ Créer un cours
                </button>
            </div>
        `;
        return;
    }
    
    coursesToRender.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-header">
                <div class="course-title-with-level">
                    <h4>${course.emoji || '🎓'} ${course.title}</h4>
                    <div class="course-difficulty-badge level-${mapCategoryToLevelNumber(course.category)}">
                        ${getDifficultyBadge(mapCategoryToLevelNumber(course.category))} • ${'⭐'.repeat(course.difficulty || 1)}
                    </div>
                </div>
                <div class="course-status ${course.status === 'published' ? 'active' : 'draft'}">
                    ${course.status === 'published' ? 'Actif' : 'Brouillon'}
                </div>
            </div>
            <div class="course-content">
                <p>📚 ${course.sections?.length || 0} sections • ⏱️ ${course.duration || 'Non spécifié'}</p>
                <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 0.5rem;">📝 ${course.description?.substring(0, 80) || 'Pas de description'}${course.description?.length > 80 ? '...' : ''}</p>
                <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 1rem; line-height: 1.4;">
                    <p style="margin: 0;">
                        📅 Créé le ${course.createdAt ? new Date(course.createdAt.seconds * 1000).toLocaleDateString('fr-FR') + ' à ' + new Date(course.createdAt.seconds * 1000).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}) : 'Date inconnue'}${course.updatedAt && course.updatedAt.seconds !== course.createdAt?.seconds ? ` • ✏️ modifié le ${new Date(course.updatedAt.seconds * 1000).toLocaleDateString('fr-FR') + ' à ' + new Date(course.updatedAt.seconds * 1000).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}` : ''}
                    </p>
                </div>
                <div class="course-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 100%"></div>
                    </div>
                    <span>Prêt à diffuser</span>
                </div>
            </div>
            <div class="course-actions">
                <div class="order-controls">
                    <button class="btn btn-sm btn-order" onclick="moveCourseUp('${course.id}', ${course.difficulty || 1})" title="Déplacer vers le haut">⬆️</button>
                    <button class="btn btn-sm btn-order" onclick="moveCourseDown('${course.id}', ${course.difficulty || 1})" title="Déplacer vers le bas">⬇️</button>
                </div>
                <div class="edit-controls">
                    <button class="btn btn-sm btn-secondary" onclick="editCourse('${course.id}')">✏️ Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCourse('${course.id}')">🗑️ Supprimer</button>
                </div>
            </div>
        `;
        targetGrid.appendChild(courseCard);
    });
}

// ===== UTILITAIRES NIVEAUX =====
function getLevelIcon(level) {
    const icons = {
        'all': '📚',
        1: '🌱',
        2: '⭐',
        3: '🚀',
        4: '👑',
        5: '🔥'
    };
    return icons[level] || '📚';
}

function getLevelName(level) {
    const names = {
        'all': '',
        1: 'débutant',
        2: 'intermédiaire', 
        3: 'avancé',
        4: 'expert',
        5: 'maître'
    };
    return names[level] || '';
}

function getDifficultyBadge(difficulty) {
    const badges = {
        1: '🌱 Débutant',
        2: '⭐ Intermédiaire',
        3: '🚀 Avancé',
        4: '👑 Expert',
        5: '🔥 Maître'
    };
    return badges[difficulty] || '🌱 Débutant';
}

// ===== METTRE À JOUR STATISTIQUES =====
function updateLevelStats(courses) {
    const stats = {
        1: courses.filter(c => mapCategoryToLevelNumber(c.category) === 1).length,
        2: courses.filter(c => mapCategoryToLevelNumber(c.category) === 2).length,
        3: courses.filter(c => mapCategoryToLevelNumber(c.category) === 3).length,
        4: courses.filter(c => mapCategoryToLevelNumber(c.category) === 4).length,
        5: courses.filter(c => mapCategoryToLevelNumber(c.category) === 5).length
    };
    
    // Mettre à jour les compteurs
    document.getElementById('beginner-count').textContent = stats[1];
    document.getElementById('intermediate-count').textContent = stats[2];
    document.getElementById('advanced-count').textContent = stats[3];
    document.getElementById('expert-count').textContent = stats[4];
    document.getElementById('master-count').textContent = stats[5];
    
    // Mettre à jour les totaux par section
    document.getElementById('all-courses-count').textContent = `${courses.length} cours`;
    document.getElementById('beginner-courses-total').textContent = `${stats[1]} cours`;
    document.getElementById('intermediate-courses-total').textContent = `${stats[2]} cours`;
    document.getElementById('advanced-courses-total').textContent = `${stats[3]} cours`;
    document.getElementById('expert-courses-total').textContent = `${stats[4]} cours`;
    document.getElementById('master-courses-total').textContent = `${stats[5]} cours`;
}

// ===== GESTION FILTRES NIVEAUX =====
function initLevelFilters() {
    const filterBtns = document.querySelectorAll('.level-filter-btn');
    const levelStatCards = document.querySelectorAll('.level-stat-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            console.log('Clicked level:', level); // Debug
            switchToLevel(level);
        });
    });
    
    levelStatCards.forEach(card => {
        card.addEventListener('click', () => {
            const level = card.dataset.level;
            switchToLevel(level);
        });
    });
}

function switchToLevel(level) {
    currentLevelFilter = level;
    
    // Mettre à jour les boutons
    document.querySelectorAll('.level-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === level);
    });
    
    // Mettre à jour les cartes stats
    document.querySelectorAll('.level-stat-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.level === level);
    });
    
    // Masquer toutes les sections
    document.querySelectorAll('.level-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la section correspondante  
    const targetSection = document.getElementById(`level-${level}`);
    console.log(`Trying to show section: level-${level}`); // Debug temporaire

    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Et aussi forcer le rendu des cours pour ce niveau
    if (level !== 'all') {
        renderCoursesByLevel(parseInt(level));
    } else {
        const allCourses = Object.values(coursesByLevel).flat();
        renderCoursesByLevel('all', allCourses);
    }
    
    console.log(`📊 Affichage niveau: ${level}`);
}

// ===== DONNÉES DE TEST AVEC NIVEAUX =====
function loadMockCoursesWithLevels() {
    const mockCourses = [
        {
            id: '1',
            title: 'Introduction au Bitcoin',
            emoji: '₿',
            description: 'Découvrez les bases de Bitcoin et des cryptomonnaies',
            difficulty: 1,
            sections: [{title: 'Qu\'est-ce que Bitcoin?'}],
            duration: '1h30',
            status: 'published',
            createdAt: {seconds: Date.now() / 1000}
        },
        {
            id: '2', 
            title: 'Analyse Technique Avancée',
            emoji: '📈',
            description: 'Maîtrisez l\'analyse technique des cryptomonnaies',
            difficulty: 3,
            sections: [{title: 'Chandeliers japonais'}, {title: 'Indicateurs techniques'}],
            duration: '3h45',
            status: 'published',
            createdAt: {seconds: Date.now() / 1000}
        },
        {
            id: '3',
            title: 'Trading Algorithmique',
            emoji: '🤖',
            description: 'Développez vos propres bots de trading',
            difficulty: 5,
            sections: [{title: 'Python pour le trading'}, {title: 'APIs d\'échange'}],
            duration: '6h20',
            status: 'draft',
            createdAt: {seconds: Date.now() / 1000}
        }
    ];
    
    organizeCoursesByLevel(mockCourses);
    renderCoursesByLevel('all', mockCourses);
    updateLevelStats(mockCourses);
}

function renderAdminCourses(courses) {
    const coursesGrid = document.getElementById('courses-grid');
    if (!coursesGrid) return;
    
    // Vider la grille
    coursesGrid.innerHTML = '';
    
    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-header">
                <h4>${course.title}</h4>
                <div class="course-status ${course.status === 'published' ? 'active' : 'draft'}">
                    ${course.status === 'published' ? 'Actif' : 'Brouillon'}
                </div>
            </div>
            <div class="course-content">
                <p>📚 ${course.sections?.length || 0} sections • ⏱️ ${course.duration || 'Non spécifié'} • ${'⭐'.repeat(course.difficulty || 1)}</p>
                <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 0.5rem;">📝 ${course.description?.substring(0, 80) || 'Pas de description'}${course.description?.length > 80 ? '...' : ''}</p>
                <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 1rem; line-height: 1.4;">
                    <p style="margin: 0;">
                        📅 Créé le ${course.createdAt ? new Date(course.createdAt.seconds * 1000).toLocaleDateString('fr-FR') + ' à ' + new Date(course.createdAt.seconds * 1000).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}) : 'Date inconnue'}${course.updatedAt && course.updatedAt.seconds !== course.createdAt?.seconds ? ` • ✏️ modifié le ${new Date(course.updatedAt.seconds * 1000).toLocaleDateString('fr-FR') + ' à ' + new Date(course.updatedAt.seconds * 1000).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}` : ''}
                    </p>
                </div>
                <div class="course-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 100%"></div>
                    </div>
                    <span>Prêt à diffuser</span>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn btn-sm btn-secondary" onclick="editCourse('${course.id}')">✏️ Modifier</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCourse('${course.id}')">🗑️ Supprimer</button>
            </div>
        `;
        coursesGrid.appendChild(courseCard);
    });
}

// ===== MISE À JOUR STATISTIQUES =====
function updateStats(stats) {
    const totalUsersEl = document.getElementById('total-users');
    const totalCoursesEl = document.getElementById('total-courses');
    const totalLivesEl = document.getElementById('total-lives');
    const totalRevenueEl = document.getElementById('total-revenue');
    
    if (totalUsersEl) {
        animateNumber(totalUsersEl, stats.totalUsers);
        updateStatChange('users-change', `+${stats.newUsersThisWeek || 0} cette semaine`);
    }
    
    if (totalCoursesEl) {
        animateNumber(totalCoursesEl, stats.totalCourses);
        updateStatChange('courses-change', `${stats.draftsCount || 0} en cours`);
    }
    
    if (totalLivesEl) {
        animateNumber(totalLivesEl, stats.totalLives);
        updateStatChange('lives-change', '5 programmés');
    }
    
    if (totalRevenueEl) {
        animateNumber(totalRevenueEl, stats.totalRevenue, true);
        updateStatChange('revenue-change', '+$2,340');
    }
}

// ===== ANIMATION NOMBRES =====
function animateNumber(element, targetValue, isCurrency = false) {
    const startValue = 0;
    const duration = 2000;
    const increment = targetValue / (duration / 16);
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        
        const displayValue = Math.floor(currentValue);
        element.textContent = isCurrency ? 
            `${displayValue.toLocaleString()}` : 
            displayValue.toLocaleString();
    }, 16);
}

function updateStatChange(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// ===== INITIALISATION GRAPHIQUES =====
function initCharts() {
    setTimeout(() => {
        initUsersChart();
        initRevenueChart();
    }, 1000);
}

function initUsersChart() {
    const ctx = document.getElementById('users-chart');
    if (!ctx) return;
    
    const chartCtx = ctx.getContext('2d');
    
    // Données par défaut (seront mises à jour avec les vraies données)
    charts.usersChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: ['Il y a 7j', 'Il y a 6j', 'Il y a 5j', 'Il y a 4j', 'Il y a 3j', 'Hier', 'Aujourd\'hui'],
            datasets: [
                {
                    label: 'Nouvelles inscriptions',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#ff8800',
                    backgroundColor: 'rgba(255, 136, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ff8800',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: 'Connexions',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#00ff88',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        usePointStyle: true,
                        padding: 20
                    },
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#ffffff',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 136, 0, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 136, 0, 0.2)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}



// ===== GÉNÉRER DONNÉES GRAPHIQUE UTILISATEURS =====
async function generateUserActivityChart(allUsers) {
    const today = new Date();
    const labels = [];
    const inscriptionsData = [];
    const connexionsData = [];
    
    // Générer les 7 derniers jours
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        
        // Label pour l'axe X
        if (i === 0) {
            labels.push('Aujourd\'hui');
        } else if (i === 1) {
            labels.push('Hier');
        } else {
            labels.push(`Il y a ${i}j`);
        }
        
        // Compter les inscriptions ce jour-là
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const inscriptions = allUsers.filter(user => {
            if (!user.createdAt) return false;
            const userDate = user.createdAt.toDate();
            return userDate >= dayStart && userDate <= dayEnd;
        }).length;
        
        // Compter les connexions ce jour-là
        const connexions = allUsers.filter(user => {
            if (!user.lastLogin) return false;
            const loginDate = user.lastLogin.toDate();
            return loginDate >= dayStart && loginDate <= dayEnd;
        }).length;
        
        inscriptionsData.push(inscriptions);
        connexionsData.push(connexions);
    }
    
    // Mettre à jour le graphique
    if (charts.usersChart) {
        charts.usersChart.data.labels = labels;
        charts.usersChart.data.datasets[0].data = inscriptionsData;
        charts.usersChart.data.datasets[1].data = connexionsData;
        charts.usersChart.update();
        
        console.log('📊 Graphique mis à jour:', {inscriptions: inscriptionsData, connexions: connexionsData});
    }
}




function initRevenueChart() {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;
    
    const chartCtx = ctx.getContext('2d');
    
    charts.revenueChart = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
            datasets: [{
                label: 'Revenus ($)',
                data: [12450, 15680, 18920, 22100, 19870, 24560, 28940, 31200, 27680, 33450, 35900, 37410],
                backgroundColor: 'rgba(255, 136, 0, 0.8)',
                borderColor: '#ff8800',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(255, 136, 0, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 136, 0, 0.2)'
                    }
                }
            }
        }
    });
}

// ===== GESTION UTILISATEURS =====
function loadUsersData() {
    if (typeof loadUsersTable === 'function') {
        loadUsersTable();
    } else {
        loadMockUsers();
    }
}

function loadMockUsers() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;
    
    const mockUsers = [
        {
            id: '1',
            name: 'Jean Dupont',
            email: 'jean@example.com',
            role: 'user',
            rank: 'confirmé',
            portfolio: 2450,
            joinDate: '2024-01-15',
            status: 'active'
        },
        {
            id: '2',
            name: 'Marie Martin',
            email: 'marie@example.com',
            role: 'formateur',
            rank: 'expert',
            portfolio: 8900,
            joinDate: '2023-11-20',
            status: 'active'
        },
        {
            id: '3',
            name: 'Pierre Durand',
            email: 'pierre@example.com',
            role: 'user',
            rank: 'cadet',
            portfolio: 580,
            joinDate: '2024-02-01',
            status: 'banned'
        }
    ];
    
    tableBody.innerHTML = mockUsers.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="user-avatar-sm">${getUserAvatar(user.portfolio)}</div>
                    <span>${user.name}</span>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td><span class="rank-badge ${user.rank}">${getRankDisplay(user.rank)}</span></td>
            <td>${user.portfolio.toLocaleString()}</td>
            <td>${formatDate(user.joinDate)}</td>
            <td><span class="status-badge ${user.status}">${getStatusDisplay(user.status)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn-sm edit" onclick="editUser('${user.id}')">✏️</button>
                    <button class="action-btn-sm promote" onclick="promoteUser('${user.id}')">⬆️</button>
                    <button class="action-btn-sm ban" onclick="banUser('${user.id}')">🚫</button>
                    <button class="action-btn-sm delete" onclick="deleteUser('${user.id}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
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

// ===== ACTIONS UTILISATEURS =====
function editUser(userId) {
    showModal('edit-user-modal', `Modifier l'utilisateur ${userId}`);
}

function promoteUser(userId) {
    showConfirm(
        'Promouvoir utilisateur',
        'Êtes-vous sûr de vouloir promouvoir cet utilisateur ?',
        () => {
            showNotification('Utilisateur promu avec succès', 'success');
        }
    );
}

function banUser(userId) {
    showConfirm(
        'Bannir utilisateur',
        'Êtes-vous sûr de vouloir bannir cet utilisateur ?',
        () => {
            showNotification('Utilisateur banni', 'warning');
        },
        'danger'
    );
}

function deleteUser(userId) {
    showConfirm(
        'Supprimer utilisateur',
        'Cette action est irréversible. Voulez-vous vraiment supprimer cet utilisateur ?',
        () => {
            showNotification('Utilisateur supprimé', 'error');
        },
        'danger'
    );
}

function addNewUser() {
    showModal('add-user-modal', 'Ajouter un nouvel utilisateur');
}

// ===== GESTION FORMATIONS =====
function loadFormationsData() {
    loadCoursesFromFirebaseAdmin();
}

function loadMockCourses() {
    const coursesGrid = document.getElementById('courses-grid');
    if (!coursesGrid) return;
    
    const mockCourses = [
        {
            id: '1',
            title: 'Introduction au Trading',
            videos: 8,
            duration: '2h30',
            students: 245,
            completion: 75,
            status: 'active'
        },
        {
            id: '2',
            title: 'Analyse Technique Avancée',
            videos: 12,
            duration: '4h15',
            students: 189,
            completion: 68,
            status: 'active'
        },
        {
            id: '3',
            title: 'Gestion des Risques',
            videos: 6,
            duration: '1h45',
            students: 156,
            completion: 82,
            status: 'draft'
        }
    ];
    
    coursesGrid.innerHTML = mockCourses.map(course => `
        <div class="course-card">
            <div class="course-header">
                <h4>${course.title}</h4>
                <div class="course-status ${course.status}">${course.status === 'active' ? 'Actif' : 'Brouillon'}</div>
            </div>
            <div class="course-content">
                <p>📹 ${course.videos} vidéos • ⏱️ ${course.duration} • 👥 ${course.students} inscrits</p>
                <div class="course-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${course.completion}%"></div>
                    </div>
                    <span>${course.completion}% de complétion moyenne</span>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn btn-sm btn-secondary" onclick="editCourse('${course.id}')">✏️ Modifier</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCourse('${course.id}')">🗑️ Supprimer</button>
            </div>
        </div>
    `).join('');
}

// ===== GESTION DES BROUILLONS =====
async function showDrafts() {
    try {
        let drafts = [];
        
        if (typeof firebaseDb !== 'undefined') {
            // Supprimer le orderBy qui cause l'erreur d'index
            const draftsSnapshot = await firebaseDb.collection('cours')
                .where('status', '==', 'draft')
                .get();
            
            drafts = draftsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Trier manuellement par date de mise à jour
            drafts.sort((a, b) => {
                const dateA = a.updatedAt ? a.updatedAt.seconds : 0;
                const dateB = b.updatedAt ? b.updatedAt.seconds : 0;
                return dateB - dateA;
            });
        } else {
            // Mode dev - brouillons fictifs
            drafts = [
                {
                    id: 'draft1',
                    title: 'Introduction aux NFTs',
                    description: 'Cours en cours de rédaction...',
                    category: 'debutant',
                    updatedAt: new Date(),
                    sections: [{title: 'Qu\'est-ce qu\'un NFT?'}]
                }
            ];
        }
        
        showDraftsModal(drafts);
        
    } catch (error) {
        console.error('Erreur chargement brouillons:', error);
        showNotification('Erreur lors du chargement des brouillons', 'error');
    }
}

function showDraftsModal(drafts) {
    const draftsContent = drafts.length > 0 ? `
        <div class="drafts-list">
            ${drafts.map(draft => `
                <div class="draft-item">
                    <div class="draft-info">
                        <h4>${draft.title}</h4>
                        <p>${draft.description?.substring(0, 100) || 'Pas de description'}...</p>
                        <small>Modifié le ${draft.updatedAt ? new Date(draft.updatedAt.seconds * 1000).toLocaleDateString('fr-FR') : 'Date inconnue'}</small>
                    </div>
                    <div class="draft-actions">
                        <button class="btn btn-sm btn-primary" onclick="editDraft('${draft.id}')">✏️ Continuer</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDraft('${draft.id}')">🗑️ Supprimer</button>
                    </div>
                </div>
            `).join('')}
        </div>
    ` : `
        <div class="no-drafts">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
            <p>Aucun brouillon trouvé</p>
            <button class="btn btn-primary" onclick="window.location.href='cours/creation.html'; closeModal();">Créer un nouveau cours</button>
        </div>
    `;
    
    showModal('drafts-modal', '📝 Mes Brouillons', draftsContent);
}

function editDraft(draftId) {
    window.location.href = `cours/creation.html?edit=${draftId}`;
}

async function deleteDraft(draftId) {
    showCustomConfirm(
        '🗑️ Supprimer le brouillon',
        'Êtes-vous sûr de vouloir supprimer ce brouillon ?',
        'Cette action est irréversible.',
        async () => {
            try {
                if (typeof firebaseDb !== 'undefined') {
                    await firebaseDb.collection('cours').doc(draftId).delete();
                    showNotification('Brouillon supprimé', 'success');
                    closeModal();
                    setTimeout(() => showDrafts(), 500);
                } else {
                    showNotification('Brouillon supprimé (mode dev)', 'success');
                    closeModal();
                }
            } catch (error) {
                console.error('Erreur suppression brouillon:', error);
                showNotification('Erreur lors de la suppression', 'error');
            }
        }
    );
}

// Exposer les fonctions
window.showDrafts = showDrafts;
window.editDraft = editDraft;
window.deleteDraft = deleteDraft;

// ===== ACTIONS FORMATIONS =====
function addNewCourse() {
    showModal('add-course-modal', 'Ajouter un nouveau cours');
}

function editCourse(courseId) {
    // Rediriger vers la page d'édition avec l'ID du cours
    window.location.href = `cours/creation.html?edit=${courseId}`;
}

function deleteCourse(courseId) {
    showCustomConfirm(
        '🗑️ Supprimer le cours',
        'Êtes-vous sûr de vouloir supprimer ce cours ?',
        'Cette action est irréversible et supprimera définitivement le cours.',
        async () => {
            try {
                if (typeof firebaseDb !== 'undefined') {
                    await firebaseDb.collection('cours').doc(courseId).delete();
                    showNotification('🗑️ Cours supprimé avec succès', 'success');
                    
                    // Recharger la liste des cours
                    setTimeout(() => {
                        loadCoursesFromFirebaseAdmin();
                    }, 1000);
                } else {
                    // Mode développement
                    showNotification('🗑️ Cours supprimé (mode dev)', 'success');
                }
            } catch (error) {
                console.error('❌ Erreur suppression cours:', error);
                showNotification('❌ Erreur lors de la suppression', 'error');
            }
        }
    );
}

// ===== RÉORGANISATION DES COURS =====
async function moveCourseUp(courseId, difficulty) {
    try {
        await reorderCourse(courseId, difficulty, 'up');
        showNotification('Cours déplacé vers le haut', 'success');
        setTimeout(() => refreshCoursesAfterEdit(), 500);
    } catch (error) {
        console.error('Erreur déplacement haut:', error);
        showNotification('Erreur lors du déplacement', 'error');
    }
}

async function moveCourseDown(courseId, difficulty) {
    try {
        await reorderCourse(courseId, difficulty, 'down');
        showNotification('Cours déplacé vers le bas', 'success');
        setTimeout(() => refreshCoursesAfterEdit(), 500);
    } catch (error) {
        console.error('Erreur déplacement bas:', error);
        showNotification('Erreur lors du déplacement', 'error');
    }
}

async function reorderCourse(courseId, difficulty, direction) {
    if (typeof firebaseDb === 'undefined') {
        console.log('🔄 Réorganisation simulée (mode dev)');
        return;
    }
    
    try {
        // 1. Récupérer tous les cours du même niveau SANS orderBy
        console.log(`🔄 Réorganisation cours ${courseId} (niveau ${difficulty}) vers ${direction}`);
        
        const levelCoursesSnapshot = await firebaseDb.collection('cours')
            .where('difficulty', '==', difficulty)
            .where('status', '==', 'published')
            .get();
        
        // 2. Trier manuellement par ordre
        const coursesArray = levelCoursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ref: doc.ref,
            order: doc.data().order || 0,
            title: doc.data().title || 'Sans titre',
            ...doc.data()
        }));
        
        // Trier par ordre croissant
        coursesArray.sort((a, b) => {
            const orderA = a.order || 0;
            const orderB = b.order || 0;
            return orderA - orderB;
        });
        
        console.log(`📋 ${coursesArray.length} cours trouvés pour le niveau ${difficulty}`);
        
        // 3. Trouver l'index du cours à déplacer
        const currentIndex = coursesArray.findIndex(c => c.id === courseId);
        
        if (currentIndex === -1) {
            throw new Error('Cours non trouvé dans la liste');
        }
        
        let targetIndex = -1;
        
        if (direction === 'up' && currentIndex > 0) {
            targetIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < coursesArray.length - 1) {
            targetIndex = currentIndex + 1;
        } else {
            // Pas de déplacement possible
            const message = direction === 'up' ? 
                'Le cours est déjà en première position' : 
                'Le cours est déjà en dernière position';
            showNotification(message, 'info');
            return;
        }
        
        console.log(`📋 Déplacement: index ${currentIndex} → ${targetIndex}`);
        
        // 4. Échanger les ordres
        const batch = firebaseDb.batch();
        
        const courseToMove = coursesArray[currentIndex];
        const courseToReplace = coursesArray[targetIndex];
        
        // Échanger les ordres
        const tempOrder = courseToMove.order;
        
        batch.update(courseToMove.ref, { 
            order: courseToReplace.order,
            updatedAt: new Date()
        });
        
        batch.update(courseToReplace.ref, { 
            order: tempOrder,
            updatedAt: new Date()
        });
        
        await batch.commit();
        
        console.log(`✅ Cours "${courseToMove.title}" déplacé ${direction === 'up' ? 'vers le haut' : 'vers le bas'}`);
        
    } catch (error) {
        console.error('❌ Erreur réorganisation:', error);
        throw error;
    }
}

// ===== INITIALISATION ORDRE POUR COURS EXISTANTS =====
async function initializeCourseOrder() {
    if (typeof firebaseDb === 'undefined') {
        console.log('🔄 Initialisation ordre simulée (mode dev)');
        return;
    }
    
    try {
        // Récupérer tous les cours publiés, triés par date de création
        const coursesSnapshot = await firebaseDb.collection('cours')
            .where('status', '==', 'published')
            .orderBy('createdAt', 'desc')
            .get();
        
        const batch = firebaseDb.batch();
        let hasChanges = false;
        
        // Organiser par niveau de difficulté
        const coursesByDifficulty = {};
        
        coursesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const difficulty = data.difficulty || 1;
            
            if (!coursesByDifficulty[difficulty]) {
                coursesByDifficulty[difficulty] = [];
            }
            
            coursesByDifficulty[difficulty].push({
                id: doc.id,
                data: data,
                ref: doc.ref
            });
        });
        
        // Assigner un ordre à chaque niveau
        Object.keys(coursesByDifficulty).forEach(difficulty => {
            const courses = coursesByDifficulty[difficulty];
            
            courses.forEach((course, index) => {
                // Si le cours n'a pas d'ordre ou si l'ordre est 0
                if (!course.data.order || course.data.order === 0) {
                    batch.update(course.ref, { 
                        order: index + 1,
                        updatedAt: new Date()
                    });
                    hasChanges = true;
                }
            });
        });
        
        if (hasChanges) {
            await batch.commit();
            console.log('✅ Ordre des cours initialisé');
            showNotification('Ordre des cours initialisé', 'success');
        } else {
            console.log('ℹ️ Tous les cours ont déjà un ordre');
        }
        
    } catch (error) {
        console.error('❌ Erreur initialisation ordre:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
    }
}

// ===== RAFRAÎCHISSEMENT APRÈS MODIFICATION =====
async function refreshCoursesAfterEdit() {
    try {
        console.log('🔄 Rafraîchissement des cours après modification...');
        
        // Recharger tous les cours depuis Firebase
        await loadCoursesFromFirebaseAdmin();
        
        console.log('✅ Cours rafraîchis avec succès');
        
    } catch (error) {
        console.error('❌ Erreur rafraîchissement cours:', error);
    }
}

function checkForRefreshSignal() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('refresh') === 'true') {
        console.log('🔄 Signal de rafraîchissement détecté');
        
        // Aller à la section formations
        showSection('formations');
        
        // Rafraîchir après un court délai
        setTimeout(() => {
            refreshCoursesAfterEdit();
        }, 1000);
        
        // Nettoyer l'URL
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
    }
}

function importCourses() {
    showNotification('Fonctionnalité en développement', 'info');
}

function exportCourses() {
    showNotification('Export en cours...', 'info');
}

// ===== GESTION LIVES =====
function loadLivesData() {
    updateLiveStatus();
    loadLivesCalendar();
    loadLivesHistory();
}

function updateLiveStatus() {
    const liveIndicator = document.getElementById('live-indicator');
    const liveStatusText = document.getElementById('live-status-text');
    const liveViewers = document.getElementById('live-viewers');
    
    if (liveIndicator) liveIndicator.className = 'live-indicator offline';
    if (liveStatusText) liveStatusText.textContent = 'Aucun live en cours';
    if (liveViewers) liveViewers.textContent = '0 spectateurs connectés';
}

function scheduleLive() {
    showModal('schedule-live-modal', 'Programmer un nouveau live');
}

function startLive() {
    showConfirm(
        'Démarrer Live',
        'Voulez-vous démarrer la session live maintenant ?',
        () => {
            const liveIndicator = document.getElementById('live-indicator');
            const liveStatusText = document.getElementById('live-status-text');
            const startBtn = document.getElementById('start-live-btn');
            const stopBtn = document.getElementById('stop-live-btn');
            
            if (liveIndicator) liveIndicator.className = 'live-indicator online';
            if (liveStatusText) liveStatusText.textContent = '🔴 Live en cours - Analyse Technique';
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
            
            showNotification('Live démarré avec succès', 'success');
        }
    );
}

function stopLive() {
    showConfirm(
        'Arrêter Live',
        'Voulez-vous arrêter la session live ?',
        () => {
            const liveIndicator = document.getElementById('live-indicator');
            const liveStatusText = document.getElementById('live-status-text');
            const startBtn = document.getElementById('start-live-btn');
            const stopBtn = document.getElementById('stop-live-btn');
            
            if (liveIndicator) liveIndicator.className = 'live-indicator offline';
            if (liveStatusText) liveStatusText.textContent = 'Aucun live en cours';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
            
            showNotification('Live arrêté', 'info');
        }
    );
}

function loadLivesCalendar() {
    const calendar = document.getElementById('lives-calendar');
    if (!calendar) return;
    
    // Code pour générer le calendrier de la semaine
    calendar.innerHTML = '<p style="color: rgba(255,255,255,0.7);">Calendrier en cours de développement</p>';
}

function loadLivesHistory() {
    const historyBody = document.getElementById('lives-history-body');
    if (!historyBody) return;
    
    const mockHistory = [
        {
            date: '2025-01-20',
            title: 'Analyse Technique Avancée',
            duration: '1h45',
            viewers: 156,
            recording: true
        },
        {
            date: '2025-01-18',
            title: 'Trading Psychology',
            duration: '2h10',
            viewers: 203,
            recording: true
        }
    ];
    
    historyBody.innerHTML = mockHistory.map(live => `
        <tr>
            <td>${formatDate(live.date)}</td>
            <td>${live.title}</td>
            <td>${live.duration}</td>
            <td>${live.viewers}</td>
            <td>${live.recording ? '✅ Disponible' : '❌ Non disponible'}</td>
            <td>
                <button class="action-btn-sm edit">📹 Voir</button>
                <button class="action-btn-sm delete">🗑️ Suppr.</button>
            </td>
        </tr>
    `).join('');
}

// ===== GESTION FINANCES =====
function loadFinancesData() {
    loadMockTransactions();
}

function loadMockTransactions() {
    const transactionsBody = document.getElementById('transactions-body');
    if (!transactionsBody) return;
    
    const mockTransactions = [
        {
            date: '2025-01-21',
            user: 'jean@example.com',
            type: 'Abonnement',
            amount: 29.99,
            status: 'completed'
        },
        {
            date: '2025-01-21',
            user: 'marie@example.com',
            type: 'Formation',
            amount: 49.99,
            status: 'completed'
        },
        {
            date: '2025-01-20',
            user: 'pierre@example.com',
            type: 'Remboursement',
            amount: -29.99,
            status: 'refunded'
        }
    ];
    
    transactionsBody.innerHTML = mockTransactions.map(transaction => `
        <tr>
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.user}</td>
            <td>${transaction.type}</td>
            <td class="${transaction.amount >= 0 ? 'positive' : 'negative'}">
                ${transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount)}
            </td>
            <td><span class="status-badge ${transaction.status}">${getTransactionStatus(transaction.status)}</span></td>
            <td>
                <button class="action-btn-sm edit">👁️ Voir</button>
            </td>
        </tr>
    `).join('');
}

function getTransactionStatus(status) {
    const statuses = {
        'completed': 'Complété',
        'pending': 'En attente',
        'refunded': 'Remboursé',
        'failed': 'Échoué'
    };
    return statuses[status] || status;
}

// ===== PARAMÈTRES SYSTÈME =====
function loadSettingsData() {
    // Charger les paramètres actuels
    console.log('Chargement paramètres système');
}

function createBackup() {
    showNotification('Création de sauvegarde en cours...', 'info');
    setTimeout(() => {
        showNotification('Sauvegarde créée avec succès', 'success');
    }, 2000);
}

function viewBackups() {
    showNotification('Fonctionnalité en développement', 'info');
}

function cleanDatabase() {
    showConfirm(
        'Nettoyer la base de données',
        'Cette action va supprimer les données obsolètes. Continuer ?',
        () => {
            showNotification('Base de données nettoyée', 'success');
        },
        'warning'
    );
}

// ===== ACTIONS RAPIDES =====
function sendGlobalNotification() {
    showModal('global-notification-modal', 'Envoyer une notification globale');
}

// ===== DONNÉES OVERVIEW =====
async function loadOverviewData() {
    // Rafraîchir les graphiques
    if (charts.usersChart) {
        charts.usersChart.update();
    }
    if (charts.revenueChart) {
        charts.revenueChart.update();
    }
    
    // Charger les alertes admin
    await loadAdminAlerts();
}

// ===== RAFRAÎCHISSEMENT DONNÉES =====
function refreshDashboardData() {
    if (currentSection === 'overview') {
        loadOverviewData();
    }
    console.log('🔄 Données dashboard rafraîchies');
}

// ===== SYSTÈME DE NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const container = getOrCreateToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="closeToast(this)">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Afficher le toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

function getOrCreateToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function closeToast(button) {
    const toast = button.closest('.toast');
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// ===== SYSTÈME DE MODALES CORRIGÉ =====
function showModal(modalId, title, content = '') {
    // Supprimer toute modale existante
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Créer la nouvelle modale
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
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
    modal.className = 'modal-content';
    modal.style.cssText = `
        background: linear-gradient(135deg, rgba(255, 136, 0, 0.1), rgba(255, 107, 53, 0.1));
        border: 2px solid rgba(255, 136, 0, 0.3);
        border-radius: 20px;
        padding: 0;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        transform: translateY(30px) scale(0.9);
        transition: all 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div class="modal-header" style="
            background: rgba(255, 136, 0, 0.15);
            padding: 1.5rem;
            border-bottom: 1px solid rgba(255, 136, 0, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <h3 style="margin: 0; color: #ff8800; font-size: 1.3rem;">${title}</h3>
            <button class="modal-close-btn" style="
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.2rem;
                border-radius: 4px;
                transition: all 0.3s ease;
            ">&times;</button>
        </div>
        <div class="modal-body" style="
            padding: 2rem;
            max-height: 50vh;
            overflow-y: auto;
            color: #ffffff;
        ">
            ${content || '<p>Contenu de la modale...</p>'}
        </div>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Afficher avec animation
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        modal.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    // Événements de fermeture
    const closeBtn = modal.querySelector('.modal-close-btn');
    closeBtn.addEventListener('click', closeModal);
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    // Fonction de fermeture
    function closeModal() {
        modalOverlay.style.opacity = '0';
        modal.style.transform = 'translateY(30px) scale(0.9)';
        
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 300);
    }
    
    // Exposer la fonction de fermeture
    window.currentCloseModal = closeModal;
}

// Fonction globale de fermeture
function closeModal() {
    if (window.currentCloseModal) {
        window.currentCloseModal();
    }
}

window.closeModal = closeModal;

// ===== SYSTÈME DE CONFIRMATION =====
function showConfirm(title, message, onConfirm, type = 'warning') {
    const icons = {
        warning: '⚠️',
        danger: '🚨',
        info: 'ℹ️'
    };
    
    const content = `
        <div class="confirm-dialog">
            <div class="confirm-icon ${type}">${icons[type]}</div>
            <div class="confirm-title">${title}</div>
            <div class="confirm-message">${message}</div>
        </div>
    `;
    
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer confirm-actions">
                <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
                <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-warning'}" onclick="confirmAction()">Confirmer</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 50);
    
    // Stocker la fonction de confirmation
    window.currentConfirmAction = onConfirm;
}

function showCustomConfirm(title, message, subtitle, onConfirm) {
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';
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
        animation: fadeIn 0.3s ease;
    `;
    
    // Créer la modal
    const modal = document.createElement('div');
    modal.className = 'custom-confirm-modal';
    modal.style.cssText = `
        background: linear-gradient(135deg, rgba(255, 136, 0, 0.1), rgba(255, 107, 53, 0.1));
        border: 2px solid rgba(255, 136, 0, 0.3);
        border-radius: 20px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        text-align: center;
        animation: slideUp 0.3s ease;
        box-shadow: 0 20px 40px rgba(255, 136, 0, 0.2);
    `;
    
    modal.innerHTML = `
        <div class="confirm-icon" style="font-size: 3rem; margin-bottom: 1rem;">${title.includes('🗑️') ? '🗑️' : '❓'}</div>
        <h3 style="color: #ff8800; margin-bottom: 1rem; font-size: 1.5rem;">${title}</h3>
        <p style="color: rgba(255, 255, 255, 0.9); margin-bottom: 0.5rem; font-size: 1.1rem;">${message}</p>
        <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 2rem; font-size: 0.9rem;">${subtitle}</p>
        <div class="confirm-buttons" style="display: flex; gap: 1rem; justify-content: center;">
            <button class="btn-cancel" style="
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 0.8rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            ">❌ Annuler</button>
            <button class="btn-confirm" style="
                background: linear-gradient(45deg, #ff4757, #ff3742);
                color: #ffffff;
                border: none;
                padding: 0.8rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            ">🗑️ Supprimer</button>
        </div>
    `;
    
    // Ajouter les styles d'animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.2) !important;
            transform: translateY(-2px);
        }
        .btn-confirm:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Événements
    modal.querySelector('.btn-cancel').onclick = () => {
        overlay.remove();
        style.remove();
    };
    
    modal.querySelector('.btn-confirm').onclick = () => {
        overlay.remove();
        style.remove();
        onConfirm();
    };
    
    // Fermer en cliquant à l'extérieur
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            style.remove();
        }
    };
}


function confirmAction() {
    if (window.currentConfirmAction) {
        window.currentConfirmAction();
        window.currentConfirmAction = null;
    }
    closeModal();
}

// ===== GESTION DÉCONNEXION =====
function handleLogout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            window.location.href = '../../index.html';
        });
    } else {
        window.location.href = '../../index.html';
    }
}



// ===== CHARGEMENT CONFIG SYSTÈME =====
async function loadSystemConfig() {
    try {
        const configDoc = await window.firebaseDb.collection('system_config').doc('platform_settings').get();
        
        if (configDoc.exists) {
            const config = configDoc.data();
            console.log('📊 Config système chargée:', config);
            
            // Mettre à jour les champs
            const platformName = document.getElementById('platform-name');
            const contactEmail = document.getElementById('contact-email');
            
            if (platformName && config.platformName) {
                platformName.value = config.platformName;
            }
            
            if (contactEmail && config.contactEmail) {
                contactEmail.value = config.contactEmail;
            }
            
            // Mettre à jour les toggles
            const registrationsOpen = document.getElementById('registrations-open');
            if (registrationsOpen && typeof config.registrationsOpen === 'boolean') {
                registrationsOpen.checked = config.registrationsOpen;
            }
            
        } else {
            console.log('⚠️ Document config non trouvé');
        }
    } catch (error) {
        console.error('❌ Erreur chargement config:', error);
    }
}

// Charger la config quand on va dans les paramètres
function loadSettingsData() {
    loadSystemConfig();
    console.log('Chargement paramètres système');
}


// ===== CHARGEMENT ALERTES ADMIN =====
async function loadAdminAlerts() {
    const alertsContainer = document.getElementById('admin-alerts');
    if (!alertsContainer) return;
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            // Charger les 5 dernières alertes non résolues
            const alertsSnapshot = await firebaseDb.collection('admin_alerts')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
            
            const alerts = alertsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderAdminAlerts(alerts);
        } else {
            // Mode dev - alertes fictives
            const mockAlerts = [
                {
                    id: '1',
                    type: 'suspicious_trade',
                    priority: 'high',
                    title: 'Trade suspect: 180% de profit',
                    message: 'Jean Dupont a réalisé un profit de 180% sur BTC',
                    createdAt: new Date(),
                    details: {
                        userName: 'Jean Dupont',
                        token: 'BTC',
                        profitPercent: 180
                    }
                }
            ];
            renderAdminAlerts(mockAlerts);
        }
    } catch (error) {
        console.error('❌ Erreur chargement alertes:', error);
        alertsContainer.innerHTML = '<div class="alert-item error">❌ Erreur chargement alertes</div>';
    }
}

function renderAdminAlerts(alerts) {
    const alertsContainer = document.getElementById('admin-alerts');
    
    if (alerts.length === 0) {
        alertsContainer.innerHTML = `
            <div class="alert-item info">
                <span class="alert-icon">✅</span>
                <div class="alert-content">
                    <p>Aucune alerte en attente</p>
                    <small>Tout semble normal</small>
                </div>
            </div>
        `;
        return;
    }
    
    alertsContainer.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.priority === 'high' ? 'danger' : 'warning'}" onclick="showAlertDetails('${alert.id}')">
            <span class="alert-icon">${getAlertIcon(alert.type, alert.priority)}</span>
            <div class="alert-content">
                <p>${alert.title}</p>
                <small>${alert.message} • ${formatAlertTime(alert.createdAt)}</small>
            </div>
            <div class="alert-actions">
                <button class="alert-action-btn details" onclick="event.stopPropagation(); showAlertDetails('${alert.id}')" title="Voir détails et décider">👁️</button>
            </div>
        </div>
    `).join('');
}

function getAlertIcon(type, priority) {
    if (type === 'suspicious_trade') {
        return priority === 'high' ? '🚨' : '⚠️';
    }
    return '📢';
}

function formatAlertTime(timestamp) {
    if (!timestamp) return 'Maintenant';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Maintenant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;
    return `Il y a ${Math.floor(diffMins / 1440)}j`;
}

// ===== ACTIONS ALERTES =====
async function showAlertDetails(alertId) {
    try {
        // Récupérer les détails de l'alerte depuis Firebase
        const alertDoc = await firebaseDb.collection('admin_alerts').doc(alertId).get();
        
        if (!alertDoc.exists) {
            showNotification('Alerte introuvable', 'error');
            return;
        }
        
        const alertData = alertDoc.data();
        const details = alertData.details;
        
        const content = `
            <div class="alert-details">
                <div class="alert-summary">
                    <h4 style="color: #ff8800; margin-bottom: 1rem;">${alertData.title}</h4>
                    <p style="margin-bottom: 1.5rem;">${alertData.message}</p>
                </div>
                
                <div class="trade-details-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div class="detail-item">
                        <strong>Utilisateur:</strong><br>
                        ${details.userName} (${details.userEmail})
                    </div>
                    <div class="detail-item">
                        <strong>Token:</strong><br>
                        ${details.token}
                    </div>
                    <div class="detail-item">
                        <strong>Performance:</strong><br>
                        <span style="color: #ff4757; font-weight: bold;">+${details.profitPercent.toFixed(1)}%</span>
                    </div>
                    <div class="detail-item">
                        <strong>P&L:</strong><br>
                        +$${details.profitAmount.toFixed(2)}
                    </div>
                    <div class="detail-item">
                        <strong>Montant tradé:</strong><br>
                        $${details.tradeAmount.toFixed(2)}
                    </div>
                    <div class="detail-item">
                        <strong>Levier:</strong><br>
                        ${details.leverage}
                    </div>
                </div>
                
                <div class="alert-detail-actions" style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-success" onclick="validateSuspiciousTrade('${alertId}'); closeModal();">
                        ✅ Valider le Trade
                    </button>
                    <button class="btn btn-danger" onclick="rejectSuspiciousTrade('${alertId}'); closeModal();">
                        ❌ Rejeter le Trade
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal();">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        
        showModal('alert-details-modal', '🚨 Détails de l\'alerte', content);
        
    } catch (error) {
        console.error('❌ Erreur chargement détails alerte:', error);
        showNotification('Erreur lors du chargement des détails', 'error');
    }
}

async function resolveAlert(alertId) {
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('admin_alerts').doc(alertId).update({
                status: 'resolved',
                resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolvedBy: currentAdmin?.id || 'admin'
            });
            
            showNotification('Alerte marquée comme résolue', 'success');
            setTimeout(() => loadAdminAlerts(), 1000);
        } else {
            showNotification('Alerte résolue (mode dev)', 'success');
        }
    } catch (error) {
        console.error('❌ Erreur résolution alerte:', error);
        showNotification('Erreur lors de la résolution', 'error');
    }
}

// ===== VALIDATION/REJET TRADES SUSPECTS =====
async function validateSuspiciousTrade(alertId) {
   try {
       const alertDoc = await firebaseDb.collection('admin_alerts').doc(alertId).get();
       if (!alertDoc.exists) {
           showNotification('Alerte introuvable', 'error');
           return;
       }
       
       const alertData = alertDoc.data();
       const tradeDetails = alertData.details;
       
       // 1. Marquer l'alerte comme validée
       await firebaseDb.collection('admin_alerts').doc(alertId).update({
           status: 'validated',
           resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
           resolvedBy: currentAdmin?.id || 'admin'
       });
       
       // 2. Attribuer les points directement via Firebase
       try {
           let pointsToAward = 50;
           
           if (tradeDetails.profitPercent >= 100) {
               pointsToAward = 200;
           } else if (tradeDetails.profitPercent >= 50) {
               pointsToAward = 150;
           } else if (tradeDetails.profitPercent >= 20) {
               pointsToAward = 100;
           }
           
           pointsToAward = Math.floor(pointsToAward * 1.5);
           
           await firebaseDb.collection('users').doc(tradeDetails.userId).update({
               points: firebase.firestore.FieldValue.increment(pointsToAward),
               lastPointsUpdate: firebase.firestore.FieldValue.serverTimestamp(),
               [`stats.tradesValidated`]: firebase.firestore.FieldValue.increment(1)
           });
           
           showNotification(`✅ Trade validé ! ${pointsToAward} points attribués à ${tradeDetails.userName}`, 'success');
           
       } catch (pointsError) {
           console.error('❌ Erreur attribution points:', pointsError);
           showNotification(`✅ Trade validé mais erreur attribution points: ${pointsError.message}`, 'warning');
       }
       
       // 3. Fermer la modal ET recharger les alertes
       closeModal();
       setTimeout(() => loadAdminAlerts(), 500);
       
   } catch (error) {
       console.error('❌ Erreur validation trade:', error);
       showNotification(`Erreur lors de la validation: ${error.message}`, 'error');
   }
}

async function rejectSuspiciousTrade(alertId) {
   try {
       // Marquer comme rejeté
       await firebaseDb.collection('admin_alerts').doc(alertId).update({
           status: 'rejected',
           resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
           resolvedBy: currentAdmin?.id || 'admin'
       });
       
       showNotification('❌ Trade rejeté - Aucun point attribué', 'warning');
       
       // Fermer la modal ET recharger les alertes
       closeModal();
       setTimeout(() => loadAdminAlerts(), 500);
       
   } catch (error) {
       console.error('❌ Erreur rejet trade:', error);
       showNotification('Erreur lors du rejet', 'error');
   }
}

async function rejectSuspiciousTrade(alertId) {
    try {
        // Marquer comme rejeté
        await firebaseDb.collection('admin_alerts').doc(alertId).update({
            status: 'rejected',
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            resolvedBy: currentAdmin?.id || 'admin'
        });
        
        showNotification('❌ Trade rejeté - Aucun point attribué', 'warning');
        
        // Recharger les alertes
        setTimeout(() => loadAdminAlerts(), 1000);
        
    } catch (error) {
        console.error('❌ Erreur rejet trade:', error);
        showNotification('Erreur lors du rejet', 'error');
    }
}

// Exposer les fonctions
window.validateSuspiciousTrade = validateSuspiciousTrade;
window.rejectSuspiciousTrade = rejectSuspiciousTrade;

// Exposer les fonctions
window.showAlertDetails = showAlertDetails;
window.resolveAlert = resolveAlert;
window.loadAdminAlerts = loadAdminAlerts;




// ===== EXPOSITION GLOBALE =====
window.currentAdmin = currentAdmin;
window.showSection = showSection;
window.showNotification = showNotification;
window.showModal = showModal;
window.closeModal = closeModal;
window.showConfirm = showConfirm;
window.confirmAction = confirmAction;
window.handleLogout = handleLogout;

// Fonctions actions utilisateurs
window.editUser = editUser;
window.promoteUser = promoteUser;
window.banUser = banUser;
window.deleteUser = deleteUser;
window.addNewUser = addNewUser;

// Fonctions actions formations
window.addNewCourse = addNewCourse;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.importCourses = importCourses;
window.exportCourses = exportCourses;

// Fonctions actions lives
window.scheduleLive = scheduleLive;
window.startLive = startLive;
window.stopLive = stopLive;

// Fonctions paramètres
window.createBackup = createBackup;
window.viewBackups = viewBackups;
window.cleanDatabase = cleanDatabase;
window.sendGlobalNotification = sendGlobalNotification;

// Nouvelles fonctions niveaux
window.switchToLevel = switchToLevel;
window.initLevelFilters = initLevelFilters;

// ===== ÉVÉNEMENTS =====
document.addEventListener('DOMContentLoaded', checkAdminAuthentication);

document.addEventListener('click', (e) => {
    if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
        e.preventDefault();
        handleLogout();
    }
    
    // Fermer les modales en cliquant à l'extérieur
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Gestion des touches
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

console.log('✅ Admin Dashboard COMPLET chargé');