// ===== FORMATIONS.JS - MODULE FORMATIONS COMPLET =====

window.FormationsData = window.FormationsData || {};
console.log('🎓 Initialisation module Formations');


// ===== VÉRIFICATION AUTHENTIFICATION =====
function checkFormationsAuth() {
    // Vérifier si l'utilisateur est connecté
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Utilisateur connecté - continuer l'initialisation
                return;
            } else {
                // Rediriger vers la page d'accueil si non connecté
                window.location.href = '../../index.html';
            }
        });
    }
}



// ===== DONNÉES DES FORMATIONS =====
const FormationsData = {
    userProgress: {
        completed: 7,
        total: 15,
        certificates: 3,
        overallProgress: 47
    },
    
    formations: {
        bases: {
            title: 'Bases du Trading',
            status: 'completed',
            progress: 100,
            level: 'beginner',
            duration: '2h 30min',
            modules: 6,
            currentModule: 6
        },
        analyse: {
            title: 'Analyse Technique',
            status: 'in-progress',
            progress: 65,
            level: 'intermediate',
            duration: '4h 15min',
            modules: 6,
            currentModule: 4
        },
        risque: {
            title: 'Gestion du Risque',
            status: 'available',
            progress: 0,
            level: 'beginner',
            duration: '3h 00min',
            modules: 5,
            currentModule: 0
        },
        automatise: {
            title: 'Trading Automatisé',
            status: 'locked',
            progress: 0,
            level: 'advanced',
            duration: '6h 45min',
            modules: 8,
            currentModule: 0,
            requirement: 'Niveau 🌟 Trader Confirmé'
        },
        psychologie: {
            title: 'Psychologie du Trading',
            status: 'available',
            progress: 0,
            level: 'intermediate',
            duration: '2h 45min',
            modules: 4,
            currentModule: 0
        },
        fondamentale: {
            title: 'Analyse Fondamentale',
            status: 'completed',
            progress: 100,
            level: 'beginner',
            duration: '3h 30min',
            modules: 5,
            currentModule: 5
        }
    }
};

// ===== INITIALISATION =====
function initFormations() {
    // Éviter la double initialisation
    if (window.formationsModuleInitialized) {
        console.log('🎓 Module formations déjà initialisé');
        return;
    }
    
    console.log('🎓 Initialisation module formations');
    window.formationsModuleInitialized = true;
    
    // Charger les données utilisateur
    loadUserFormations();
    
    // Attendre le chargement des cours Firebase
    setTimeout(() => {
        console.log('🎯 Démarrage affichage formations');
        loadCoursesFromFirebase(); // Charger depuis Firebase
        displayFormations();
    }, 500);
    
    // Initialiser les événements
    initFormationEvents();
    
    // Initialiser les filtres
    initFormationFilters();

    // Appliquer le filtre débutant par défaut
    setTimeout(() => {
        applyFilter('beginner');
    }, 1000);
    
    console.log('✅ Module formations initialisé');
}




// ===== CHARGEMENT DES DONNÉES =====
async function loadUserFormations() {
    if (!window.currentUser || !window.currentUser.id) return;
    
    try {
        // Charger les cours depuis Firebase
        await loadCoursesFromFirebase();
        
        if (typeof firebaseDb !== 'undefined') {
            const userDoc = await firebaseDb.collection('users').doc(window.currentUser.id).get();
            
            if (userDoc.exists && userDoc.data().formations) {
                // Fusionner avec les données Firebase
                const firebaseData = userDoc.data().formations;
                FormationsData.userProgress = { ...FormationsData.userProgress, ...firebaseData.progress };
                
                console.log('📚 Formations utilisateur chargées depuis Firebase');
            }
        }
    } catch (error) {
        console.log('⚠️ Erreur chargement formations:', error);
    }
}

// ===== CHARGEMENT COURS DEPUIS FIREBASE =====
async function loadCoursesFromFirebase() {
    try {
        if (typeof firebaseDb !== 'undefined') {
            let coursesSnapshot = await firebaseDb.collection('cours')
                .where('status', '==', 'published')
                .get();
            
            // Trier par niveau de difficulté puis par ordre
            const levelOrder = ['debutant', 'intermediaire', 'avance', 'expert', 'maitre'];
            const firebaseCourses = coursesSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    const levelA = levelOrder.indexOf(a.category?.toLowerCase() || 'debutant');
                    const levelB = levelOrder.indexOf(b.category?.toLowerCase() || 'debutant');

                    // D'abord trier par niveau
                    if (levelA !== levelB) {
                        return levelA - levelB;
                    }

                    // Puis par ordre dans le même niveau
                    return (a.order || 0) - (b.order || 0);
                });
            
            // Vider TOUS les cours mockés d'abord
            FormationsData.formations = {};
            
            // Charger la progression utilisateur
            const userProgress = await getUserCourseProgress();
                    
            // Convertir en format compatible avec l'interface
            firebaseCourses.forEach((course, index) => {
                const courseProgress = userProgress[course.id] || {};
                
                FormationsData.formations[course.id] = {
                    title: course.title,
                    status: determineCourseStatus(index, courseProgress, userProgress),
                    progress: courseProgress.progress || 0,
                    level: mapCategoryToLevel(course.category),
                    duration: course.duration || 'Non spécifié',
                    modules: course.sections?.length || 1,
                    currentModule: courseProgress.currentModule || 0,
                    description: course.description || 'Description non disponible',
                    difficulty: course.difficulty || 1,
                    firebaseData: course,
                    order: course.order || index,
                    timeSpent: courseProgress.timeSpent || 0,
                    completedAt: courseProgress.completedAt || null,
                    startedAt: courseProgress.startedAt || null
                };
            });
            
            console.log(`📚 ${firebaseCourses.length} cours chargés avec progression`);

            // AJOUTEZ CE DEBUG TEMPORAIRE après :
// const firebaseCourses = coursesSnapshot.docs.map(...)

console.log('🔍 === DÉBOGAGE CATÉGORIES ===');
firebaseCourses.forEach((course, index) => {
    console.log(`📚 Cours ${index + 1}: "${course.title}"`);
    console.log(`📂 Catégorie Firebase: "${course.category}"`);
    console.log(`🎯 Level mappé: "${mapCategoryToLevel(course.category)}"`);
    console.log('---');
});

            // Forcer le rendu immédiatement
            renderFirebaseCourses();
            updateProgressStats();
        }
    } catch (error) {
        console.error('❌ Erreur chargement cours Firebase:', error);
    }
}


