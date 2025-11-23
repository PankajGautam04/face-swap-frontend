// app.js — corrected endpoints for image and video swap backends
let sourceImageFile = null,
    targetImageFile = null,
    sourceVideoFile = null,
    targetVideoFile = null;
let targetFaces = [],
    selectedFaceIndex = null,
    resultImage = null,
    resultVideo = null;
let loading = false,
    error = null,
    isDarkMode = false,
    showFaceSelection = false,
    activeTab = 'image',
    isMenuOpen = false;

// DOM refs
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const menuToggle = document.getElementById('menu-toggle');
const navbarLinks = document.querySelector('.navbar-links');
const imageTab = document.getElementById('image-tab');
const videoTab = document.getElementById('video-tab');
const swapForm = document.getElementById('swap-form');
const sourceUpload = document.getElementById('source-upload');
const targetUpload = document.getElementById('target-upload');
const sourcePreview = document.getElementById('source-preview');
const targetPreview = document.getElementById('target-preview');
const sourceLabel = document.getElementById('source-label');
const targetLabel = document.getElementById('target-label');
const faceSelection = document.getElementById('face-selection');
const faceContainer = document.getElementById('face-container');
const swapButton = document.getElementById('swap-button');
const resultSection = document.getElementById('result-section');
const resultContainer = document.getElementById('result-container');
const downloadLink = document.getElementById('download-link');
const errorMessage = document.getElementById('error-message');
const loadingOverlay = document.getElementById('loading-overlay');

// Backend endpoints (corrected)
const IMAGE_SWAP_ENDPOINT = 'https://face-swap-api-7fb0.onrender.com/swap-faces/';
const VIDEO_SWAP_ENDPOINT = 'https://face-swap-video-backend.onrender.com/swap-faces-video/';
const FACE_DETECT_ENDPOINT = 'https://face-detection-pkw8.onrender.com/detect-faces/';

function toggleTheme() {
    isDarkMode = !isDarkMode;
    body.classList.toggle('dark-mode');
    themeToggle.title = `Switch to ${isDarkMode ? 'Bright' : 'Dark'} Mode`;
    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-moon', !isDarkMode);
        icon.classList.toggle('fa-sun', isDarkMode);
    }
}

function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    navbarLinks.classList.toggle('active');
    const icon = menuToggle.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-bars', !isMenuOpen);
        icon.classList.toggle('fa-times', isMenuOpen);
    }
}

function renameFile(file, newName, isImage) {
    return new File([file], newName, { type: isImage ? 'image/jpeg' : file.type });
}

function setError(msg) {
    error = msg;
    if (msg) {
        errorMessage.classList.remove('hidden');
        const span = errorMessage.querySelector('span');
        if (span) span.textContent = msg;
    } else {
        errorMessage.classList.add('hidden');
    }
}

function updateSwapButton() {
    const hasFiles = activeTab === 'image' ? (sourceImageFile && targetImageFile) : (sourceImageFile && targetVideoFile);
    const needsFaceSelection = (activeTab === 'image' && targetFaces.length > 1);

    swapButton.disabled = loading || !hasFiles || (needsFaceSelection && selectedFaceIndex === null);
    swapButton.classList.toggle('opacity-50', swapButton.disabled);
    swapButton.classList.toggle('cursor-not-allowed', swapButton.disabled);

    if (loading) {
        swapButton.innerHTML = `<div class="flex items-center"><svg class="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</div>`;
        return;
    }

    if (activeTab === 'image') {
        if (targetFaces.length > 1 && selectedFaceIndex === null) {
            swapButton.textContent = "Select a Face";
            return;
        }
        swapButton.textContent = 'Swap Face in Image';
    } else {
        swapButton.textContent = 'Swap Face in Video';
    }
}

function resetState() {
    sourceImageFile = targetImageFile = sourceVideoFile = targetVideoFile = resultImage = resultVideo = null;
    targetFaces = [];
    selectedFaceIndex = null;
    showFaceSelection = false;
    loading = false;
    error = null;

    sourcePreview.innerHTML = `<p class="text-slate-600">Upload image here</p>`;
    targetPreview.innerHTML = `<p class="text-slate-600">Upload ${activeTab === 'image' ? 'image' : 'video'} here</p>`;
    sourceLabel.textContent = `Source Image`;
    targetLabel.textContent = `Target ${activeTab === 'image' ? 'Image' : 'Video'}`;

    sourceUpload.accept = 'image/*';
    targetUpload.accept = activeTab === 'image' ? 'image/*' : 'video/mp4,video/webm';

    if (sourceUpload.nextElementSibling) sourceUpload.nextElementSibling.innerHTML = `<i class="fas fa-upload mr-3"></i>Upload Source Image`;
    if (targetUpload.nextElementSibling) targetUpload.nextElementSibling.innerHTML = `<i class="fas fa-upload mr-3"></i>Upload Target ${activeTab === 'image' ? 'Image' : 'Video'}`;

    faceSelection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    updateSwapButton();
}

function handleSourceChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
        sourceImageFile = null;
        sourcePreview.innerHTML = `<p class="text-slate-600">Upload image here</p>`;
        updateSwapButton();
        return;
    }
    const maxSize = 5_000_000;
    if (file.size > maxSize) {
        setError('Source image too large (max 5MB).');
        sourceImageFile = null;
        sourcePreview.innerHTML = `<p class="text-slate-600">Upload image here</p>`;
        updateSwapButton();
        return;
    }
    const renamed = renameFile(file, 'source.jpg', true);
    sourceImageFile = renamed;
    sourcePreview.innerHTML = `<div class="preview-container"><img src="${URL.createObjectURL(renamed)}" alt="Source Preview" class="rounded-lg shadow-lg"></div>`;
    setError(null);
    updateSwapButton();
}

async function handleTargetChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
        if (activeTab === 'image') targetImageFile = null;
        else targetVideoFile = null;
        targetFaces = [];
        selectedFaceIndex = null;
        faceSelection.classList.add('hidden');
        targetPreview.innerHTML = `<p class="text-slate-600">Upload ${activeTab === 'image' ? 'image' : 'video'} here</p>`;
        updateSwapButton();
        return;
    }
    const maxSize = activeTab === 'image' ? 5_000_000 : 50_000_000;
    if (file.size > maxSize) {
        setError(`${activeTab === 'image' ? 'Target image' : 'Target video'} too large (max ${activeTab === 'image' ? '5MB' : '50MB'}).`);
        if (activeTab === 'image') targetImageFile = null;
        else targetVideoFile = null;
        targetPreview.innerHTML = `<p class="text-slate-600">Upload ${activeTab === 'image' ? 'image' : 'video'} here</p>`;
        updateSwapButton();
        return;
    }

    const renamedFile = renameFile(file, `target.${activeTab === 'image' ? 'jpg' : 'mp4'}`, activeTab === 'image');

    if (activeTab === 'image') {
        targetImageFile = renamedFile;
        targetVideoFile = null;
        targetPreview.innerHTML = `<div class="preview-container"><img src="${URL.createObjectURL(renamedFile)}" alt="Target Preview" class="rounded-lg shadow-lg"></div>`;
        targetFaces = [];
        selectedFaceIndex = null;
        faceSelection.classList.add('hidden');
        setError(null);
        await detectFaces();
    } else {
        // IMPORTANT: do NOT call face detection for video here.
        targetVideoFile = renamedFile;
        targetImageFile = null;
        targetPreview.innerHTML = `<div class="preview-container"><video src="${URL.createObjectURL(renamedFile)}" class="rounded-lg shadow-lg" controls></video></div>`;
        targetFaces = [];
        selectedFaceIndex = null;
        faceSelection.classList.add('hidden');
        setError(null);
    }
    updateSwapButton();
}

async function detectFaces() {
    if (activeTab !== 'image') return false;
    if (!targetImageFile) {
        setError('Please upload a target image.');
        return false;
    }

    loading = true;
    loadingOverlay.classList.remove('hidden');
    setError(null);
    updateSwapButton();

    const formData = new FormData();
    formData.append('target', targetImageFile);

    try {
        const response = await fetch(FACE_DETECT_ENDPOINT, { method: 'POST', body: formData });
        if (!response.ok) {
            let msg = 'Failed to detect faces';
            try { const j = await response.json(); if (j && j.detail) msg = j.detail; } catch (_) {}
            throw new Error(msg);
        }
        const data = await response.json();
        targetFaces = data.faces || [];

        if (!Array.isArray(targetFaces) || targetFaces.length === 0) {
            setError('No faces detected in the target image.');
            return false;
        }

        if (targetFaces.length === 1) {
            selectedFaceIndex = 0;
            faceSelection.classList.add('hidden');
            showFaceSelection = false;
            updateSwapButton();
            return true;
        }

        // multiple faces -> show selection UI
        showFaceSelection = true;
        faceSelection.classList.remove('hidden');
        faceContainer.innerHTML = targetFaces.map((face, i) => `
            <div class="face-box ${selectedFaceIndex === i ? 'selected' : ''}" onclick="handleFaceSelect(${i})">
                <img src="data:image/jpeg;base64,${face.image_base64}" alt="Face ${i + 1}">
                <div class="face-label">Face ${i + 1}</div>
            </div>
        `).join('');
        const h3 = faceSelection.querySelector('h3');
        if (h3) h3.textContent = `Select a Face to Replace (${targetFaces.length} faces detected)`;
        updateSwapButton();
        return false;
    } catch (err) {
        setError('Failed to detect faces: ' + (err.message || err));
        return false;
    } finally {
        loading = false;
        loadingOverlay.classList.add('hidden');
        updateSwapButton();
    }
}

