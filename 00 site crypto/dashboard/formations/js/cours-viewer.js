// ===== COURSE-VIEWER.JS ===== 

console.log('🎓 Initialisation du visualiseur de cours');

// ===== VARIABLES GLOBALES =====
let currentCourse = null;
let currentSectionIndex = 0;
let totalSections = 0;

// ===== VARIABLES TEMPS =====
let courseViewStartTime = null;
let minimumViewTime = 60000; // 1 minute
let hasSpentRequiredTime = false;
let timeCheckInterval = null;



// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'authentification
    checkCourseAuth();
    
    // Récupérer l'ID du cours depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    if (!courseId) {
        showError('Aucun cours spécifié');
        return;
    }
    
    // Charger le cours
    loadCourse(courseId);
});

// ===== AUTHENTIFICATION =====
function checkCourseAuth() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = '../../index.html';
            } else {
                updateUserDisplay(user);
            }
        });
    }
}

function updateUserDisplay(user) {
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (userName) userName.textContent = user.displayName || 'Astronaute';
    if (userAvatar) userAvatar.textContent = '👨‍🚀';
}

// ===== CHARGEMENT DU COURS =====
async function loadCourse(courseId) {
    try {
        console.log(`📚 Chargement du cours: ${courseId}`);
        
        if (typeof firebaseDb !== 'undefined') {
            const courseDoc = await firebaseDb.collection('cours').doc(courseId).get();
            
            if (courseDoc.exists) {
                currentCourse = {
                    id: courseId,
                    ...courseDoc.data()
                };
                
                console.log('✅ Cours chargé:', currentCourse);
                renderCourse();

            // Démarrer le timer de temps passé
            startViewTimer(); 
            } else {
                showError('Cours non trouvé');
            }
        } else {
            showError('Base de données non disponible');
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement cours:', error);
        showError('Erreur lors du chargement du cours');
    }

    // Initialiser la première section
    initializeFirstSection();
}

// ===== INITIALISATION SECTION =====
function initializeFirstSection() {
    currentSectionIndex = 0;
    
    // S'assurer que la première section est visible
    setTimeout(() => {
        const firstSection = document.getElementById('section-0');
        if (firstSection) {
            firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        updateCurrentSection(0);
    }, 1000);
}


// ===== RENDU DU COURS =====
function renderCourse() {
    if (!currentCourse) return;
    
    // Masquer le loader
    document.getElementById('course-loader').style.display = 'none';
    document.getElementById('course-content').style.display = 'block';
    
    // Mettre à jour les informations générales
    updateCourseInfo();
    
    // Rendre les sections
    renderSections();
    
    // Rendre la navigation
    renderSectionsNavigation();
    
    // Rendre la vidéo finale si présente
    renderFinalVideo();

    // Initialiser le bouton de completion
    setTimeout(() => {
        disableCompletionButton();
        showTimeRequirement();
    }, 500);

    // FORCER l'initialisation à la première section (index 0)
    currentSectionIndex = 0;
    setTimeout(() => {
        console.log('🎯 Initialisation progression: section 0');
        updateProgress();
    }, 500);
}



// ===== SYSTÈME DE TEMPS PASSÉ =====
function startViewTimer() {
    courseViewStartTime = Date.now();
    hasSpentRequiredTime = false;
    
    console.log('⏱️ Timer de visualisation démarré');
    
    // Vérifier toutes les 10 secondes
    timeCheckInterval = setInterval(() => {
        const timeSpent = Date.now() - courseViewStartTime;
        
        if (timeSpent >= minimumViewTime && !hasSpentRequiredTime) {
            hasSpentRequiredTime = true;
            enableCompletionButton();
            clearInterval(timeCheckInterval);
        }
        
        updateTimeDisplay(timeSpent);
    }, 10000);
}

function updateTimeDisplay(timeSpent) {
    const seconds = Math.floor(timeSpent / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    console.log(`⏱️ Temps passé: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
}

function enableCompletionButton() {
    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.style.opacity = '1';
        completeBtn.style.cursor = 'pointer';
        completeBtn.innerHTML = '✅ Valider le cours';
        completeBtn.style.background = 'linear-gradient(45deg, #00ff88, #00ccff)';
        completeBtn.style.color = '#000';
        completeBtn.style.boxShadow = '0 5px 15px rgba(0, 255, 136, 0.3)';
        
        // REMETTRE l'événement onclick pour la validation
        completeBtn.onclick = () => {
            completeCourse();
        };
    }
}

function disableCompletionButton() {
    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.style.opacity = '0.5';
        completeBtn.style.cursor = 'not-allowed';
        completeBtn.innerHTML = '⏱️ Lisez le cours entièrement';
        completeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        completeBtn.style.color = '#fff';
        
        // Ajouter l'événement de clic pour le message
        completeBtn.onclick = (e) => {
            e.preventDefault();
            showReadingReminder();
        };
    }
}


function showTimeRequirement() {
    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
        disableCompletionButton();
    }
}

function showReadingReminder() {
    showCustomConfirm(
        '📚 Lecture du cours',
        'Êtes-vous sûr d\'avoir tout lu ?',
        'Prenez le temps de bien comprendre le contenu avant de continuer.',
        () => {
            console.log('📚 Utilisateur confirme avoir lu');
        }
    );
}



function updateCourseInfo() {
    const difficultyStars = '⭐'.repeat(currentCourse.difficulty || 1);
    
    // Utiliser l'emoji du cours ou un par défaut
    const courseEmoji = currentCourse.emoji || '🎓';
    
    // En-tête principal
    document.getElementById('course-title').textContent = `${courseEmoji} ${currentCourse.title}`;
    document.getElementById('course-breadcrumb-title').textContent = currentCourse.title;

    // Masquer la description
    const descriptionElement = document.getElementById('course-description');
    if (descriptionElement) {
        descriptionElement.style.display = 'none';
    }
    
    // Statistiques - MÊME TAILLE D'ÉTOILES
    document.getElementById('course-duration-main').textContent = currentCourse.duration || 'Non spécifié';
    document.getElementById('course-sections-count').textContent = `${currentCourse.sections?.length || 0} sections`;
    const mainDifficultyElement = document.getElementById('course-difficulty-main');
    if (mainDifficultyElement) {
        mainDifficultyElement.textContent = difficultyStars;
    }
    
    // Sidebar - MÊME NOMBRE D'ÉTOILES
    document.getElementById('course-title-sidebar').textContent = `${courseEmoji} ${currentCourse.title}`;
    document.getElementById('course-duration').textContent = `⏱️ ${currentCourse.duration || 'Non spécifié'}`;
    document.getElementById('course-difficulty').textContent = difficultyStars;
    
    // Mise à jour du titre de la page
    document.title = `${currentCourse.title} - CryptoTraders Pro`;
}


function renderSections() {
    const container = document.getElementById('sections-container');
    const sections = currentCourse.sections || [];
    totalSections = sections.length;
    
    if (sections.length === 0) {
        container.innerHTML = `
            <div class="section-card">
                <div class="section-header">
                    <h2>📚 Contenu non disponible</h2>
                    <p>Ce cours est en cours de préparation</p>
                </div>
                <div class="section-content">
                    <p>Le contenu de ce cours sera bientôt disponible. Revenez plus tard pour accéder à la formation complète.</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    sections.forEach((section, index) => {
        const sectionCard = document.createElement('div');
        sectionCard.className = 'section-card';
        sectionCard.id = `section-${index}`;
        
        // Utiliser l'emoji de la section ou un par défaut
        const sectionEmoji = section.emoji || '📖';
        
        sectionCard.innerHTML = `
            <div class="section-header">
                <h2>${sectionEmoji} ${section.title}</h2>
            </div>
            
            <div class="section-content">
                ${cleanAndPreserveContent(section.content)}
                
                ${section.images && section.images.length > 0 ? `
                    <div class="section-images">
                        ${section.images.map((image, index) => `
                            <div class="section-image ${image.title ? 'caption-visible' : ''}" onclick="openImageModal('${image.src || image.firebaseUrl}', '${image.title || ''}', ${index})">
                                <img src="${image.src || image.firebaseUrl}" 
                                     alt="${image.alt || 'Image de section'}" 
                                     loading="lazy"
                                     onerror="this.style.display='none'">
                                ${image.title ? `<div class="image-caption">${image.title}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            ${section.videoUrl ? `
                <div class="video-container">
                    <h4 style="color: #00ff88; margin-bottom: 1rem;">🎥 Vidéo explicative</h4>
                    ${section.videoUrl.includes('youtube') ? 
                        `<iframe src="${getYouTubeEmbedUrl(section.videoUrl)}" frameborder="0" allowfullscreen></iframe>` :
                        `<video controls><source src="${section.videoUrl}" type="video/mp4"></video>`
                    }
                </div>
            ` : ''}
        `;
        
        container.appendChild(sectionCard);
    });
    
    // Mettre à jour les compteurs mobiles
    document.getElementById('current-section-number').textContent = currentSectionIndex + 1;
    document.getElementById('total-sections').textContent = totalSections;
}


// ===== NETTOYAGE CONTENU DEPUIS ADMIN =====
function cleanAndPreserveContent(content) {
    if (!content) return '';
    
    // Créer un élément temporaire pour traiter le contenu
    const temp = document.createElement('div');
    temp.innerHTML = content;
    
    // Nettoyer les attributs de style indésirables tout en préservant l'alignement
    const elements = temp.querySelectorAll('*');
    elements.forEach(el => {
        // Préserver l'alignement du texte
        const textAlign = el.style.textAlign;
        
        // Supprimer tous les styles inline
        el.removeAttribute('style');
        
        // Remettre l'alignement si il existait
        if (textAlign && (textAlign === 'center' || textAlign === 'left' || textAlign === 'right')) {
            el.style.textAlign = textAlign;
        }
        
        // Supprimer les attributs de couleur et fond
        el.removeAttribute('color');
        el.removeAttribute('bgcolor');
        el.removeAttribute('background');
        
        // Nettoyer les classes CSS externes sauf celles d'alignement
        if (el.className && !el.className.includes('text-')) {
            el.removeAttribute('class');
        }
    });
    
    return temp.innerHTML;
}



function renderSectionsNavigation() {
   const container = document.getElementById('sections-navigation');
   const sections = currentCourse.sections || [];
   
   if (sections.length === 0) {
       container.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center;">Aucune section disponible</p>';
       return;
   }
   
   container.innerHTML = '';
   
   sections.forEach((section, index) => {
       const navItem = document.createElement('div');
       navItem.className = `section-nav-item ${index === currentSectionIndex ? 'active' : ''}`;
       navItem.onclick = () => scrollToSection(index);
       
       // Utiliser l'emoji de la section
       const sectionEmoji = section.emoji || '📖';
       
       navItem.innerHTML = `
           <div class="section-number">${index + 1}</div>
           <div class="section-nav-info">
               <h5>${sectionEmoji} ${section.title}</h5>
               <p>Section ${index + 1}</p>
           </div>
       `;
       
       container.appendChild(navItem);
   });
}

function renderFinalVideo() {
   const finalVideoSection = document.getElementById('final-video-section');
   
   if (currentCourse.finalVideo && currentCourse.finalVideo.hasVideo) {
       const container = document.getElementById('final-video-container');
       
       if (currentCourse.finalVideo.type === 'youtube' && currentCourse.finalVideo.youtubeUrl) {
           container.innerHTML = `
               <iframe src="${getYouTubeEmbedUrl(currentCourse.finalVideo.youtubeUrl)}" 
                       frameborder="0" allowfullscreen></iframe>
           `;
       } else if (currentCourse.finalVideo.videoUrl) {
           container.innerHTML = `
               <video controls>
                   <source src="${currentCourse.finalVideo.videoUrl}" type="video/mp4">
                   Votre navigateur ne supporte pas la lecture vidéo.
               </video>
           `;
       }
       
       finalVideoSection.style.display = 'block';
   } else {
       finalVideoSection.style.display = 'none';
   }
}

// ===== NAVIGATION SECTIONS =====
function scrollToSection(index) {
   const section = document.getElementById(`section-${index}`);
   if (section) {
       section.scrollIntoView({ behavior: 'smooth', block: 'start' });
       updateCurrentSection(index);
   }
}

function navigateSection(direction) {
   const newIndex = currentSectionIndex + direction;
   
   if (newIndex >= 0 && newIndex < totalSections) {
       scrollToSection(newIndex);
   }
}

function updateCurrentSection(index) {
   currentSectionIndex = index;
   
   // Mettre à jour la navigation sidebar
   document.querySelectorAll('.section-nav-item').forEach((item, i) => {
       if (i === index) {
           item.classList.add('active');
       } else {
           item.classList.remove('active');
       }
   });
   
   // Mettre à jour la navigation mobile
   document.getElementById('current-section-number').textContent = index + 1;
   
   // Mettre à jour les boutons de navigation
   const prevBtn = document.getElementById('prev-section-btn');
   const nextBtn = document.getElementById('next-section-btn');
   
   if (prevBtn) prevBtn.disabled = index === 0;
   if (nextBtn) nextBtn.disabled = index === totalSections - 1;
   
   // Mettre à jour la progression
   updateProgress();
}



// ===== PROGRESSION =====
function updateProgress() {
    // S'assurer que currentSectionIndex est valide
    const validSectionIndex = Math.min(Math.max(currentSectionIndex, 0), totalSections - 1);
    
    // CORRIGER LA LOGIQUE : progression basée sur la section actuelle / total
    const progress = totalSections > 0 ? Math.round(((validSectionIndex + 1) / totalSections) * 100) : 0;
    
    console.log(`📊 Progression: section ${validSectionIndex + 1}/${totalSections} = ${progress}%`);
    
    // Animer le cercle de progression
    animateProgressCircle(progress);
    
    // Animer le texte de progression
    const progressText = document.getElementById('progress-percentage');
    if (progressText) {
        progressText.classList.add('updated');
        setTimeout(() => progressText.classList.remove('updated'), 500);
        
        // Animation du chiffre
        animateNumber(progressText, parseInt(progressText.textContent) || 0, progress, '%');
    }
    
    // Barre de progression avec délai
    setTimeout(() => {
        const progressFill = document.getElementById('sidebar-progress');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    }, 200);
    
    // Texte détaillé
    const progressDetailText = document.getElementById('progress-text');
    if (progressDetailText) {
        progressDetailText.textContent = `Section ${validSectionIndex + 1} sur ${totalSections}`;
    }
}


function animateProgressCircle(targetProgress = null) {
    const progressCircle = document.querySelector('.progress-circle-small');
    if (!progressCircle) return;
    
    const validSectionIndex = Math.min(Math.max(currentSectionIndex, 0), totalSections - 1);
    const progress = targetProgress !== null ? targetProgress : 
                    (totalSections > 0 ? Math.round((validSectionIndex / Math.max(totalSections - 1, 1)) * 100) : 0);
    
    // Commencer à -90 degrés (12h) et aller dans le sens horaire
    const startAngle = -90;
    const targetDegrees = (progress / 100) * 360;
    
    // Ajouter classe d'animation
    progressCircle.classList.add('animate');
    setTimeout(() => progressCircle.classList.remove('animate'), 800);
    
    // Animation fluide
    let currentDegrees = 0;
    const duration = 1000; // 1 seconde
    const startTime = performance.now();
    
    const animateStep = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);
        
        // Easing function pour une animation plus fluide
        const easeOutCubic = 1 - Math.pow(1 - progressRatio, 3);
        currentDegrees = targetDegrees * easeOutCubic;
        
        // Construire le conic-gradient qui commence à -90deg (12h)
        const endAngle = startAngle + currentDegrees;
        progressCircle.style.background = `conic-gradient(from ${startAngle}deg, #00ff88 0deg ${currentDegrees}deg, rgba(255, 255, 255, 0.1) ${currentDegrees}deg 360deg)`;
        
        if (progressRatio < 1) {
            requestAnimationFrame(animateStep);
        }
    };
    
    requestAnimationFrame(animateStep);
}

function animateNumber(element, start, end, suffix = '') {
    const duration = 800;
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current) + suffix;
    }, 16);
}

// ===== ACTIONS =====
function completeCourse() {
    if (!hasSpentRequiredTime) {
        const timeSpent = Date.now() - courseViewStartTime;
        const remainingTime = Math.ceil((minimumViewTime - timeSpent) / 1000);
        
        showNotification(`⏱️ Vous devez rester encore ${remainingTime} secondes sur le cours.`, 'error');
        return;
    }
    
    showCustomConfirm(
        '🎉 Félicitations !',
        'Voulez-vous marquer ce cours comme terminé ?',
        'Cela débloquera le cours suivant.',
        async () => {
            // Sauvegarder la completion avec temps passé
            await saveCourseCompletion();
            
            showNotification('🎉 Cours terminé ! Cours suivant débloqué.', 'success');
            
            // Rediriger vers les formations après 2 secondes
            setTimeout(() => {
                goBackToFormations();
            }, 2000);
        }
    );
}

async function saveCourseCompletion() {
    if (!currentCourse?.id || !window.currentUser?.id) return;
    
    const totalTimeSpent = Date.now() - courseViewStartTime;
    
    try {
        if (typeof firebaseDb !== 'undefined') {
            await firebaseDb.collection('users').doc(window.currentUser.id).update({
                [`courseProgress.${currentCourse.id}.completed`]: true,
                [`courseProgress.${currentCourse.id}.completedAt`]: new Date(),
                [`courseProgress.${currentCourse.id}.progress`]: 100,
                [`courseProgress.${currentCourse.id}.timeSpent`]: totalTimeSpent
            });
            
            console.log(`💾 Cours complété sauvegardé: ${currentCourse.id}`);
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde completion:', error);
    }
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
        background: rgba(0, 17, 34, 0.8);
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
        background: linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 204, 255, 0.1));
        border: 2px solid rgba(0, 255, 136, 0.3);
        border-radius: 20px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        text-align: center;
        animation: slideUp 0.3s ease;
        box-shadow: 0 20px 40px rgba(0, 255, 136, 0.2);
    `;
    
    modal.innerHTML = `
        <div class="confirm-icon" style="font-size: 3rem; margin-bottom: 1rem;">${title.includes('🎉') ? '🎉' : '❓'}</div>
        <h3 style="color: #00ff88; margin-bottom: 1rem; font-size: 1.5rem;">${title}</h3>
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
                background: linear-gradient(45deg, #00ff88, #00ccff);
                color: #000;
                border: none;
                padding: 0.8rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            ">✅ Confirmer</button>
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
            box-shadow: 0 5px 15px rgba(0, 255, 136, 0.3);
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


function goBackToFormations() {
   window.location.href = 'formations.html';
}

// ===== UTILITAIRES =====
function getYouTubeEmbedUrl(url) {
   const videoId = extractYouTubeVideoId(url);
   return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function extractYouTubeVideoId(url) {
   const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
   const match = url.match(regExp);
   return (match && match[7].length === 11) ? match[7] : null;
}

function showError(message) {
   document.getElementById('course-loader').innerHTML = `
       <div class="loader-content">
           <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
           <h3 style="color: #ff4757;">Erreur</h3>
           <p>${message}</p>
           <button onclick="goBackToFormations()" class="btn btn-secondary" style="margin-top: 1rem;">
               ← Retour aux formations
           </button>
       </div>
   `;
}

function showNotification(message, type = 'info') {
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
   `;
   
   document.body.appendChild(notification);
   
   setTimeout(() => {
       notification.remove();
   }, 3000);
}


// ===== LIGHTBOX POUR IMAGES =====
function openImageModal(imageSrc, imageTitle, imageIndex) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            max-width: 90vw;
            max-height: 90vh;
            position: relative;
            text-align: center;
        ">
            <img src="${imageSrc}" style="
                max-width: 100%;
                max-height: 80vh;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 20px 40px rgba(0, 255, 136, 0.3);
            " alt="Image agrandie">
            ${imageTitle ? `
                <div style="
                    color: #ffffff;
                    margin-top: 1rem;
                    padding: 1rem;
                    background: rgba(0, 255, 136, 0.1);
                    border-radius: 8px;
                    font-size: 1.1rem;
                ">${imageTitle}</div>
            ` : ''}
            <button onclick="closeImageModal()" style="
                position: absolute;
                top: -10px;
                right: -10px;
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 50%;
                background: rgba(255, 71, 87, 0.8);
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255, 71, 87, 1)'"
               onmouseout="this.style.background='rgba(255, 71, 87, 0.8)'">✕</button>
        </div>
    `;
    
    // Fermer en cliquant à côté
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    // Fermer avec Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeImageModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    document.body.appendChild(modal);
    
    // Empêcher le scroll du body
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Exposer les fonctions
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;




// ===== GESTION SCROLL AUTOMATIQUE =====
let isScrolling = false;

window.addEventListener('scroll', () => {
    if (isScrolling) return;
    
    const sections = document.querySelectorAll('.section-card');
    const scrollPosition = window.scrollY + 200;
    
    sections.forEach((section, index) => {
        // S'assurer que l'index ne dépasse pas le nombre de sections
        if (index >= totalSections) return;
        
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            if (currentSectionIndex !== index) {
                updateCurrentSection(Math.min(index, totalSections - 1));
            }
        }
    });
});

// ===== GESTION CLAVIER =====
document.addEventListener('keydown', (e) => {
   switch(e.key) {
       case 'ArrowLeft':
           navigateSection(-1);
           break;
       case 'ArrowRight':
           navigateSection(1);
           break;
       case 'Escape':
           goBackToFormations();
           break;
   }
});

// ===== EXPOSITION GLOBALE =====
window.navigateSection = navigateSection;
window.completeCourse = completeCourse;
window.goBackToFormations = goBackToFormations;
window.scrollToSection = scrollToSection;



console.log('✅ Visualiseur de cours initialisé');