// ===== SYSTÈME DE PROGRESSION UTILISATEUR =====
async function getUserCourseProgress() {
    if (!window.currentUser?.id) return {};
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            const userDoc = await firebaseDb.collection('users').doc(window.currentUser.id).get();
            
            if (userDoc.exists && userDoc.data().courseProgress) {
                return userDoc.data().courseProgress;
            }
        }
    } catch (error) {
        console.log('⚠️ Erreur chargement progression:', error);
    }
    
    return {};
}

function determineCourseStatus(courseIndex, courseProgress, allProgress) {
    // Si le cours est déjà complété
    if (courseProgress.completed) return 'completed';
    if (courseProgress.started) return 'in-progress';
    
    // Le premier cours de chaque niveau est toujours disponible
    if (courseIndex === 0) return 'available';
    
    // Pour les autres cours, vérifier le cours précédent
    const coursesArray = Object.entries(FormationsData.formations || {});
    const previousCourseId = coursesArray[courseIndex - 1]?.[0];
    
    if (previousCourseId && allProgress[previousCourseId]?.completed) {
        return 'available';
    }
    
    return 'locked';
}


function isFirstCourseOfLevel(courseIndex, level, coursesArray) {
    for (let i = 0; i < courseIndex; i++) {
        if (coursesArray[i][1].level === level) {
            return false;
        }
    }
    return true;
}

function areAllCoursesOfLevelCompleted(level, coursesArray, allProgress) {
    const coursesOfLevel = coursesArray.filter(([id, course]) => course.level === level);
    return coursesOfLevel.every(([id]) => allProgress[id]?.completed);
}

function getPreviousCourseOfSameLevel(courseIndex, level, coursesArray) {
    for (let i = courseIndex - 1; i >= 0; i--) {
        if (coursesArray[i][1].level === level) {
            return coursesArray[i][0];
        }
    }
    return null;
}



// ===== GESTION TEMPS PASSÉ SUR COURS =====
let courseStartTime = null;
let courseId = null;
let minimumTimeRequired = 60000; // 1 minute en millisecondes

function startCourse(courseId) {
    console.log(`🚀 Démarrage cours: ${courseId}`);
    
    const course = FormationsData.formations[courseId];
    if (!course) return;
    
    // Vérifier si le cours est déverrouillé
    if (course.status === 'locked') {
        showNotification('🔒 Ce cours est verrouillé. Terminez le cours précédent d\'abord.', 'error');
        return;
    }
    
    // Marquer le cours comme commencé
    markCourseStarted(courseId);
    
    // Démarrer le timer
    startCourseTimer(courseId);
    
    // Rediriger vers la page de visualisation du cours
    window.location.href = `cours-viewer.html?id=${courseId}`;
}

async function markCourseStarted(courseId) {
    try {
        if (typeof firebaseDb !== 'undefined' && window.currentUser?.id) {
            await firebaseDb.collection('users').doc(window.currentUser.id).update({
                [`courseProgress.${courseId}.started`]: true,
                [`courseProgress.${courseId}.startedAt`]: new Date(),
                [`courseProgress.${courseId}.lastAccessed`]: new Date()
            });
            
            // Mettre à jour localement
            if (FormationsData.formations[courseId]) {
                FormationsData.formations[courseId].status = 'in-progress';
                updateFormationCard(courseId);
            }
        }
    } catch (error) {
        console.error('❌ Erreur marquage début cours:', error);
    }
}

function getCourseTimeSpent() {
    if (!courseStartTime) return 0;
    return Date.now() - courseStartTime;
}

function hasSpentMinimumTime() {
    const timeSpent = getCourseTimeSpent();
    console.log(`⏱️ Temps passé: ${Math.round(timeSpent / 1000)}s / ${minimumTimeRequired / 1000}s requis`);
    return timeSpent >= minimumTimeRequired;
}


function mapCategoryToLevel(category) {
    if (!category) {
        console.warn('⚠️ Catégorie manquante, utilisation de "beginner" par défaut');
        return 'beginner';
    }
    
    // Normaliser la catégorie (minuscules, sans accents, sans espaces)
    const normalizedCategory = category.toString().toLowerCase().trim()
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/à/g, 'a')
        .replace(/ç/g, 'c')
        .replace(/[^a-z]/g, ''); // Supprimer tout sauf lettres
    
    console.log(`🔄 Mapping catégorie: "${category}" → "${normalizedCategory}"`);
    
    const mapping = {
        // Variations françaises
        'debutant': 'beginner',
        'debutants': 'beginner',
        'novice': 'beginner',
        'facile': 'beginner',
        'basic': 'beginner',
        'basique': 'beginner',
        
        'intermediaire': 'intermediate',
        'intermediaires': 'intermediate',
        'moyen': 'intermediate',
        'medium': 'intermediate',
        
        'avance': 'advanced',
        'avances': 'advanced',
        'avance': 'advanced',
        'difficile': 'advanced',
        'hard': 'advanced',
        
        'expert': 'expert',
        'experts': 'expert',
        'professionnel': 'expert',
        'pro': 'expert',
        
        'maitre': 'master',
        'maitres': 'master',
        'master': 'master',
        'masters': 'master',
        'guru': 'master'
    };
    
    const result = mapping[normalizedCategory] || 'beginner';
    console.log(`✅ Résultat final: "${category}" → "${result}"`);
    return result;
}

// ===== AFFICHAGE =====
function displayFormations() {
    console.log('📚 Affichage des formations disponibles');
    
    // Mettre à jour les statistiques
    updateProgressStats();
    
    // Animer les cartes
    const formationCards = document.querySelectorAll('.formation-card');
    formationCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
}


