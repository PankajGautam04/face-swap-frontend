let sourceImageFile = null, targetImageFile = null, sourceVideoFile = null, targetVideoFile = null;
let targetFaces = [], selectedFaceIndex = null, resultImage = null, resultVideo = null;
let loading = false, error = null, isDarkMode = false, showFaceSelection = false, activeTab = 'image', isMenuOpen = false;

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

// API Endpoints
const API_ENDPOINTS = {
    IMAGE_SWAP: 'https://face-swap-api-7fb0.onrender.com/swap-faces/',
    VIDEO_SWAP: 'https://face-swap-video-backend.onrender.com/swap-video/',
    FACE_DETECTION: 'https://face-detection-pkw8.onrender.com/detect-faces/'
};

function toggleTheme() {
    isDarkMode = !isDarkMode;
    body.classList.toggle('dark-mode');
    themeToggle.title = `Switch to ${isDarkMode ? 'Bright' : 'Dark'} Mode`;
    themeToggle.querySelector('i').classList.toggle('fa-moon', !isDarkMode);
    themeToggle.querySelector('i').classList.toggle('fa-sun', isDarkMode);
}

function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    navbarLinks.classList.toggle('active');
    menuToggle.querySelector('i').classList.toggle('fa-bars', !isMenuOpen);
    menuToggle.querySelector('i').classList.toggle('fa-times', isMenuOpen);
}

function resetState() {
    sourceImageFile = targetImageFile = sourceVideoFile = targetVideoFile = resultImage = resultVideo = null;
    targetFaces = [];
    selectedFaceIndex = null;
    showFaceSelection = loading = false;
    error = null;
    sourcePreview.innerHTML = `<p class="text-slate-600">Upload image here</p>`;
    targetPreview.innerHTML = `<p class="text-slate-600">Upload ${activeTab === 'image' ? 'image' : 'video'} here</p>`;
    sourceLabel.textContent = `Source Image`;
    targetLabel.textContent = `Target ${activeTab === 'image' ? 'Image' : 'Video'}`;
    sourceUpload.accept = 'image/*';
    targetUpload.accept = activeTab === 'image' ? 'image/*' : 'video/mp4,video/webm';
    sourceUpload.nextElementSibling.innerHTML = `<i class="fas fa-upload mr-3"></i>Upload Source Image`;
    targetUpload.nextElementSibling.innerHTML = `<i class="fas fa-upload mr-3"></i>Upload Target ${activeTab === 'image' ? 'Image' : 'Video'}`;
    faceSelection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorMessage.classList.add('hidden');
    updateSwapButton();
}

function renameFile(file, newName, isImage) {
    return new File([file], newName, { type: isImage ? 'image/jpeg' : file.type });
}

function handleSourceChange(e) {
    const file = e.target.files[0];
    if (!file) {
        sourceImageFile = null;
        sourceVideoFile = null;
        sourcePreview.innerHTML = `<p class="text-slate-600">Upload image here</p>`;
        updateSwapButton();
        return;
    }
    const maxSize = 10_000_000; // 10MB for source image
    if (file.size > maxSize) {
        setError(`Source image too large (max 10MB).`);
        sourceImageFile = null;
        sourceVideoFile = null;
        sourcePreview.innerHTML = `<p class="text-slate-600">Upload image here</p>`;
        return;
    }
    const renamedFile = renameFile(file, `source.jpg`, true);
    sourceImageFile = renamedFile;
    sourceVideoFile = null;
    sourcePreview.innerHTML = `<div class="preview-container"><img src="${URL.createObjectURL(renamedFile)}" alt="Source Preview" class="rounded-lg shadow-lg"></div>`;
    setError(null);
    updateSwapButton();
}

