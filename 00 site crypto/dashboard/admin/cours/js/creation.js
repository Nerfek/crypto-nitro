// ===== DASHBOARD/ADMIN/COURS/JS/CREATION.JS =====


// Attendre que Firebase soit disponible
document.addEventListener('DOMContentLoaded', function() {
    // Exposer firebaseDb globalement pour cette page
    window.firebaseDb = firebase.firestore();
    console.log('🔥 Firebase DB exposé pour création:', !!window.firebaseDb);
    
    // Puis continuer l'initialisation
    initializeCreationPage();
});

// Vérification Firebase au démarrage
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase non chargé lors de l\'initialisation');
}


console.log('🎓 Page de création de cours chargée');


// ===== COMPRESSION D'IMAGES =====
function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculer les nouvelles dimensions
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Dessiner l'image redimensionnée
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir en blob compressé
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// ===== VARIABLES GLOBALES =====
let currentUser = null;
let sectionCounter = 1;
let selectedDifficulty = 1;

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeCreationPage();
    initializeDifficultySelector();
    initializeEditorButtons();
    initializeVideoUploads();
    initializeVideoTabs();
});

// ===== INITIALISATION DE LA PAGE =====
function initializeCreationPage() {
    // Vérifier l'authentification
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                const isFormateur = await checkFormateurRole(user.uid);
                if (isFormateur) {
                    currentUser = {
                        id: user.uid,
                        email: user.email,
                        name: user.displayName || 'Formateur'
                    };
                    updateUserDisplay();
                } else {
                    showNotification('Accès refusé - Privilèges formateur requis', 'error');
                    setTimeout(() => {
                        window.location.href = '../admin.html';
                    }, 2000);
                }
            } else {
                window.location.href = '../../../index.html';
            }
        });
    } else {
        // Mode développement
        currentUser = {
            id: 'formateur-dev',
            email: 'formateur@test.com',
            name: 'Formateur Dev'
        };
        updateUserDisplay();
    }

    initializeEmojiSelectors(); 
    
    console.log('✅ Page de création initialisée');

    // Vérifier si on est en mode édition
    checkEditMode();
}

// ===== MARQUER COMME NON SAUVEGARDÉ LORS DE MODIFICATIONS =====
document.addEventListener('input', function(e) {
    if (e.target.matches('#course-title, #course-description, #course-category, #course-duration, input[name="section-title[]"], #course-youtube-url')) {
        markAsUnsaved();
    }
});

document.addEventListener('input', function(e) {
    if (e.target.classList.contains('editor-content')) {
        markAsUnsaved();
    }
});

// ===== GESTION MODE ÉDITION =====
let editMode = false;
let editingCourseId = null;

function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
        editMode = true;
        editingCourseId = editId;
        
        // Changer le titre de la page
        const pageTitle = document.querySelector('.page-header h1');
        if (pageTitle) {
            pageTitle.textContent = '✏️ Modifier le Cours';
        }
        
        const pageDescription = document.querySelector('.page-header p');
        if (pageDescription) {
            pageDescription.textContent = 'Modifiez les informations de votre cours existant';
        }
        
        // Changer le breadcrumb
        const breadcrumbCurrent = document.querySelector('.breadcrumb .current');
        if (breadcrumbCurrent) {
            breadcrumbCurrent.textContent = 'Modifier un Cours';
        }
        
        // Charger les données du cours
        loadCourseForEdit(editId);
        
        console.log('🔧 Mode édition activé pour le cours:', editId);
    }
}