// ===== RENDU COURS FIREBASE =====
function renderFirebaseCourses() {
    const grid = document.querySelector('.formations-grid');
    if (!grid) {
        console.log('❌ Grille formations non trouvée');
        return;
    }
    
    console.log('🔄 Rendu des cours Firebase...');
    
    // Supprimer le loader
    const loader = grid.querySelector('.loading-placeholder');
    if (loader) {
        loader.remove();
    }
    
    // Vider complètement la grille
    grid.innerHTML = '';
    
    // Vérifier s'il y a des cours à afficher
    if (Object.keys(FormationsData.formations).length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                <h3 style="color: #ff8800; margin-bottom: 0.5rem;">Aucune formation disponible</h3>
                <p style="color: rgba(255,255,255,0.7);">Les formations seront bientôt disponibles !</p>
            </div>
        `;
        return;
    }
    
    // Créer les cartes pour chaque cours Firebase
    Object.entries(FormationsData.formations).forEach(([courseId, course]) => {
        const card = createCourseCard(courseId, course);
        grid.appendChild(card);
    });
    
    console.log(`🎯 ${Object.keys(FormationsData.formations).length} cours rendus`);

    setTimeout(() => {
        console.log('🔍 Application du filtre débutant par défaut');
        applyFilter('beginner');
    }, 100);
}



function createCourseCard(courseId, course) {
    const card = document.createElement('div');
    card.className = `formation-card ${course.status}`;
    card.dataset.level = course.level;
    card.dataset.course = courseId;
    
    const difficultyStars = '⭐'.repeat(course.firebaseData?.difficulty || course.difficulty || 1);
    const statusBadge = getStatusBadge(course.status);
    const statusIcon = getStatusIcon(course.status);
    
    // Utiliser l'emoji du cours Firebase ou un par défaut
    const courseEmoji = course.firebaseData?.emoji || '🎓';
    
    card.innerHTML = `
        <div class="formation-badge">${statusBadge}</div>
        <div class="formation-icon">${courseEmoji}</div>
        <h3>${course.title}</h3>
        <p class="formation-description">${course.description}</p>
        
        <div class="formation-details">
            <span class="formation-duration">⏱️ ${course.firebaseData?.duration || course.duration || 'Durée à définir'}</span>
            <span class="formation-level ${course.level}">
                ${getLevelDisplay(course.level)} • ${difficultyStars}
            </span>
        </div>
        
        <div class="formation-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${course.progress}%"></div>
            </div>
            <span>${course.progress}% - ${getProgressText(course)}</span>
        </div>
        
        <div class="formation-actions">
            ${getActionButtons(courseId, course)}
        </div>
    `;
    
    return card;
}

function getStatusBadge(status) {
    const badges = {
        'completed': '✅ Complété',
        'in-progress': '📊 En cours', 
        'available': '🆕 Disponible',
        'locked': '🔒 Verrouillé'
    };
    return badges[status] || '🆕 Nouveau';
}

function getStatusIcon(status) {
    const icons = {
        'completed': '🏆',
        'in-progress': '📊',
        'available': '🚀',
        'locked': '🔒'
    };
    return icons[status] || '🎯';
}

function getLevelDisplay(level) {
    const displays = {
        'beginner': '🌱 Débutant',
        'intermediate': '📊 Intermédiaire',
        'advanced': '🚀 Avancé',
        'expert': '👑 Expert',
        'master': '🔥 Maître'
    };
    return displays[level] || '🌱 Débutant';
}

function getProgressText(course) {
    if (course.status === 'completed') return 'Complété';
    if (course.status === 'in-progress') return `Module ${course.currentModule}/${course.modules}`;
    if (course.status === 'locked') return 'Verrouillé';
    return 'Prêt à commencer';
}

function getActionButtons(courseId, course) {
    switch(course.status) {
        case 'completed':
            return `
                <button class="btn btn-secondary" onclick="showCertificate('${courseId}')">📜 Certificat</button>
                <button class="btn btn-primary" onclick="reviewCourse('${courseId}')">🔄 Réviser</button>
            `;
        case 'in-progress':
            return `
                <button class="btn btn-primary" onclick="continueCourse('${courseId}')">▶️ Continuer</button>
                <button class="btn btn-secondary" onclick="showPreview('${courseId}')">👁️ Aperçu</button>
            `;
        case 'available':
            return `
                <button class="btn btn-primary" onclick="startCourse('${courseId}')">🚀 Commencer</button>
                <button class="btn btn-secondary" onclick="showPreview('${courseId}')">👁️ Aperçu</button>
            `;
        case 'locked':
            return `
                <button class="btn btn-secondary btn-locked" disabled title="Terminez le cours précédent pour débloquer">
                    🔒 Verrouillé
                </button>
                <button class="btn btn-secondary" onclick="showRequirements('${courseId}')">ℹ️ Prérequis</button>
            `;
        default:
            return `
                <button class="btn btn-primary" onclick="startCourse('${courseId}')">🚀 Commencer</button>
                <button class="btn btn-secondary" onclick="showPreview('${courseId}')">👁️ Aperçu</button>
            `;
    }
}

function updateProgressStats() {
    // Calculer les vraies statistiques depuis les formations Firebase
    const totalCourses = Object.keys(FormationsData.formations).length;
    const completedCourses = Object.values(FormationsData.formations).filter(f => f.status === 'completed').length;
    const certificates = completedCourses; // 1 certificat par cours complété
    const overallProgress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
    
    // Mettre à jour les vrais chiffres
    document.getElementById('completed-courses').textContent = completedCourses;
    document.getElementById('total-courses').textContent = totalCourses;
    document.getElementById('certificates').textContent = certificates;
    
    // Mettre à jour la progression circulaire
    const progressCircle = document.querySelector('.progress-circle');
    const progressText = document.querySelector('.progress-text');
    
    if (progressCircle && progressText) {
        const degrees = (overallProgress / 100) * 360;
        progressCircle.style.background = `conic-gradient(#00ff88 0deg ${degrees}deg, rgba(255, 255, 255, 0.1) ${degrees}deg 360deg)`;
        progressText.textContent = overallProgress + '%';
    }
    
    // Mettre à jour la barre de progression
    const progressFill = document.querySelector('.progress-bar-global .progress-fill');
    if (progressFill) {
        progressFill.style.width = overallProgress + '%';
    }
    
    console.log(`📊 Stats mises à jour: ${completedCourses}/${totalCourses} cours (${overallProgress}%)`);
}


function updateRequirements() {
    // Mettre à jour les prérequis selon le niveau utilisateur
    const userRank = window.currentUser?.rank || '🚀 Cadet Spatial';
    
    document.querySelectorAll('.formation-card.locked .formation-progress span').forEach(span => {
        if (span.textContent.includes('requis')) {
            span.innerHTML = `🔒 ${FormationsData.formations.automatise.requirement} requis<br><small>Votre niveau: ${userRank}</small>`;
        }
    });
}

// ===== ÉVÉNEMENTS =====
function initFormationEvents() {
    console.log('🎯 Événements formations initialisés');
    
    // Pas d'événements spécifiques ici, tout est géré par les fonctions onclick
    console.log('✅ Événements formations configurés');
}

// ===== FILTRES =====
function initFormationFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Retirer active de tous les boutons
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Ajouter active au bouton cliqué
            btn.classList.add('active');
            
            // Appliquer le filtre
            const filter = btn.dataset.filter;
            applyFilter(filter);
        });
    });
}