function handleTargetChange(e) {
    const file = e.target.files[0];
    if (!file) {
        if (activeTab === 'image') targetImageFile = null;
        else targetVideoFile = null;
        targetFaces = [];
        selectedFaceIndex = null;
        showFaceSelection = false;
        faceSelection.classList.add('hidden');
        targetPreview.innerHTML = `<p class="text-slate-600">Upload ${activeTab === 'image' ? 'image' : 'video'} here</p>`;
        updateSwapButton();
        return;
    }
    const maxSize = activeTab === 'image' ? 10_000_000 : 100_000_000; // 10MB for image, 100MB for video
    if (file.size > maxSize) {
        setError(`${activeTab === 'image' ? 'Target image' : 'Target video'} too large (max ${activeTab === 'image' ? '10MB' : '100MB'}).`);
        if (activeTab === 'image') targetImageFile = null;
        else targetVideoFile = null;
        targetPreview.innerHTML = `<p class="text-slate-600">Upload ${activeTab === 'image' ? 'image' : 'video'} here</p>`;
        return;
    }
    
    const renamedFile = renameFile(file, `target.${activeTab === 'image' ? 'jpg' : 'mp4'}`, activeTab === 'image');
    
    if (activeTab === 'image') {
        targetImageFile = renamedFile;
        targetVideoFile = null;
        targetPreview.innerHTML = `<div class="preview-container"><img src="${URL.createObjectURL(renamedFile)}" alt="Target Preview" class="rounded-lg shadow-lg"></div>`;
        // Only detect faces for image mode
        detectFaces();
    } else {
        // Video mode - skip face detection
        targetVideoFile = renamedFile;
        targetImageFile = null;
        targetPreview.innerHTML = `<div class="preview-container"><video src="${URL.createObjectURL(renamedFile)}" class="rounded-lg shadow-lg" controls></video>`;
        // Reset face-related state for video
        targetFaces = [];
        selectedFaceIndex = null;
        showFaceSelection = false;
        faceSelection.classList.add('hidden');
    }
    
    setError(null);
    updateSwapButton();
}