async function loadCourseForEdit(courseId) {
    try {
        if (typeof firebaseDb !== 'undefined') {
            const courseDoc = await firebaseDb.collection('cours').doc(courseId).get();
            
            if (courseDoc.exists) {
                const courseData = courseDoc.data();
                populateFormWithCourseData(courseData);
                console.log('✅ Données du cours chargées pour édition');
            } else {
                showNotification('Cours non trouvé', 'error');
                setTimeout(() => window.location.href = '../admin.html#formations', 2000);
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement cours pour édition:', error);
        showNotification('Erreur lors du chargement du cours', 'error');
    }
}

function populateFormWithCourseData(courseData) {
    // Remplir les champs de base
    document.getElementById('course-title').value = courseData.title || '';
    document.getElementById('course-description').value = courseData.description || '';
    document.getElementById('course-category').value = courseData.category || '';
    document.getElementById('course-duration').value = courseData.duration || '';
    
    // CHARGER L'EMOJI DU COURS
    if (courseData.emoji) {
        document.getElementById('course-emoji').textContent = courseData.emoji;
        document.getElementById('course-emoji-value').value = courseData.emoji;
    }
    
    // Mettre à jour la difficulté
    if (courseData.difficulty) {
        selectedDifficulty = courseData.difficulty;
        document.getElementById('course-difficulty').value = courseData.difficulty;
        
        // Mettre à jour les étoiles
        const starBtns = document.querySelectorAll('.star-btn');
        starBtns.forEach((star, index) => {
            if (index < courseData.difficulty) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        // Mettre à jour le texte de difficulté
        const difficultyLabels = {1: 'Très facile', 2: 'Facile', 3: 'Moyen', 4: 'Difficile', 5: 'Très difficile'};
        const difficultyText = document.querySelector('.difficulty-text');
        if (difficultyText) {
            difficultyText.textContent = difficultyLabels[courseData.difficulty];
        }
    }
    
    // Charger les sections AVEC EMOJIS ET IMAGES
    if (courseData.sections && courseData.sections.length > 0) {
        // Vider le conteneur actuel
        const container = document.getElementById('sections-container');
        container.innerHTML = '';
        sectionCounter = 0;
        
        // Ajouter chaque section avec ses données complètes
        courseData.sections.forEach((section, index) => {
            addSectionWithData(section);
        });
    }

    // Charger la vidéo finale
    if (courseData.finalVideo && courseData.finalVideo.hasVideo) {
        if (courseData.finalVideo.type === 'youtube' && courseData.finalVideo.youtubeUrl) {
            // Basculer vers l'onglet YouTube
            const youtubeTab = document.querySelector('[data-tab="youtube"]');
            const uploadTab = document.querySelector('[data-tab="upload"]');
            const youtubeContent = document.getElementById('youtube-tab');
            const uploadContent = document.getElementById('upload-tab');
            
            if (youtubeTab && uploadTab && youtubeContent && uploadContent) {
                // Activer l'onglet YouTube
                youtubeTab.classList.add('active');
                uploadTab.classList.remove('active');
                youtubeContent.classList.add('active');
                uploadContent.classList.remove('active');
            }
            
            // Remplir l'URL YouTube
            const youtubeInput = document.getElementById('course-youtube-url');
            if (youtubeInput) {
                youtubeInput.value = courseData.finalVideo.youtubeUrl;
                // Déclencher l'aperçu SANS notification
                handleYouTubeUrlSilent(courseData.finalVideo.youtubeUrl);
            }
            
            console.log('✅ Vidéo YouTube chargée:', courseData.finalVideo.youtubeUrl);
        }
    }


    // Charger la vidéo finale
    if (courseData.finalVideo && courseData.finalVideo.hasVideo) {
        if (courseData.finalVideo.type === 'youtube' && courseData.finalVideo.youtubeUrl) {
            // Basculer vers l'onglet YouTube
            const youtubeTab = document.querySelector('[data-tab="youtube"]');
            const uploadTab = document.querySelector('[data-tab="upload"]');
            const youtubeContent = document.getElementById('youtube-tab');
            const uploadContent = document.getElementById('upload-tab');
            
            if (youtubeTab && uploadTab && youtubeContent && uploadContent) {
                // Activer l'onglet YouTube
                youtubeTab.classList.add('active');
                uploadTab.classList.remove('active');
                youtubeContent.classList.add('active');
                uploadContent.classList.remove('active');
            }
            
            // Remplir l'URL YouTube
            const youtubeInput = document.getElementById('course-youtube-url');
            if (youtubeInput) {
                youtubeInput.value = courseData.finalVideo.youtubeUrl;

                // Déclencher l'aperçu SANS notification
                handleYouTubeUrlSilent(courseData.finalVideo.youtubeUrl);
            }
            
            console.log('✅ Vidéo YouTube chargée:', courseData.finalVideo.youtubeUrl);
        }
        // Note: Pour les fichiers uploadés, on ne peut pas les recharger depuis Firebase Storage
        // L'utilisateur devra re-uploader le fichier s'il veut le changer
    }
}

function addSectionWithData(sectionData) {
    sectionCounter++;
    
    const container = document.getElementById('sections-container');
    const newSection = document.createElement('div');
    newSection.className = 'course-section';
    newSection.dataset.section = sectionCounter;
    
    // Emoji de la section
    const sectionEmoji = sectionData.emoji || '📖';
    
    newSection.innerHTML = `
        <div class="section-header-item">
            <div class="section-title-group">
                <div class="section-emoji-selector">
                    <span class="section-emoji" data-section="${sectionCounter}" data-emoji="${sectionEmoji}">${sectionEmoji}</span>
                    <div class="section-emoji-grid" style="display: none;">
                        <span class="emoji-option" data-emoji="📖">📖</span>
                        <span class="emoji-option" data-emoji="📝">📝</span>
                        <span class="emoji-option" data-emoji="💡">💡</span>
                        <span class="emoji-option" data-emoji="🔍">🔍</span>
                        <span class="emoji-option" data-emoji="⚙️">⚙️</span>
                        <span class="emoji-option" data-emoji="🎯">🎯</span>
                        <span class="emoji-option" data-emoji="🚀">🚀</span>
                        <span class="emoji-option" data-emoji="💎">💎</span>
                    </div>
                </div>
                <h3>Section ${sectionCounter}</h3>
            </div>
            <button type="button" class="btn-remove-section" onclick="removeSection(${sectionCounter})">
                🗑️ Supprimer
            </button>
        </div>
        
        <div class="section-content">
            <div class="form-group">
                <label>Titre de la section *</label>
                <input type="text" name="section-title[]" required 
                       placeholder="Ex: Comprendre la blockchain" value="${sectionData.title || ''}">
            </div>
            
            <div class="form-group">
                <label>Contenu de la section *</label>
                <div class="editor-container">
                    <div class="editor-toolbar">
                        <button type="button" class="editor-btn" data-command="bold" title="Gras">B</button>
                        <button type="button" class="editor-btn" data-command="italic" title="Italique">I</button>
                        <button type="button" class="editor-btn" data-command="underline" title="Souligné">U</button>
                        <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Liste à puces">• Liste</button>
                        <button type="button" class="editor-btn" data-command="insertOrderedList" title="Liste numérotée">1. Liste</button>
                        <button type="button" class="editor-btn" data-command="justifyLeft" title="Aligner à gauche">⬅</button>
                        <button type="button" class="editor-btn" data-command="justifyCenter" title="Centrer">⬌</button>
                        <button type="button" class="editor-btn" data-command="justifyRight" title="Aligner à droite">➡</button>
                    </div>
                    <div class="editor-content" contenteditable="true" 
                         placeholder="Rédigez le contenu de cette section...">${sectionData.content || ''}</div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Images de la section</label>
                <div class="images-container" data-section="${sectionCounter}">
                    <div class="images-list">
                        ${sectionData.images ? sectionData.images.map((image, imgIndex) => `
                            <div class="image-item" data-image-id="${image.id || 'img_' + Date.now() + '_' + imgIndex}">
                                <div class="image-preview">
                                    <img src="${image.src || image.firebaseUrl}" alt="Image de section">
                                    <div class="image-overlay">
                                        <button type="button" class="btn-remove-image" onclick="removeImage(this)">🗑️</button>
                                    </div>
                                </div>
                                <div class="image-details">
                                    <div class="image-field">
                                        <label>Titre de l'image</label>
                                        <input type="text" class="image-title-input" placeholder="Ex: Graphique Bitcoin" 
                                               data-image-id="${image.id || 'img_' + Date.now() + '_' + imgIndex}" 
                                               value="${image.title || ''}" onchange="updateImageTitle(this)">
                                    </div>
                                    <div class="image-field">
                                        <label>Description (optionnelle)</label>
                                        <textarea class="image-description-input" placeholder="Décrivez cette image..." 
                                                  data-image-id="${image.id || 'img_' + Date.now() + '_' + imgIndex}" 
                                                  onchange="updateImageDescription(this)" rows="2">${image.description || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                    <button type="button" class="btn btn-secondary btn-add-image" onclick="addImage(${sectionCounter})">
                        📷 ${sectionData.images && sectionData.images.length > 0 ? 'Ajouter une autre image' : 'Ajouter une image'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(newSection);
    updateRemoveButtons();
    
    // Mettre à jour le texte du bouton si des images sont présentes
    if (sectionData.images && sectionData.images.length > 0) {
        const addButton = newSection.querySelector('.btn-add-image');
        if (addButton) {
            addButton.classList.add('has-images');
        }
    }
}

// ===== VÉRIFICATION RÔLE FORMATEUR =====
async function checkFormateurRole(userId) {
    try {
        if (typeof firebaseDb !== 'undefined') {
            const userDoc = await firebaseDb.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                return userData.role === 'admin' || userData.isAdmin === true;
            }
        }
        return true; // Mode dev
    } catch (error) {
        console.log('⚠️ Erreur vérification formateur:', error);
        return false;
    }
}

// ===== MISE À JOUR AFFICHAGE UTILISATEUR =====
function updateUserDisplay() {
    const userName = document.getElementById('admin-name');
    if (userName && currentUser) {
        userName.textContent = currentUser.name;
    }
}

// ===== SÉLECTEUR DE DIFFICULTÉ =====
function initializeDifficultySelector() {
    const starBtns = document.querySelectorAll('.star-btn');
    const difficultyText = document.querySelector('.difficulty-text');
    
    const difficultyLabels = {
        1: 'Très facile',
        2: 'Facile', 
        3: 'Moyen',
        4: 'Difficile',
        5: 'Très difficile'
    };
    
    starBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            selectedDifficulty = rating;
            document.getElementById('course-difficulty').value = rating;
            
            // Mettre à jour les étoiles
            starBtns.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
            
            // Mettre à jour le texte
            if (difficultyText) {
                difficultyText.textContent = difficultyLabels[rating];
            }
        });
    });
}

// ===== INITIALISATION BOUTONS ÉDITEUR AMÉLIORÉS =====
function initializeEditorButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('editor-btn')) {
            e.preventDefault();
            handleEditorCommand(e.target);
        }
    });
    
    // Gestion du collage pour nettoyer le formatage
    document.addEventListener('paste', function(e) {
        if (e.target.classList.contains('editor-content')) {
            handlePaste(e);
        }
    });
    
    // Nettoyage automatique du contenu lors de la saisie
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('editor-content')) {
            cleanContent(e.target);
        }
    });
}