function applyFilter(filter) {
    const cards = document.querySelectorAll('.formation-card');
    
    cards.forEach(card => {
        let shouldShow = false;
        
        switch(filter) {
            case 'beginner':
                shouldShow = card.dataset.level === 'beginner';
                break;
            case 'intermediate':
                shouldShow = card.dataset.level === 'intermediate';
                break;
            case 'advanced':
                shouldShow = card.dataset.level === 'advanced';
                break;
            case 'expert':
                shouldShow = card.dataset.level === 'expert';
                break;
            case 'master':
                shouldShow = card.dataset.level === 'master';
                break;
            case 'completed':
                shouldShow = card.classList.contains('completed');
                break;
        }
        
        if (shouldShow) {
            card.style.display = 'block';
            card.classList.add('visible');
            card.classList.remove('hidden');
        } else {
            card.style.display = 'none';
            card.classList.add('hidden');
            card.classList.remove('visible');
        }
    });
    
    console.log(`🔍 Filtre appliqué: ${filter}`);
}

// ===== ACTIONS DES FORMATIONS =====
function startCourse(courseId) {
    console.log(`🚀 Démarrage cours: ${courseId}`);
    
    // Rediriger vers la page de visualisation du cours
    window.location.href = `cours-viewer.html?id=${courseId}`;
}

// ===== AFFICHAGE COURS FIREBASE =====
function showFirebaseCourse(courseId, course) {
    const courseData = course.firebaseData;
    
    const modal = createModal(
        `🎓 ${courseData.title}`,
        `
        <div style="padding: 2rem; max-width: 800px;">
            <!-- En-tête du cours -->
            <div style="text-align: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(0,255,136,0.2); padding-bottom: 1.5rem;">
                <h2 style="color: #00ff88; margin-bottom: 1rem;">${courseData.title}</h2>
                <p style="color: rgba(255,255,255,0.8); font-size: 1.1rem; line-height: 1.5;">
                    ${courseData.description}
                </p>
                <div style="display: flex; justify-content: center; gap: 2rem; margin-top: 1rem;">
                    <span style="color: rgba(255,255,255,0.7);">⏱️ ${courseData.duration}</span>
                    <span style="color: rgba(255,255,255,0.7);">📊 ${'⭐'.repeat(courseData.difficulty || 1)}</span>
                    <span style="color: rgba(255,255,255,0.7);">📚 ${courseData.sections?.length || 0} sections</span>
                </div>
            </div>
            
            <!-- Contenu des sections -->
            <div id="course-sections-content">
                ${courseData.sections?.map((section, index) => `
                    <div style="margin-bottom: 2rem; background: rgba(0,20,40,0.3); border-radius: 10px; padding: 1.5rem; border-left: 4px solid #00ff88;">
                        <h3 style="color: #00ff88; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span style="background: #00ff88; color: #000; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                                ${index + 1}
                            </span>
                            ${section.title}
                        </h3>
                        <div style="color: rgba(255,255,255,0.9); line-height: 1.6;">
                            ${section.content}
                        </div>
                        ${section.hasVideo && section.videoUrl ? `
                            <div style="margin-top: 1.5rem;">
                                <h4 style="color: #00ff88; margin-bottom: 0.5rem;">🎥 Vidéo explicative</h4>
                                ${section.videoUrl.includes('youtube') ? 
                                    `<iframe width="100%" height="315" src="${getYouTubeEmbedUrl(section.videoUrl)}" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe>` :
                                    `<video controls style="width: 100%; border-radius: 8px;"><source src="${section.videoUrl}" type="video/mp4"></video>`
                                }
                            </div>
                        ` : ''}
                    </div>
                `).join('') || '<p style="color: rgba(255,255,255,0.6);">Aucun contenu disponible.</p>'}
            </div>
            
            <!-- Vidéo finale si présente -->
            ${courseData.finalVideo?.hasVideo ? `
                <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,136,0,0.1); border-radius: 10px; border: 1px solid rgba(255,136,0,0.3);">
                    <h3 style="color: #ff8800; margin-bottom: 1rem;">🎬 Vidéo de conclusion</h3>
                    ${courseData.finalVideo.type === 'youtube' ? 
                        `<iframe width="100%" height="315" src="${getYouTubeEmbedUrl(courseData.finalVideo.youtubeUrl)}" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe>` :
                        `<video controls style="width: 100%; border-radius: 8px;"><source src="${courseData.finalVideo.videoUrl}" type="video/mp4"></video>`
                    }
                </div>
            ` : ''}
            
            <!-- Actions -->
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,255,136,0.2);">
                <button onclick="markCourseCompleted('${courseId}'); closeModal();" style="padding: 1rem 2rem; background: linear-gradient(45deg, #00ff88, #00ccff); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    ✅ Marquer comme terminé
                </button>
                <button onclick="closeModal()" style="padding: 1rem 2rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 8px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
        `
    );
    
    document.body.appendChild(modal);
}