window.handleFaceSelect = function(index) {
    selectedFaceIndex = selectedFaceIndex === index ? null : index;
    const boxes = faceContainer.querySelectorAll('.face-box');
    boxes.forEach((b, i) => b.classList.toggle('selected', i === selectedFaceIndex));
    updateSwapButton();
};

async function handleSubmit(e) {
    e.preventDefault();

    const hasFiles = activeTab === 'image' ? (sourceImageFile && targetImageFile) : (sourceImageFile && targetVideoFile);
    if (!hasFiles) {
        setError(`Please upload both source image and target ${activeTab === 'image' ? 'image' : 'video'}.`);
        return;
    }

    if (activeTab === 'image') {
        if (targetFaces.length === 0) {
            const ok = await detectFaces();
            if (!ok) return;
        }
        if (targetFaces.length > 1 && selectedFaceIndex === null) {
            setError('Please select a face from the target.');
            return;
        }
    } else {
        // video: skip client-side detection. ensure a default face_index for server if needed.
        if (selectedFaceIndex === null) selectedFaceIndex = 0;
    }

    loading = true;
    loadingOverlay.classList.remove('hidden');
    setError(null);
    resultSection.classList.add('hidden');
    updateSwapButton();

    const formData = new FormData();
    formData.append('face_index', selectedFaceIndex || 0);
    formData.append('source', sourceImageFile);
    formData.append('target', activeTab === 'image' ? targetImageFile : targetVideoFile);

    try {
        const endpoint = activeTab === 'image' ? IMAGE_SWAP_ENDPOINT : VIDEO_SWAP_ENDPOINT;
        const response = await fetch(endpoint, { method: 'POST', body: formData });

        if (!response.ok) {
            let msg = `Failed to swap faces in ${activeTab}`;
            try { const j = await response.json(); if (j && j.detail) msg = j.detail; } catch (_) {}
            throw new Error(msg);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (activeTab === 'image') {
            resultImage = url;
            resultVideo = null;
            resultContainer.innerHTML = `<img src="${url}" alt="Swapped Face" class="mx-auto rounded-lg shadow-2xl max-w-full">`;
            downloadLink.download = 'faceswap_result.jpg';
        } else {
            resultVideo = url;
            resultImage = null;
            resultContainer.innerHTML = `<video src="${url}" class="mx-auto rounded-lg shadow-2xl max-w-full" controls></video>`;
            downloadLink.download = 'faceswap_result.mp4';
        }
        downloadLink.href = url;
        resultSection.classList.remove('hidden');
    } catch (err) {
        setError('Failed to swap faces: ' + (err.message || err));
    } finally {
        loading = false;
        loadingOverlay.classList.add('hidden');
        updateSwapButton();
    }
}

// Event listeners
themeToggle && themeToggle.addEventListener('click', toggleTheme);
menuToggle && menuToggle.addEventListener('click', toggleMenu);

imageTab && imageTab.addEventListener('click', () => {
    activeTab = 'image';
    imageTab.classList.add('active');
    videoTab.classList.remove('active');
    videoTab.classList.add('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
    resetState();
});

videoTab && videoTab.addEventListener('click', () => {
    activeTab = 'video';
    videoTab.classList.add('active');
    imageTab.classList.remove('active');
    imageTab.classList.add('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
    resetState();
});

sourceUpload && sourceUpload.addEventListener('change', handleSourceChange);
targetUpload && targetUpload.addEventListener('change', handleTargetChange);
swapForm && swapForm.addEventListener('submit', handleSubmit);

// initialize
resetState();