function handleEditorCommand(button) {
    const command = button.dataset.command;
    const editor = button.closest('.editor-container').querySelector('.editor-content');
    
    editor.focus();
    
    // Commandes spéciales
    if (command === 'justifyCenter') {
        document.execCommand('justifyCenter', false, null);
    } else if (command === 'justifyLeft') {
        document.execCommand('justifyLeft', false, null);
    } else if (command === 'justifyRight') {
        document.execCommand('justifyRight', false, null);
    } else {
        document.execCommand(command, false, null);
    }
    
    // Nettoyer le contenu après la commande
    setTimeout(() => {
        cleanContent(editor);
        updateEditorButtonStates(editor);
    }, 50);
}

function handlePaste(e) {
    e.preventDefault();
    
    const editor = e.target;
    const clipboardData = e.clipboardData || window.clipboardData;
    
    // Récupérer le texte HTML s'il existe, sinon le texte brut
    let pastedHTML = clipboardData.getData('text/html');
    let pastedText = clipboardData.getData('text/plain');
    
    if (pastedHTML) {
        // Nettoyer le HTML collé
        const cleanHTML = cleanPastedHTML(pastedHTML);
        document.execCommand('insertHTML', false, cleanHTML);
    } else {
        // Insérer le texte brut
        document.execCommand('insertText', false, pastedText);
    }
    
    // Nettoyer le contenu après le collage
    setTimeout(() => {
        cleanContent(editor);
    }, 50);
}

function cleanPastedHTML(html) {
    // Créer un élément temporaire pour nettoyer le HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Supprimer les attributs de style indésirables
    const elements = temp.querySelectorAll('*');
    elements.forEach(el => {
        // Supprimer les styles inline sauf pour l'alignement
        if (el.style) {
            const textAlign = el.style.textAlign;
            el.removeAttribute('style');
            if (textAlign && (textAlign === 'center' || textAlign === 'left' || textAlign === 'right')) {
                el.style.textAlign = textAlign;
            }
        }
        
        // Supprimer les attributs de couleur et fond
        el.removeAttribute('color');
        el.removeAttribute('bgcolor');
        el.removeAttribute('background');
        el.removeAttribute('class');
        
        // Garder seulement les balises de formatage importantes
        const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
            // Remplacer par un span si c'est du formatage
            if (el.children.length === 0) {
                el.outerHTML = el.innerHTML;
            }
        }
    });
    
    return temp.innerHTML;
}

function cleanContent(editor) {
    // Supprimer les styles indésirables de tous les éléments
    const elements = editor.querySelectorAll('*');
    elements.forEach(el => {
        // Supprimer les attributs de style sauf l'alignement
        if (el.style) {
            const textAlign = el.style.textAlign;
            el.removeAttribute('style');
            if (textAlign && (textAlign === 'center' || textAlign === 'left' || textAlign === 'right')) {
                el.style.textAlign = textAlign;
            }
        }
        
        // Supprimer les attributs de couleur
        el.removeAttribute('color');
        el.removeAttribute('bgcolor');
        el.removeAttribute('background');
        
        // Nettoyer les classes CSS externes
        if (el.className && !el.className.includes('text-')) {
            el.removeAttribute('class');
        }
    });
    
    // Forcer la couleur du texte
    editor.style.color = '#ffffff';
}

function updateEditorButtonStates(editor) {
    const toolbar = editor.closest('.editor-container').querySelector('.editor-toolbar');
    const buttons = toolbar.querySelectorAll('.editor-btn');
    
    buttons.forEach(btn => {
        const command = btn.dataset.command;
        let isActive = false;
        
        try {
            // Vérification spéciale pour les listes
            if (command === 'insertUnorderedList') {
                isActive = document.queryCommandState('insertUnorderedList');
            } else if (command === 'insertOrderedList') {
                isActive = document.queryCommandState('insertOrderedList'); 
            } else if (command === 'justifyCenter') {
                isActive = document.queryCommandState('justifyCenter');
            } else if (command === 'justifyLeft') {
                isActive = document.queryCommandState('justifyLeft');
            } else if (command === 'justifyRight') {
                isActive = document.queryCommandState('justifyRight');
            } else {
                isActive = document.queryCommandState(command);
            }
        } catch (e) {
            // Ignore les erreurs de queryCommandState
        }
        
        if (isActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}


// ===== GESTION UPLOAD VIDÉO =====
function initializeVideoUploads() {
    document.addEventListener('change', function(e) {
        if (e.target.type === 'file' && e.target.accept === 'video/*') {
            handleVideoUpload(e.target);
        }
    });
}

// ===== GESTION ONGLETS VIDÉO =====
function initializeVideoTabs() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('video-tab')) {
            const tab = e.target.dataset.tab;
            const container = e.target.closest('.video-upload-zone');
            switchVideoTab(container, tab);
        }
    });
    
    // Gestion changement URL YouTube
    document.addEventListener('input', function(e) {
        if (e.target.id === 'course-youtube-url') {
            handleYouTubeUrl(e.target.value);
        }
    });
}