function getYouTubeEmbedUrl(url) {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function extractYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

function markCourseCompleted(courseId) {
    const course = FormationsData.formations[courseId];
    if (course) {
        course.status = 'completed';
        course.progress = 100;
        
        // ✅ ATTRIBUTION POINTS FORMATION
        if (window.PointsSystem && window.currentUser) {
            window.PointsSystem.awardLearningPoints(
                window.currentUser.id, 
                'course_completed', 
                `Cours "${course.title}" terminé`
            ).then(() => {
                console.log('🎯 Points attribués pour cours terminé');
            }).catch(error => {
                console.error('❌ Erreur attribution points formation:', error);
            });
        }
        
        // Sauvegarder la progression
        saveFormationCompletion(courseId);
        
        showNotification(`🎉 Cours "${course.title}" terminé !`, 'success');
        
        // Mettre à jour l'affichage
        setTimeout(() => {
            displayFormations();
        }, 1000);
    }
}

function continueCourse(courseId) {
    console.log(`▶️ Reprise cours: ${courseId}`);
    
    const course = FormationsData.formations[courseId];
    if (!course) return;
    
    showNotification(`▶️ Reprise du cours: ${course.title}`, 'info');
    
    // Simulation de reprise
    setTimeout(() => {
        showCourseModal(courseId, `Module ${course.currentModule}: En cours`);
    }, 1000);
}

function reviewCourse(courseId) {
    console.log(`🔄 Révision cours: ${courseId}`);
    
    const course = FormationsData.formations[courseId];
    if (!course) return;
    
    showNotification(`🔄 Révision du cours: ${course.title}`, 'info');
    
    // Simulation de révision
    setTimeout(() => {
        showCourseModal(courseId, 'Mode Révision');
    }, 1000);
}

function showCertificate(courseId) {
    console.log(`📜 Affichage certificat: ${courseId}`);
    
    const course = FormationsData.formations[courseId];
    if (!course) return;
    
    showCertificateModal(courseId, course.title);
}

function showPreview(courseId) {
    console.log(`👁️ Aperçu cours: ${courseId}`);
    
    const course = FormationsData.formations[courseId];
    if (!course) return;
    
    showPreviewModal(courseId, course);
}

function showSyllabus(courseId) {
    console.log(`📋 Programme cours: ${courseId}`);
    
    const course = FormationsData.formations[courseId];
    if (!course) return;
    
    showSyllabusModal(courseId, course);
}

function showRequirements(courseId) {
    console.log(`ℹ️ Prérequis cours: ${courseId}`);
    
    const course = FormationsData.formations[courseId];
    if (!course) return;
    
    showRequirementsModal(courseId, course);
}

// ===== MODALES =====
function showCourseModal(courseId, moduleTitle) {
    const modal = createModal(
        `🎓 ${FormationsData.formations[courseId]?.title || 'Formation'}`,
        `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
            <h3 style="color: #00ff88; margin-bottom: 1rem;">${moduleTitle}</h3>
            <p style="color: rgba(255,255,255,0.8); margin-bottom: 2rem;">
                Le module de formation sera bientôt disponible !
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="closeModal()" style="padding: 0.8rem 1.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 6px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
        `
    );
    
    document.body.appendChild(modal);
}

function showCertificateModal(courseId, courseTitle) {
    const modal = createModal(
        `📜 Certificat - ${courseTitle}`,
        `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📜</div>
            <h3 style="color: #00ff88; margin-bottom: 1rem;">Certificat de Réussite</h3>
            <div style="background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); border-radius: 10px; padding: 1.5rem; margin: 1rem 0;">
                <h4 style="color: #fff; margin-bottom: 0.5rem;">${courseTitle}</h4>
                <p style="color: rgba(255,255,255,0.8);">
                    Certification délivrée à <strong>${window.currentUser?.name || 'Astronaute'}</strong>
                </p>
                <small style="color: rgba(255,255,255,0.6);">
                    Complété le ${new Date().toLocaleDateString('fr-FR')}
                </small>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="downloadCertificate('${courseId}')" style="padding: 0.8rem 1.5rem; background: linear-gradient(45deg, #00ff88, #00ccff); color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    📥 Télécharger
                </button>
                <button onclick="closeModal()" style="padding: 0.8rem 1.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 6px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
        `
    );
    
    document.body.appendChild(modal);
}


function showPreviewModal(courseId, course) {
    const courseData = course.firebaseData;
    const realDuration = courseData?.duration || course.duration || 'Durée à déterminer';
    const realLevel = getLevelDisplay(course.level);
    const sectionsCount = courseData?.sections?.length || course.modules || 1;
    
    // Déterminer le contenu réel du cours
    const hasVideo = courseData?.finalVideo?.hasVideo;
    const hasSections = courseData?.sections && courseData.sections.length > 0;
    const hasSectionVideos = courseData?.sections?.some(section => section.videoUrl);
    
    const modal = createModal(
        `👁️ Aperçu - ${course.title}`,
        `
        <div style="padding: 2rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👁️</div>
                <h3 style="color: #00ff88; margin-bottom: 1rem;">${course.title}</h3>
                <p style="color: rgba(255,255,255,0.8);">
                    ${realLevel} • ${realDuration} • ${'⭐'.repeat(course.difficulty || 1)}
                </p>
            </div>
            
            <div style="background: rgba(0,20,40,0.4); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                <h4 style="color: #00ff88; margin-bottom: 1rem;">📋 Contenu du cours</h4>
                <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                    <p>• ${sectionsCount} ${sectionsCount > 1 ? 'sections' : 'section'} de formation</p>
                    ${hasSections ? '<p>• Contenu texte structuré</p>' : ''}
                    ${hasSectionVideos ? '<p>• Vidéos par section</p>' : ''}
                    ${hasVideo ? '<p>• Vidéo de conclusion</p>' : ''}
                    <p>• Progression automatique</p>
                    <p>• Certificat de complétion</p>
                </div>
            </div>
            
            <div style="background: rgba(0,255,136,0.1); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                <h4 style="color: #00ff88; margin-bottom: 1rem;">📝 Description</h4>
                <p style="color: rgba(255,255,255,0.8); line-height: 1.5;">
                    ${courseData?.description || course.description || 'Formation complète pour maîtriser les concepts essentiels.'}
                </p>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="startCourse('${courseId}'); closeModal();" style="padding: 0.8rem 1.5rem; background: linear-gradient(45deg, #00ff88, #00ccff); color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    🚀 Commencer
                </button>
                <button onclick="closeModal()" style="padding: 0.8rem 1.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 6px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
        `
    );
    
    document.body.appendChild(modal);
}


function showSyllabusModal(courseId, course) {
    const modal = createModal(
        `📋 Programme - ${course.title}`,
        `
        <div style="padding: 2rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <h3 style="color: #00ff88; margin-bottom: 1rem;">Programme détaillé</h3>
            </div>
            
            <div style="background: rgba(0,20,40,0.4); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                <h4 style="color: #00ff88; margin-bottom: 1rem;">📚 Modules (${course.modules})</h4>
                <div style="color: rgba(255,255,255,0.8); line-height: 1.8;">
                    ${Array.from({length: course.modules}, (_, i) => `
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.8rem;">
                            <span style="color: ${i < course.currentModule ? '#00ff88' : 'rgba(255,255,255,0.5)'};">
                                ${i < course.currentModule ? '✅' : '⭕'}
                            </span>
                            <span>Module ${i + 1}: ${getModuleName(courseId, i)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="closeModal()" style="padding: 0.8rem 1.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 6px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
        `
    );
    
    document.body.appendChild(modal);
}

function showRequirementsModal(courseId, course) {
    const userRank = window.currentUser?.rank || '🚀 Cadet Spatial';
    const userLevel = window.currentUser?.level || 1;
    const requiredLevel = 2; // Niveau requis pour débloquer
    
    const modal = createModal(
        `ℹ️ Prérequis - ${course.title}`,
        `
        <div style="padding: 2rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
                <h3 style="color: #ff4757; margin-bottom: 1rem;">Formation verrouillée</h3>
            </div>
            
            <div style="background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                <h4 style="color: #ff4757; margin-bottom: 1rem;">📋 Prérequis</h4>
                <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                    <p>🎯 <strong>Niveau requis:</strong> ${course.requirement}</p>
                    <p>📊 <strong>Votre niveau actuel:</strong> ${userRank}</p>
                    <p>🚀 <strong>Progression:</strong> ${userLevel < requiredLevel ? 'Continuez à trader pour débloquer' : 'Presque débloqué !'}</p>
                </div>
            </div>
            
            <div style="background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                <h4 style="color: #00ff88; margin-bottom: 1rem;">💡 Comment débloquer</h4>
                <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                    <p>• Augmentez votre portfolio à 1000$+</p>
                    <p>• Complétez les formations de base</p>
                    <p>• Réalisez des trades rentables</p>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="closeModal()" style="padding: 0.8rem 1.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 6px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
        `
    );
    
    document.body.appendChild(modal);
}

// ===== UTILITAIRES =====
function createModal(title, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div style="background: #1a1a2e; border-radius: 15px; border: 1px solid rgba(0,255,136,0.3); max-width: 600px; width: 90vw; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid rgba(0,255,136,0.2);">
                <h3 style="color: #00ff88; margin: 0;">${title}</h3>
                <button onclick="closeModal()" style="background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>
            </div>
            ${content}
        </div>
    `;
    
    // Fermer en cliquant à côté
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return modal;
}

function closeModal() {
    const modal = document.querySelector('[style*="position: fixed"]');
    if (modal) {
        modal.remove();
    }
}

function getModuleName(courseId, moduleIndex) {
    const moduleNames = {
        bases: ['Introduction', 'Marchés financiers', 'Analyse de base', 'Premiers trades', 'Psychologie', 'Récapitulatif'],
        analyse: ['Chandeliers japonais', 'Moyennes mobiles', 'RSI et MACD', 'Supports et résistances', 'Figures chartistes', 'Stratégies'],
        risque: ['Calcul de position', 'Stop loss', 'Take profit', 'Diversification', 'Récapitulatif'],
        psychologie: ['Émotions', 'Discipline', 'Gestion du stress', 'Récapitulatif'],
        fondamentale: ['Projet blockchain', 'Équipe et partenaires', 'Tokenomics', 'Adoption', 'Récapitulatif']
    };
    
    return moduleNames[courseId]?.[moduleIndex] || `Module ${moduleIndex + 1}`;
}

function downloadCertificate(courseId) {
    showNotification('📥 Téléchargement du certificat bientôt disponible !', 'info');
    closeModal();
}

function showNotification(message, type = 'info') {
    // Vérifier si une fonction globale existe ET qu'elle est différente de cette fonction
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        // Créer notre propre notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#00ff88' : '#00ccff'};
            color: ${type === 'success' ? '#000011' : '#ffffff'};
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        // Supprimer après 3 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
        
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// ===== SAUVEGARDE =====
async function saveFormationProgress(courseId, progress) {
    if (!window.currentUser?.id) return;
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(window.currentUser.id).update({
                [`formations.${courseId}.progress`]: progress,
                [`formations.${courseId}.lastUpdate`]: new Date()
            });
            
            console.log(`💾 Progression sauvegardée: ${courseId} - ${progress}%`);
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde progression:', error);
    }
}

async function saveFormationCompletion(courseId) {
    if (!window.currentUser?.id) return;
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(window.currentUser.id).update({
                [`formations.${courseId}.status`]: 'completed',
                [`formations.${courseId}.progress`]: 100,
                [`formations.${courseId}.completedAt`]: new Date(),
                [`formations.${courseId}.certificateEarned`]: true
            });
            
            // Mettre à jour les statistiques globales
            await updateGlobalStats();
            
            console.log(`🎉 Formation complétée: ${courseId}`);
            showNotification(`🎉 Formation "${FormationsData.formations[courseId]?.title}" complétée !`, 'success');
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde completion:', error);
    }
}

async function updateGlobalStats() {
    if (!window.currentUser?.id) return;
    
    try {
        const completedCount = Object.values(FormationsData.formations).filter(f => f.status === 'completed').length;
        const totalCount = Object.keys(FormationsData.formations).length;
        const certificatesCount = Object.values(FormationsData.formations).filter(f => f.status === 'completed').length;
        const overallProgress = Math.round((completedCount / totalCount) * 100);
        
        FormationsData.userProgress = {
            completed: completedCount,
            total: totalCount,
            certificates: certificatesCount,
            overallProgress: overallProgress
        };
        
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(window.currentUser.id).update({
                'formations.progress': FormationsData.userProgress
            });
        }
        
        // Mettre à jour l'affichage
        updateProgressStats();
        
        console.log('📊 Statistiques globales mises à jour');
    } catch (error) {
        console.error('❌ Erreur mise à jour statistiques:', error);
    }
}

// ===== SYSTÈME DE POINTS ET RÉCOMPENSES =====
async function awardFormationPoints(courseId) {
    if (!window.currentUser?.id) return;
    
    const pointsMap = {
        'bases': 100,
        'analyse': 150,
        'risque': 120,
        'automatise': 200,
        'psychologie': 130,
        'fondamentale': 110
    };
    
    const points = pointsMap[courseId] || 100;
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(window.currentUser.id).update({
                [`formations.${courseId}.pointsEarned`]: points,
                'points': firebase.firestore.FieldValue.increment(points)
            });
            
            showNotification(`🌟 +${points} points gagnés !`, 'success');
            console.log(`🌟 Points attribués: ${points} pour ${courseId}`);
        }
    } catch (error) {
        console.error('❌ Erreur attribution points:', error);
    }
}