async function detectFaces() {
    // Only run face detection for image mode
    if (activeTab !== 'image' || !targetImageFile) {
        return false;
    }
    
    loading = true;
    loadingOverlay.classList.remove('hidden');
    setError(null);
    
    const formData = new FormData();
    formData.append("target", targetImageFile);
    
    try {
        const response = await fetch(API_ENDPOINTS.FACE_DETECTION, { 
            method: "POST", 
            body: formData 
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Failed to detect faces" }));
            throw new Error(errorData.detail || "Failed to detect faces");
        }
        
        const data = await response.json();
        targetFaces = data.faces;
        
        if (targetFaces.length === 0) {
            setError("No faces detected in the target image. Please upload an image with visible faces.");
            return false;
        } else if (targetFaces.length === 1) {
            selectedFaceIndex = 0;
            showFaceSelection = false;
            faceSelection.classList.add('hidden');
            updateSwapButton();
            return true;
        } else {
            showFaceSelection = true;
            faceSelection.classList.remove('hidden');
            faceContainer.innerHTML = targetFaces.map((face, index) => `
                <div class="face-box ${selectedFaceIndex === index ? 'selected' : ''}" onclick="handleFaceSelect(${index})">
                    <img src="data:image/jpeg;base64,${face.image_base64}" alt="Face ${index + 1}">
                    <div class="face-label">Face ${index + 1}</div>
                </div>
            `).join('');
            faceSelection.querySelector('h3').textContent = `Select a Face to Replace (${targetFaces.length} faces detected)`;
            updateSwapButton();
            return false;
        }
    } catch (err) {
        setError("Failed to detect faces: " + err.message);
        return false;
    } finally {
        loading = false;
        loadingOverlay.classList.add('hidden');
    }
}

window.handleFaceSelect = function(index) {
    selectedFaceIndex = selectedFaceIndex === index ? null : index;
    const faceBoxes = faceContainer.querySelectorAll('.face-box');
    faceBoxes.forEach((box, i) => box.classList.toggle('selected', i === selectedFaceIndex));
    updateSwapButton();
};

function updateSwapButton() {
    const hasFiles = activeTab === 'image' 
        ? (sourceImageFile && targetImageFile) 
        : (sourceImageFile && targetVideoFile);
    
    // For video mode, only check if files are uploaded
    // For image mode, also check face selection
    const canSwap = activeTab === 'video' 
        ? hasFiles 
        : (hasFiles && (targetFaces.length === 0 || targetFaces.length === 1 || selectedFaceIndex !== null));
    
    swapButton.disabled = loading || !canSwap;
    swapButton.classList.toggle('opacity-50', swapButton.disabled);
    swapButton.classList.toggle('cursor-not-allowed', swapButton.disabled);
    
    if (loading) {
        swapButton.innerHTML = `<div class="flex items-center justify-center"><svg class="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</div>`;
    } else if (activeTab === 'image' && targetFaces.length > 1 && selectedFaceIndex === null) {
        swapButton.textContent = "Select a Face";
    } else {
        swapButton.textContent = `Swap Face in ${activeTab === 'image' ? 'Image' : 'Video'}`;
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const hasFiles = activeTab === 'image' 
        ? (sourceImageFile && targetImageFile) 
        : (sourceImageFile && targetVideoFile);
    
    if (!hasFiles) {
        setError(`Please upload both source image and target ${activeTab === 'image' ? 'image' : 'video'}.`);
        return;
    }
    
    // Only check face detection for image mode
    if (activeTab === 'image') {
        if (targetFaces.length === 0) {
            const canProceed = await detectFaces();
            if (!canProceed) return;
        }
        if (targetFaces.length > 1 && selectedFaceIndex === null) {
            setError("Please select a face from the target image.");
            return;
        }
    }
    
    loading = true;
    loadingOverlay.classList.remove('hidden');
    setError(null);
    resultSection.classList.add('hidden');
    
    const formData = new FormData();
    
    if (activeTab === 'image') {
        // Image swap: requires face_index, source, and target
        formData.append("face_index", selectedFaceIndex || 0);
        formData.append("source", sourceImageFile);
        formData.append("target", targetImageFile);
    } else {
        // Video swap: requires source_image and target_video (NO face_index)
        formData.append("source_image", sourceImageFile);
        formData.append("target_video", targetVideoFile);
    }
    
    try {
        const endpoint = activeTab === 'image' 
            ? API_ENDPOINTS.IMAGE_SWAP 
            : API_ENDPOINTS.VIDEO_SWAP;
        
        console.log(`Sending request to: ${endpoint}`);
        
        const response = await fetch(endpoint, { 
            method: "POST", 
            body: formData 
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                detail: `Failed to swap faces in ${activeTab}` 
            }));
            throw new Error(errorData.detail || `Failed to swap faces in ${activeTab}`);
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error("Received empty response from server");
        }
        
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
        
        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
    } catch (err) {
        console.error("Face swap error:", err);
        setError("Failed to swap faces: " + err.message);
    } finally {
        loading = false;
        loadingOverlay.classList.add('hidden');
        updateSwapButton();
    }
}

function setError(msg) {
    error = msg;
    errorMessage.classList.toggle('hidden', !msg);
    if (msg) errorMessage.querySelector('span').textContent = msg;
}

// Event Listeners
themeToggle.addEventListener('click', toggleTheme);
menuToggle.addEventListener('click', toggleMenu);

imageTab.addEventListener('click', () => {
    if (activeTab === 'image') return;
    activeTab = 'image';
    imageTab.classList.add('active');
    imageTab.classList.remove('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
    videoTab.classList.remove('active');
    videoTab.classList.add('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
    resetState();
});

videoTab.addEventListener('click', () => {
    if (activeTab === 'video') return;
    activeTab = 'video';
    videoTab.classList.add('active');
    videoTab.classList.remove('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
    imageTab.classList.remove('active');
    imageTab.classList.add('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
    resetState();
});

sourceUpload.addEventListener('change', handleSourceChange);
targetUpload.addEventListener('change', handleTargetChange);
swapForm.addEventListener('submit', handleSubmit);

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (isMenuOpen && !navbarLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        toggleMenu();
    }
});

// Initialize
resetState();