function switchVideoTab(container, activeTab) {
    // Mettre à jour les onglets
    const tabs = container.querySelectorAll('.video-tab');
    const contents = container.querySelectorAll('.video-tab-content');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === activeTab) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    contents.forEach(content => {
        if (content.id === activeTab + '-tab') {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

function handleYouTubeUrl(url) {
    const preview = document.getElementById('youtube-preview');
    const iframe = preview.querySelector('iframe');
    
    if (!url) {
        preview.style.display = 'none';
        return;
    }
    
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        preview.style.display = 'block';
        showNotification('Vidéo YouTube chargée avec succès', 'success');
    } else {
        preview.style.display = 'none';
        showNotification('URL YouTube invalide', 'error');
    }
}

function handleYouTubeUrlSilent(url) {
    const preview = document.getElementById('youtube-preview');
    const iframe = preview.querySelector('iframe');
    
    if (!url) {
        preview.style.display = 'none';
        return;
    }
    
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        preview.style.display = 'block';
        // PAS de notification ici
    } else {
        preview.style.display = 'none';
    }
}

function extractYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

function removeYouTubeVideo() {
    document.getElementById('course-youtube-url').value = '';
    document.getElementById('youtube-preview').style.display = 'none';
}

function handleVideoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Vérification taille (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('La vidéo ne doit pas dépasser 100MB', 'error');
        input.value = '';
        return;
    }
    
    // Vérification format
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Format non supporté. Utilisez MP4, AVI, MOV ou WMV', 'error');
        input.value = '';
        return;
    }
    
    // Afficher l'aperçu
    const uploadZone = input.closest('.video-upload-zone');
    const uploadArea = uploadZone.querySelector('.upload-area');
    const preview = uploadZone.querySelector('.video-preview');
    const video = preview.querySelector('video');
    
    const fileURL = URL.createObjectURL(file);
    video.src = fileURL;
    
    uploadArea.style.display = 'none';
    preview.style.display = 'block';
    
    // Bouton supprimer
    const removeBtn = preview.querySelector('.btn-remove-video');
    removeBtn.onclick = function() {
        input.value = '';
        URL.revokeObjectURL(fileURL);
        uploadArea.style.display = 'flex';
        preview.style.display = 'none';
    };
    
    showNotification('Vidéo ajoutée avec succès', 'success');
}