function checkFormationUnlocks() {
    // Vérifier que les formations sont chargées
    if (Object.keys(FormationsData.formations).length === 0) {
        console.log('⚠️ Formations pas encore chargées');
        return;
    }
    
    console.log('🔓 Vérification déblocages formations...');
    // Le système progressif se base maintenant sur l'ordre des cours
    // Pas besoin de déblocage manuel
}

function checkAdvancedUnlocks() {
    // Vérifier que les formations existent avant de vérifier leur statut
    const coursesIds = Object.keys(FormationsData.formations);
    if (coursesIds.length === 0) return;
    
    // Pour l'instant, ne pas faire de déblocage automatique
    // Le système progressif se base sur l'ordre des cours
    console.log('🔓 Vérification déblocages avancés...');
}

function updateFormationCard(courseId) {
    const card = document.querySelector(`[data-course="${courseId}"]`);
    if (!card) return;
    
    const formation = FormationsData.formations[courseId];
    
    // Mettre à jour les classes
    card.className = `formation-card ${formation.status}`;
    
    // Mettre à jour le badge
    const badge = card.querySelector('.formation-badge');
    if (badge) {
        const badgeText = {
            'completed': '✅ Complété',
            'in-progress': '📊 En cours',
            'available': '🆕 Disponible',
            'locked': '🔒 Verrouillé'
        };
        badge.textContent = badgeText[formation.status];
    }
    
    // Mettre à jour les boutons
    updateFormationButtons(card, courseId);
}

function updateFormationButtons(card, courseId) {
    const actions = card.querySelector('.formation-actions');
    if (!actions) return;
    
    const formation = FormationsData.formations[courseId];
    
    actions.innerHTML = '';
    
    switch(formation.status) {
        case 'completed':
            actions.innerHTML = `
                <button class="btn btn-secondary" onclick="showCertificate('${courseId}')">📜 Certificat</button>
                <button class="btn btn-primary" onclick="reviewCourse('${courseId}')">🔄 Réviser</button>
            `;
            break;
        case 'in-progress':
            actions.innerHTML = `
                <button class="btn btn-primary" onclick="continueCourse('${courseId}')">▶️ Continuer</button>
                <button class="btn btn-secondary" onclick="showSyllabus('${courseId}')">📋 Programme</button>
            `;
            break;
        case 'available':
            actions.innerHTML = `
                <button class="btn btn-primary" onclick="startCourse('${courseId}')">🚀 Commencer</button>
                <button class="btn btn-secondary" onclick="showPreview('${courseId}')">👁️ Aperçu</button>
            `;
            break;
        case 'locked':
            actions.innerHTML = `
                <button class="btn btn-secondary" disabled>🔒 Verrouillé</button>
                <button class="btn btn-secondary" onclick="showRequirements('${courseId}')">ℹ️ Prérequis</button>
            `;
            break;
    }
}

// ===== SYSTÈME DE QUIZ =====
function startQuiz(courseId, moduleIndex) {
    const quizData = getQuizData(courseId, moduleIndex);
    showQuizModal(courseId, moduleIndex, quizData);
}

function getQuizData(courseId, moduleIndex) {
    const quizzes = {
        'bases': [
            {
                question: "Qu'est-ce que la blockchain ?",
                options: [
                    "Une base de données centralisée",
                    "Un registre distribué et décentralisé",
                    "Un type de cryptomonnaie",
                    "Un logiciel de trading"
                ],
                correct: 1
            },
            {
                question: "Que signifie 'HODL' ?",
                options: [
                    "Hold On for Dear Life",
                    "High Order Digital Ledger",
                    "Holding Original Digital Ledger",
                    "Une faute de frappe de 'Hold'"
                ],
                correct: 3
            }
        ],
        'analyse': [
            {
                question: "Qu'indique un RSI supérieur à 70 ?",
                options: [
                    "Zone de survente",
                    "Zone de surachat",
                    "Tendance haussière",
                    "Tendance baissière"
                ],
                correct: 1
            }
        ]
    };
    
    return quizzes[courseId] || [];
}

function showQuizModal(courseId, moduleIndex, questions) {
    let currentQuestion = 0;
    let score = 0;
    
    const modal = createModal(
        `📝 Quiz - Module ${moduleIndex + 1}`,
        `
        <div id="quiz-container" style="padding: 2rem; min-height: 300px;">
            <div id="question-container">
                <!-- Questions seront injectées ici -->
            </div>
            <div id="quiz-controls" style="margin-top: 2rem; text-align: center;">
                <button id="next-question" class="btn btn-primary" style="display: none;">Question suivante</button>
                <button id="finish-quiz" class="btn btn-primary" style="display: none;">Terminer le quiz</button>
            </div>
        </div>
        `
    );
    
    document.body.appendChild(modal);
    
    // Fonction pour afficher une question
    function displayQuestion(index) {
        const question = questions[index];
        const container = document.getElementById('question-container');
        
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <h3 style="color: #00ff88;">Question ${index + 1}/${questions.length}</h3>
                <div style="background: rgba(0,255,136,0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p style="color: #fff; font-size: 1.1rem;">${question.question}</p>
                </div>
            </div>
            <div id="options-container">
                ${question.options.map((option, i) => `
                    <div class="quiz-option" onclick="selectOption(${i})" style="
                        background: rgba(0,20,40,0.4);
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 8px;
                        padding: 1rem;
                        margin: 0.5rem 0;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: #fff;
                    ">
                        ${String.fromCharCode(65 + i)}. ${option}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Sélection d'option
    window.selectOption = function(selectedIndex) {
        const options = document.querySelectorAll('.quiz-option');
        const question = questions[currentQuestion];
        
        options.forEach((option, i) => {
            option.style.pointerEvents = 'none';
            if (i === question.correct) {
                option.style.background = 'rgba(0,255,136,0.3)';
                option.style.borderColor = '#00ff88';
            } else if (i === selectedIndex && i !== question.correct) {
                option.style.background = 'rgba(255,71,87,0.3)';
                option.style.borderColor = '#ff4757';
            }
        });
        
        if (selectedIndex === question.correct) {
            score++;
        }
        
        setTimeout(() => {
            currentQuestion++;
            if (currentQuestion < questions.length) {
                displayQuestion(currentQuestion);
            } else {
                showQuizResults();
            }
        }, 2000);
    };
    
    function showQuizResults() {
        const percentage = Math.round((score / questions.length) * 100);
        const passed = percentage >= 70;
        
        document.getElementById('question-container').innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">
                    ${passed ? '🎉' : '😔'}
                </div>
                <h3 style="color: ${passed ? '#00ff88' : '#ff4757'}; margin-bottom: 1rem;">
                    ${passed ? 'Félicitations !' : 'Essayez encore'}
                </h3>
                <p style="color: #fff; font-size: 1.2rem; margin-bottom: 2rem;">
                    Score: ${score}/${questions.length} (${percentage}%)
                </p>
                <div style="background: rgba(0,255,136,0.1); padding: 1.5rem; border-radius: 8px;">
                    <p style="color: rgba(255,255,255,0.8);">
                        ${passed ? 
                            'Excellent ! Vous maîtrisez les concepts de ce module.' : 
                            'Révisez le module et tentez à nouveau le quiz.'}
                    </p>
                </div>
            </div>
        `;
        
        document.getElementById('quiz-controls').innerHTML = `
            <button onclick="closeModal()" class="btn btn-primary">
                ${passed ? '✅ Continuer' : '🔄 Fermer'}
            </button>
        `;
        
        if (passed) {
            // Débloquer le module suivant
            updateModuleProgress(courseId, moduleIndex + 1);
        }
    }
    
    // Démarrer le quiz
    displayQuestion(0);
}

function updateModuleProgress(courseId, moduleIndex) {
    const formation = FormationsData.formations[courseId];
    if (!formation) return;
    
    formation.currentModule = Math.max(formation.currentModule, moduleIndex);
    formation.progress = Math.round((formation.currentModule / formation.modules) * 100);
    
    // Sauvegarder la progression
    saveFormationProgress(courseId, formation.progress);
    
    // Vérifier si la formation est complétée
    if (formation.currentModule >= formation.modules) {
        formation.status = 'completed';
        saveFormationCompletion(courseId);
        awardFormationPoints(courseId);
    }
    
    // Mettre à jour l'affichage
    updateProgressStats();
    updateFormationCard(courseId);
}

// ===== SYSTÈME DE RECHERCHE =====
function initSearchSystem() {
    const searchInput = document.getElementById('formation-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        searchFormations(query);
    });
}

function searchFormations(query) {
    const cards = document.querySelectorAll('.formation-card');
    
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.formation-description').textContent.toLowerCase();
        
        const matches = title.includes(query) || description.includes(query);
        
        card.style.display = matches ? 'block' : 'none';
    });
}