// ===== GESTION DES SECTIONS =====
function addSection() {
    sectionCounter++;
    
    const container = document.getElementById('sections-container');
    const newSection = document.createElement('div');
    newSection.className = 'course-section';
    newSection.dataset.section = sectionCounter;
    
    newSection.innerHTML = `
        <div class="section-header-item">
            <div class="section-title-group">
                <div class="section-emoji-selector">
                    <span class="section-emoji" data-section="${sectionCounter}">📖</span>
                    <div class="section-emoji-grid" style="display: none;">
                        <span class="emoji-option" data-emoji="📖">📖</span>
                        <span class="emoji-option" data-emoji="📝">📝</span>
                        <span class="emoji-option" data-emoji="💡">💡</span>
                        <span class="emoji-option" data-emoji="🔍">🔍</span>
                        <span class="emoji-option" data-emoji="⚙️">⚙️</span>
                        <span class="emoji-option" data-emoji="🎯">🎯</span>
                        <span class="emoji-option" data-emoji="🚀">🚀</span>
                        <span class="emoji-option" data-emoji="💎">💎</span>
                    </div>
                </div>
                <h3>Section ${sectionCounter}</h3>
            </div>
            <button type="button" class="btn-remove-section" onclick="removeSection(${sectionCounter})">
                🗑️ Supprimer
            </button>
        </div>
        
        <div class="section-content">
            <div class="form-group">
                <label>Titre de la section *</label>
                <input type="text" name="section-title[]" required 
                       placeholder="Ex: Comment acheter de la crypto?">
            </div>
            
            <div class="form-group">
                <label>Contenu de la section *</label>
                <div class="editor-container">
                    <div class="editor-toolbar">
                        <button type="button" class="editor-btn" data-command="bold" title="Gras">B</button>
                        <button type="button" class="editor-btn" data-command="italic" title="Italique">I</button>
                        <button type="button" class="editor-btn" data-command="underline" title="Souligné">U</button>
                        <button type="button" class="editor-btn" data-command="insertUnorderedList" title="Liste à puces">• Liste</button>
                        <button type="button" class="editor-btn" data-command="insertOrderedList" title="Liste numérotée">1. Liste</button>
                        <button type="button" class="editor-btn" data-command="justifyLeft" title="Aligner à gauche">⬅</button>
                        <button type="button" class="editor-btn" data-command="justifyCenter" title="Centrer">⬌</button>
                        <button type="button" class="editor-btn" data-command="justifyRight" title="Aligner à droite">➡</button>
                    </div>
                    <div class="editor-content" contenteditable="true" 
                         placeholder="Rédigez le contenu de cette section..."></div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Images de la section</label>
                <div class="images-container" data-section="${sectionCounter}">
                    <div class="images-list"></div>
                    <button type="button" class="btn btn-secondary btn-add-image" onclick="addImage(${sectionCounter})">
                        📷 Ajouter une image
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(newSection);
    
    // Animation d'apparition
    newSection.style.opacity = '0';
    newSection.style.transform = 'translateY(20px)';
    setTimeout(() => {
        newSection.style.transition = 'all 0.3s ease';
        newSection.style.opacity = '1';
        newSection.style.transform = 'translateY(0)';
    }, 50);
    
    updateRemoveButtons();
    
    // Scroll vers la nouvelle section
    newSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    showNotification(`Section ${sectionCounter} ajoutée`, 'success');
}

function removeSection(sectionId) {
    const sections = document.querySelectorAll('.course-section');
    
    if (sections.length <= 1) {
        showNotification('Vous devez garder au moins une section', 'warning');
        return;
    }
    
    const section = document.querySelector(`[data-section="${sectionId}"]`);
    if (section) {
        section.style.transition = 'all 0.3s ease';
        section.style.opacity = '0';
        section.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            section.remove();
            updateSectionNumbers();
            updateRemoveButtons();
            showNotification('Section supprimée', 'info');
        }, 300);
    }
}

function updateSectionNumbers() {
    const sections = document.querySelectorAll('.course-section');
    
    sections.forEach((section, index) => {
        const header = section.querySelector('.section-header-item h3');
        if (header) {
            header.textContent = `📖 Section ${index + 1}`;
        }
    });
}

function updateRemoveButtons() {
    const sections = document.querySelectorAll('.course-section');
    const removeButtons = document.querySelectorAll('.btn-remove-section');
    
    removeButtons.forEach(btn => {
        btn.disabled = sections.length <= 1;
    });
}

// ===== VALIDATION DU FORMULAIRE =====
function validateForm() {
    const title = document.getElementById('course-title').value.trim();
    const description = document.getElementById('course-description').value.trim();
    const category = document.getElementById('course-category').value;
    
    if (!title) {
        showNotification('Le titre du cours est obligatoire', 'error');
        document.getElementById('course-title').focus();
        return false;
    }
    
    if (title.length < 5) {
        showNotification('Le titre doit contenir au moins 5 caractères', 'error');
        document.getElementById('course-title').focus();
        return false;
    }
    
    if (!description) {
        showNotification('La description du cours est obligatoire', 'error');
        document.getElementById('course-description').focus();
        return false;
    }
    
    if (description.length < 20) {
        showNotification('La description doit contenir au moins 20 caractères', 'error');
        document.getElementById('course-description').focus();
        return false;
    }
    
    if (!category) {
        showNotification('Veuillez sélectionner une catégorie', 'error');
        document.getElementById('course-category').focus();
        return false;
    }
    
    // Valider les sections
    const sections = document.querySelectorAll('.course-section');
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const title = section.querySelector('input[name="section-title[]"]').value.trim();
        const content = section.querySelector('.editor-content').innerText.trim();
        
        if (!title) {
            showNotification(`Le titre de la section ${i + 1} est obligatoire`, 'error');
            section.querySelector('input[name="section-title[]"]').focus();
            return false;
        }
        
        if (!content) {
            showNotification(`Le contenu de la section ${i + 1} est obligatoire`, 'error');
            section.querySelector('.editor-content').focus();
            return false;
        }
        
        if (content.length < 10) {
            showNotification(`Le contenu de la section ${i + 1} doit contenir au moins 10 caractères`, 'error');
            section.querySelector('.editor-content').focus();
            return false;
        }
    }
    
    return true;
}

// ===== SAUVEGARDE EN BROUILLON =====
async function saveDraft() {
    if (!validateForm()) return;
    
    try {
        const courseData = collectCourseData();
        courseData.status = 'draft';
        
        await saveCourse(courseData);
        
        // Marquer comme sauvegardé
        markAsSaved();
        
        showNotification('Cours sauvegardé en brouillon', 'success');
        
    } catch (error) {
        console.error('Erreur sauvegarde brouillon:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}

// ===== PUBLICATION DU COURS =====
async function publishCourse() {
    if (!validateForm()) return;
    
    // Confirmation personnalisée au lieu du confirm() natif
    showCustomConfirm(
        '🚀 Publier le cours',
        editMode ? 'Êtes-vous sûr de vouloir publier les modifications de ce cours ?' : 'Êtes-vous sûr de vouloir publier ce cours ?',
        'Il sera immédiatement visible par tous les étudiants.',
        async () => {
            try {
                const courseData = collectCourseData();
                courseData.status = 'published';
                courseData.publishedAt = new Date();
                
                const savedCourseId = await saveCourse(courseData);
                
                if (editMode) {
                    showNotification('🎉 Cours modifié et publié avec succès !', 'success');
                } else {
                    showNotification('🎉 Cours publié avec succès !', 'success');
                }
                
                // Marquer comme sauvegardé pour éviter la pop-up de sortie
                markAsSaved();
                
                // Rediriger après 1.5 secondes
                setTimeout(() => {
                    window.location.href = '../admin.html#formations?refresh=true';
                }, 1500);
                
            } catch (error) {
                console.error('Erreur publication:', error);
                showNotification('Erreur lors de la publication', 'error');
            }
        }
    );
}

// ===== COLLECTE DES DONNÉES =====
function collectCourseData() {
    const courseData = {
        title: document.getElementById('course-title').value.trim(),
        description: document.getElementById('course-description').value.trim(),
        category: document.getElementById('course-category').value,
        duration: document.getElementById('course-duration').value.trim() || 'Non spécifié',
        difficulty: selectedDifficulty,
        sections: [],
        createdBy: currentUser?.id || 'formateur',
        createdAt: new Date(),
        updatedAt: new Date(),
        students: 0,
        completion: 0,
    };
    
    // Collecter les sections avec emojis et images
    const sectionElements = document.querySelectorAll('.course-section');
    sectionElements.forEach((section, index) => {
        const title = section.querySelector('input[name="section-title[]"]').value.trim();
        const content = section.querySelector('.editor-content').innerHTML;
        const emoji = section.querySelector('.section-emoji')?.dataset.emoji || '📖';

        // Dans la partie collecte des images, remplacez par :
        const images = [];
        const imageItems = section.querySelectorAll('.image-item');
        imageItems.forEach(imageItem => {
            const img = imageItem.querySelector('img');
            const titleInput = imageItem.querySelector('.image-title-input');
            const descriptionInput = imageItem.querySelector('.image-description-input');
            if (img && img.src) {
                images.push({
                    id: titleInput?.dataset.imageId || `img_${Date.now()}`,
                    src: img.src,
                    firebaseUrl: img.src, // Ajouter pour compatibilité
                    title: titleInput?.value || '',
                    description: descriptionInput?.value || '',
                    alt: img.alt || 'Image de section'
                });
            }
        });

        courseData.sections.push({
            id: index + 1,
            title: title,
            content: content,
            emoji: emoji,
            images: images
        });
    });

    // Ajouter l'emoji du cours
    courseData.emoji = document.getElementById('course-emoji-value')?.value || '🎓';
    
    // Collecter la vidéo finale
    const finalVideoFile = document.getElementById('course-final-video').files[0];
    const youtubeUrl = document.getElementById('course-youtube-url').value.trim();
    
    if (finalVideoFile) {
        courseData.finalVideo = {
            type: 'upload',
            hasVideo: true,
            videoFile: finalVideoFile
        };
    } else if (youtubeUrl) {
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (videoId) {
            courseData.finalVideo = {
                type: 'youtube',
                hasVideo: true,
                youtubeUrl: youtubeUrl,
                videoId: videoId
            };
        }
    }
    
    // Gérer l'ordre du cours
    if (editMode && editingCourseId) {
        // Mode édition : préserver l'ordre existant (ne pas ajouter de champ order)
        console.log('Mode édition : ordre préservé');
    } else {
        // Nouveau cours : sera géré dans saveCourse()
        courseData.order = 1; // Valeur temporaire
    }


    return courseData;
}

// ===== SAUVEGARDE DANS FIREBASE =====
async function saveCourse(courseData) {
    try {
        let db = null;
        
        if (typeof firebaseDb !== 'undefined') {
            db = firebaseDb;
            console.log('🔥 Firebase initialisé localement');
        } else if (typeof firebase !== 'undefined') {
            db = firebase.firestore();
            console.log('🔥 Firebase initialisé depuis firebase global');
        } else {
            throw new Error('Firebase non chargé');
        }
        
        if (db) {
            let docRef;
            
            if (editMode && editingCourseId) {
                // Mode édition - mettre à jour le cours existant SANS changer l'ordre
                const updateData = { ...courseData };
                delete updateData.order; // Supprimer le champ order pour préserver l'existant

                docRef = db.collection('cours').doc(editingCourseId);
                await docRef.update({
                    ...updateData,
                    updatedAt: new Date()
                });
                console.log('📚 Cours mis à jour avec ID:', editingCourseId);
                
                return editingCourseId;
            } else {
                // Mode création - créer un nouveau cours avec le bon ordre
                courseData.order = await getNextOrderForLevel(courseData.difficulty || 1);
                
                docRef = await db.collection('cours').add(courseData);
                console.log('📚 Cours créé avec ID:', docRef.id);
                
                return docRef.id;
            }
        } else {
            throw new Error('Firestore non disponible');
        }
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde cours:', error);
        showNotification('❌ Erreur lors de la sauvegarde', 'error');
        throw error;
    }
}

// ===== RÉCUPÉRER LE PROCHAIN ORDRE POUR UN NIVEAU =====
async function getNextOrderForLevel(difficulty) {
    try {
        if (typeof firebaseDb === 'undefined') {
            return 1; // Mode dev
        }
        
        const coursesSnapshot = await firebaseDb.collection('cours')
            .where('difficulty', '==', difficulty)
            .where('status', '==', 'published')
            .orderBy('order', 'desc')
            .limit(1)
            .get();
        
        if (coursesSnapshot.empty) {
            return 1; // Premier cours de ce niveau
        }
        
        const lastCourse = coursesSnapshot.docs[0].data();
        return (lastCourse.order || 0) + 1;
        
    } catch (error) {
        console.error('Erreur récupération ordre:', error);
        return 1;
    }
}


// ===== UPLOAD VIDÉO =====
async function uploadVideo(file, courseTitle, sectionNumber) {
    if (typeof firebase === 'undefined' || !firebase.storage) {
        console.log('📁 Upload vidéo simulé (mode dev)');
        return `https://example.com/videos/${courseTitle}_section${sectionNumber}.mp4`;
    }
    
    const storage = firebase.storage();
    const fileName = `courses/${courseTitle}/section_${sectionNumber}_${Date.now()}.${file.name.split('.').pop()}`;
    const storageRef = storage.ref(fileName);
    
    return new Promise((resolve, reject) => {
        const uploadTask = storageRef.put(file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload vidéo section ${sectionNumber}: ${progress.toFixed(1)}%`);
            },
            (error) => {
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}


function goToFormations() {
    window.location.href = '../admin.html#formations?refresh=true';
}


// ===== NAVIGATION =====
function goBack() {
    const hasUnsavedChanges = checkUnsavedChanges();
    
    if (hasUnsavedChanges) {
        if (confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')) {
            window.location.href = '../admin.html#formations?refresh=true';
        }
    } else {
        window.location.href = '../admin.html#formations?refresh=true';
    }
}

function checkUnsavedChanges() {
    // Si déjà marqué comme sauvegardé, pas de changements non sauvegardés
    if (isSaved) return false;
    
    const title = document.getElementById('course-title').value.trim();
    const description = document.getElementById('course-description').value.trim();
    
    if (title || description) {
        return true;
    }
    
    const sections = document.querySelectorAll('.course-section');
    for (let section of sections) {
        const sectionTitle = section.querySelector('input[name="section-title[]"]').value.trim();
        const sectionContent = section.querySelector('.editor-content').innerText.trim();
        
        if (sectionTitle || sectionContent) {
            return true;
        }
    }
    
    return false;
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
    setTimeout(() => toast.classList.add('show'), 100);
    
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

// ===== GESTION EMOJIS AVEC API =====
let emojiData = null;

async function loadEmojisFromAPI() {
    try {
        // Utiliser l'API gratuite d'emojis
        const response = await fetch('https://emoji-api.com/emojis?access_key=YOUR_KEY');
        if (!response.ok) {
            // Fallback vers une liste locale étendue
            return getLocalEmojisList();
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.log('API emojis non disponible, utilisation de la liste locale');
        return getLocalEmojisList();
    }
}

function getLocalEmojisList() {
    return {
        education: ['🎓', '📚', '📖', '📝', '✏️', '🖊️', '📄', '📋', '🧑‍🎓', '👨‍🏫', '👩‍🏫', '📐', '📏', '🖍️', '📑', '📊'],
        finance: ['💰', '💎', '🪙', '💳', '🏦', '📈', '📊', '📉', '💸', '💵', '💴', '💶', '💷', '🔢', '🧮', '💲'],
        technology: ['💻', '⚙️', '🔧', '🔐', '🛡️', '🌐', '🔗', '🚀', '🖥️', '📱', '⌨️', '🖱️', '💾', '💿', '📀', '🔌'],
        business: ['🎯', '🏆', '⚡', '🔥', '💡', '🌟', '✨', '📊', '📈', '📉', '💼', '🤝', '📋', '📌', '📍', '🎨'],
        crypto: ['₿', '💰', '🪙', '💎', '🔗', '🌐', '🔐', '🛡️', '📈', '📊', '💸', '⚡', '🚀', '🎯', '🔥', '💡']
    };
}

function initializeEmojiSelectors() {
    // Charger les emojis au démarrage
    loadEmojisFromAPI().then(emojis => {
        emojiData = emojis;
    });
    
    // Gestion des clics pour les emojis
    document.addEventListener('click', function(e) {
        // Ne pas fermer si on clique dans le picker
        if (e.target.closest('#emoji-picker')) {
            e.stopPropagation();
            return;
        }
        
        // Clic sur l'emoji du cours
        if (e.target.closest('.emoji-preview') || e.target.id === 'course-emoji') {
            e.stopPropagation();
            showEmojiPicker('course');
            return;
        }
        
        // Clic sur emoji de section
        if (e.target.classList.contains('section-emoji')) {
            e.stopPropagation();
            const sectionId = e.target.dataset.section;
            showEmojiPicker('section', sectionId, e.target);
            return;
        }
        
        // Fermer les pickers si clic ailleurs
        closeEmojiPicker();
    });
}


function showEmojiPicker(type, sectionId = null, targetElement = null) {
    // Fermer tout picker existant
    closeEmojiPicker();
    
    const emojis = emojiData || getLocalEmojisList();
    
    // Créer le picker
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.id = 'emoji-picker';
    
    let categoriesHTML = '';
    for (const [category, emojiList] of Object.entries(emojis)) {
        categoriesHTML += `
            <div class="emoji-category">
                <h4>${getCategoryTitle(category)}</h4>
                <div class="emoji-grid-category">
                    ${emojiList.map(emoji => `
                        <span class="emoji-option" data-emoji="${emoji}" onclick="selectEmoji('${emoji}', '${type}', ${sectionId})">${emoji}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    picker.innerHTML = `
        <div class="emoji-picker-header">
            <h3>Choisir un emoji</h3>
            <button class="emoji-picker-close" onclick="closeEmojiPicker()">✕</button>
        </div>
        <div class="emoji-picker-search">
            <input type="text" placeholder="Rechercher un emoji..." onkeyup="filterEmojis(this.value)">
        </div>
        <div class="emoji-picker-content">
            ${categoriesHTML}
        </div>
    `;
    
    // Positionner le picker
    if (type === 'course') {
        const courseEmoji = document.getElementById('course-emoji');
        const rect = courseEmoji.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.top = (rect.bottom + 10) + 'px';
        picker.style.left = rect.left + 'px';
    } else if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.top = (rect.bottom + 10) + 'px';
        picker.style.left = rect.left + 'px';
    }
    
    document.body.appendChild(picker);
    
    // Animation d'apparition
    setTimeout(() => picker.classList.add('show'), 10);
}

function getCategoryTitle(category) {
    const titles = {
        education: '🎓 Éducation',
        finance: '💰 Finance',
        technology: '⚙️ Technologie', 
        business: '🎯 Business',
        crypto: '₿ Crypto'
    };
    return titles[category] || category;
}

function selectEmoji(emoji, type, sectionId) {
    if (type === 'course') {
        document.getElementById('course-emoji').textContent = emoji;
        document.getElementById('course-emoji-value').value = emoji;
        showNotification(`Emoji du cours: ${emoji}`, 'success');
    } else if (type === 'section' && sectionId) {
        const sectionEmoji = document.querySelector(`[data-section="${sectionId}"] .section-emoji`);
        if (sectionEmoji) {
            sectionEmoji.textContent = emoji;
            sectionEmoji.dataset.emoji = emoji;
            showNotification(`Emoji de section: ${emoji}`, 'success');
        }
    }
    
    closeEmojiPicker();
}

function closeEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (picker) {
        picker.classList.remove('show');
        setTimeout(() => picker.remove(), 300);
    }
}

function filterEmojis(searchTerm) {
    const options = document.querySelectorAll('.emoji-option');
    options.forEach(option => {
        const emoji = option.dataset.emoji;
        if (emoji.includes(searchTerm) || searchTerm === '') {
            option.style.display = 'inline-block';
        } else {
            option.style.display = 'none';
        }
    });
}

// Exposer les fonctions
window.selectEmoji = selectEmoji;
window.closeEmojiPicker = closeEmojiPicker;
window.filterEmojis = filterEmojis;



function suggestEmojiFromTitle() {
    const title = document.getElementById('course-title').value.toLowerCase();
    
    const emojiSuggestions = {
        'introduction': '🎓',
        'debutant': '🌱',
        'avance': '🚀',
        'trading': '📈',
        'crypto': '💰',
        'bitcoin': '₿',
        'blockchain': '🔗',
        'nft': '🎨',
        'defi': '🏦',
        'wallet': '👛',
        'securite': '🔐',
        'analyse': '📊',
        'technique': '⚙️',
        'strategie': '🎯',
        'investissement': '💎',
        'portfolio': '📋',
        'risque': '⚠️',
        'profit': '💸'
    };
    
    let suggestedEmoji = '🎓'; // Par défaut
    
    for (const [keyword, emoji] of Object.entries(emojiSuggestions)) {
        if (title.includes(keyword)) {
            suggestedEmoji = emoji;
            break;
        }
    }
    
    document.getElementById('course-emoji').textContent = suggestedEmoji;
    document.getElementById('course-emoji-value').value = suggestedEmoji;
    
    showNotification(`Emoji suggéré: ${suggestedEmoji}`, 'success');
}

// ===== GESTION IMAGES AVEC COMPRESSION =====
function addImage(sectionId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async function(e) {
        const files = e.target.files;
        const container = document.querySelector(`[data-section="${sectionId}"] .images-list`);
        
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Image trop volumineuse (max 5MB)', 'error');
                continue;
            }
            
            if (!file.type.startsWith('image/')) {
                showNotification('Seules les images sont autorisées', 'error');
                continue;
            }
            
            try {
                // Afficher le loader pendant la compression
                showNotification('🔄 Compression de l\'image...', 'info');
                
                // Compresser l'image
                const compressedBlob = await compressImage(file, 800, 0.8);
                const originalSize = file.size;
                const compressedSize = compressedBlob.size;
                const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
                
                console.log(`📸 Image compressée: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${savings}% d'économie)`);
                
                const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                imageItem.dataset.imageId = imageId;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    imageItem.innerHTML = `
                        <div class="image-preview">
                            <img src="${e.target.result}" alt="Image de section">
                            <div class="image-overlay">
                                <button type="button" class="btn-remove-image" onclick="removeImage(this)">🗑️</button>
                            </div>
                        </div>
                        <div class="image-details">
                            <div class="image-field">
                                <label>Titre de l'image</label>
                                <input type="text" class="image-title-input" placeholder="Ex: Graphique Bitcoin" 
                                       data-image-id="${imageId}" onchange="updateImageTitle(this)">
                            </div>
                            <div class="image-field">
                                <label>Description (optionnelle)</label>
                                <textarea class="image-description-input" placeholder="Décrivez cette image..." 
                                          data-image-id="${imageId}" onchange="updateImageDescription(this)" rows="2"></textarea>
                            </div>
                            <div class="compression-info">
                                <small style="color: #00ff88;">
                                    📸 Compressée: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (-${savings}%)
                                </small>
                            </div>
                        </div>
                    `;
                    
                    // Stocker les données de l'image avec le blob compressé
                    imageItem.imageData = {
                        id: imageId,
                        src: e.target.result,
                        file: compressedBlob,
                        title: '',
                        description: '',
                        originalSize: originalSize,
                        compressedSize: compressedSize
                    };
                };
                reader.readAsDataURL(compressedBlob);
                
                container.appendChild(imageItem);
                showNotification(`✅ Image compressée (-${savings}%)`, 'success');
                
            } catch (error) {
                console.error('❌ Erreur compression:', error);
                showNotification('❌ Erreur lors de la compression', 'error');
            }
        }
        
        updateAddImageButton(sectionId);
    };
    
    input.click();
}