// ===== SYSTÈME DE FAVORIS =====
function toggleFavorite(courseId) {
    const favorites = JSON.parse(localStorage.getItem('formation-favorites') || '[]');
    const index = favorites.indexOf(courseId);
    
    if (index === -1) {
        favorites.push(courseId);
        showNotification('⭐ Formation ajoutée aux favoris', 'success');
    } else {
        favorites.splice(index, 1);
        showNotification('❌ Formation retirée des favoris', 'info');
    }
    
    localStorage.setItem('formation-favorites', JSON.stringify(favorites));
    updateFavoriteButtons();
}

function updateFavoriteButtons() {
    const favorites = JSON.parse(localStorage.getItem('formation-favorites') || '[]');
    
    favorites.forEach(courseId => {
        const card = document.querySelector(`[data-course="${courseId}"]`);
        if (card) {
            const favoriteBtn = card.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.innerHTML = '⭐';
                favoriteBtn.style.color = '#ffd700';
            }
        }
    });
}

// ===== GESTION DES ERREURS =====
function handleFormationError(error, context) {
    console.error(`❌ Erreur formation [${context}]:`, error);
    
    const errorMessages = {
        'load': 'Erreur lors du chargement des formations',
        'save': 'Erreur lors de la sauvegarde',
        'start': 'Impossible de démarrer cette formation',
        'continue': 'Erreur lors de la reprise du cours',
        'quiz': 'Erreur lors du quiz'
    };
    
    const message = errorMessages[context] || 'Une erreur est survenue';
    showNotification(`❌ ${message}`, 'error');
}

// ===== UTILITAIRES AVANCÉS =====
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours}h ${mins.toString().padStart(2, '0')}min`;
    }
    return `${mins}min`;
}

function getFormationStatusColor(status) {
    const colors = {
        'completed': '#00ff88',
        'in-progress': '#00ccff',
        'available': '#9945ff',
        'locked': '#666666'
    };
    return colors[status] || '#666666';
}

function getFormationStatusIcon(status) {
    const icons = {
        'completed': '✅',
        'in-progress': '📊',
        'available': '🆕',
        'locked': '🔒'
    };
    return icons[status] || '❓';
}

// ===== PERFORMANCE ET OPTIMISATION =====
function optimizeFormationDisplay() {
    // Lazy loading des images
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        observer.observe(img);
    });
}

function preloadFormationData() {
    // Précharger les données des formations populaires
    const popularCourses = ['bases', 'analyse', 'risque'];
    
    popularCourses.forEach(courseId => {
        const formation = FormationsData.formations[courseId];
        if (formation) {
            // Précharger les données du syllabus
            formation.syllabus = formation.syllabus || getModuleSyllabus(courseId);
        }
    });
}

function getModuleSyllabus(courseId) {
    const syllabuses = {
        'bases': [
            'Introduction au monde des cryptomonnaies',
            'Comprendre les marchés financiers',
            'Les bases de l\'analyse technique',
            'Réaliser ses premiers trades',
            'Psychologie du trading débutant',
            'Récapitulatif et certification'
        ],
        'analyse': [
            'Lecture des chandeliers japonais',
            'Moyennes mobiles et tendances',
            'Indicateurs RSI et MACD',
            'Supports et résistances',
            'Figures chartistes avancées',
            'Stratégies de trading technique'
        ],
        'risque': [
            'Calcul de la taille de position',
            'Placement des stop loss',
            'Gestion des take profit',
            'Diversification du portefeuille',
            'Stratégies de money management'
        ]
    };
    
    return syllabuses[courseId] || [];
}

// ===== ÉVÉNEMENTS GLOBAUX =====
window.addEventListener('storage', (e) => {
    if (e.key === 'formation-favorites') {
        updateFavoriteButtons();
    }
});

window.addEventListener('beforeunload', () => {
    // Sauvegarder les données avant fermeture
    if (window.currentUser?.id) {
        saveFormationProgress('current', 0);
    }
});


// ===== VÉRIFICATION AU CHARGEMENT =====
document.addEventListener('DOMContentLoaded', checkFormationsAuth);


// ===== INITIALISATION FINALE =====
// Éviter la double initialisation
if (!window.formationsInitialized) {
    window.formationsInitialized = true;
    
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎓 Formations - Initialisation complète');
        
        try {
            initFormations();
            initSearchSystem();
            updateFavoriteButtons();
            optimizeFormationDisplay();
            preloadFormationData();
            
            setTimeout(() => {
                checkFormationUnlocks();
            }, 1000);
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation des formations:', error);
        }
    });
}

// ===== EXPORT GLOBAL =====
window.FormationsModule = {
    init: initFormations,
    startCourse,
    continueCourse,
    reviewCourse,
    showCertificate,
    showPreview,
    showSyllabus,
    showRequirements,
    saveProgress: saveFormationProgress,
    toggleFavorite,
    searchFormations,
    data: FormationsData
};

// ===== EXPOSITION GLOBALE SUPPLÉMENTAIRE =====
window.markCourseCompleted = markCourseCompleted;

console.log('✅ Module Formations complètement initialisé');