function updateImageTitle(input) {
    const imageId = input.dataset.imageId;
    const title = input.value.trim();
    const imageItem = input.closest('.image-item');
    
    if (imageItem && imageItem.imageData) {
        imageItem.imageData.title = title;
    }
    
    console.log(`Titre mis à jour pour ${imageId}: ${title}`);
}

function updateImageDescription(textarea) {
    const imageId = textarea.dataset.imageId;
    const description = textarea.value.trim();
    const imageItem = textarea.closest('.image-item');
    
    if (imageItem && imageItem.imageData) {
        imageItem.imageData.description = description;
    }
    
    console.log(`Description mise à jour pour ${imageId}: ${description}`);
}

// Exposer la nouvelle fonction
window.updateImageDescription = updateImageDescription;


// ===== SAUVEGARDE IMAGES DANS FIREBASE STORAGE =====
async function saveImageToFirebase(imageData, courseId, sectionIndex, imageIndex) {
    try {
        if (typeof firebase === 'undefined' || !firebase.storage) {
            console.log('📁 Sauvegarde image simulée (mode dev)');
            return imageData.src; // Retourner l'URL locale en mode dev
        }
        
        const storage = firebase.storage();
        
        // Convertir base64 en blob
        const response = await fetch(imageData.src);
        const blob = await response.blob();
        
        // Créer le chemin de stockage
        const fileName = `courses/${courseId}/section_${sectionIndex}/image_${imageIndex}_${Date.now()}.jpg`;
        const storageRef = storage.ref(fileName);
        
        // Upload
        const uploadTask = await storageRef.put(blob);
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        console.log('✅ Image sauvegardée:', downloadURL);
        return downloadURL;
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde image:', error);
        return imageData.src; // Fallback vers l'URL locale
    }
}



function updateImageTitle(input) {
    const imageId = input.dataset.imageId;
    const title = input.value.trim();
    const imageItem = input.closest('.image-item');
    
    if (imageItem && imageItem.imageData) {
        imageItem.imageData.title = title;
    }
    
    console.log(`Titre mis à jour pour ${imageId}: ${title}`);
}

function updateAddImageButton(sectionId) {
    const container = document.querySelector(`[data-section="${sectionId}"] .images-container`);
    const imagesList = container.querySelector('.images-list');
    const addButton = container.querySelector('.btn-add-image');
    
    if (imagesList.children.length > 0) {
        addButton.textContent = '📷 Ajouter une autre image';
        addButton.classList.add('has-images');
    } else {
        addButton.textContent = '📷 Ajouter une image';
        addButton.classList.remove('has-images');
    }
}

function removeImage(button) {
    const imageItem = button.closest('.image-item');
    const sectionContainer = button.closest('[data-section]');
    const sectionId = sectionContainer.dataset.section;
    
    imageItem.style.opacity = '0';
    setTimeout(() => {
        imageItem.remove();
        updateAddImageButton(sectionId);
    }, 300);
}

// Exposer les nouvelles fonctions
window.suggestEmojiFromTitle = suggestEmojiFromTitle;
window.addImage = addImage;
window.removeImage = removeImage;

// ===== FONCTIONS DE REQUÊTE =====
async function getCoursesByDifficulty(difficulty) {
    try {
        const coursesSnapshot = await firebaseDb.collection('cours')
            .where('difficulty', '==', difficulty)
            .where('status', '==', 'published')
            .get();
        
        return coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Erreur récupération cours:', error);
        return [];
    }
}

async function getCoursesByCategory(category) {
    try {
        const coursesSnapshot = await firebaseDb.collection('cours')
            .where('category', '==', category)
            .where('status', '==', 'published')
            .get();
        
        return coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Erreur récupération cours:', error);
        return [];
    }
}

async function getAllPublishedCourses() {
    try {
        const coursesSnapshot = await firebaseDb.collection('cours')
            .where('status', '==', 'published')
            .orderBy('createdAt', 'desc')
            .get();
        
        return coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Erreur récupération cours:', error);
        return [];
    }
}

// ===== GESTION ÉTAT SAUVEGARDE =====
let isSaved = false;

function markAsSaved() {
    isSaved = true;
}

function markAsUnsaved() {
    isSaved = false;
}

// ===== CONFIRMATION PERSONNALISÉE =====
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
        <div class="confirm-icon" style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
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
                background: linear-gradient(45deg, #ff8800, #ff6b35);
                color: #ffffff;
                border: none;
                padding: 0.8rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            ">🚀 Publier</button>
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
            box-shadow: 0 5px 15px rgba(255, 136, 0, 0.3);
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

// ===== EXPOSITION GLOBALE =====
window.addSection = addSection;
window.removeSection = removeSection;
window.saveDraft = saveDraft;
window.publishCourse = publishCourse;
window.goBack = goBack;
window.goToFormations = goToFormations;
window.showNotification = showNotification;
window.closeToast = closeToast;
window.removeYouTubeVideo = removeYouTubeVideo;

// ===== PRÉVENTION PERTE DE DONNÉES =====
window.addEventListener('beforeunload', function(e) {
    if (checkUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées.';
        return 'Vous avez des modifications non sauvegardées.';
    }
});

console.log('✅ Script de création de cours initialisé');