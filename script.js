// ==================== GLOBAL VARIABLES ====================
let selectedScale = 4;
let originalImageFile = null;
let upscaledImageUrl = null;

// ==================== SELECT SCALE ====================
function selectScale(scale) {
    selectedScale = scale;
    
    // Update button states
    const buttons = document.querySelectorAll('.scale-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.scale) === scale) {
            btn.classList.add('active');
        }
    });
    
    showToast(`Skala ${scale}X dipilih!`, 'fa-check-circle', '#5eead4');
}

// ==================== HANDLE IMAGE UPLOAD ====================
function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar!', 'fa-exclamation-circle', '#ef4444');
        return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showToast('Ukuran file maksimal 10MB!', 'fa-exclamation-circle', '#ef4444');
        return;
    }
    
    originalImageFile = file;
    
    // Preview original image
    const reader = new FileReader();
    reader.onload = (e) => {
        const originalImg = document.getElementById('originalImage');
        originalImg.src = e.target.result;
        
        // Show preview section
        document.getElementById('previewSection').classList.remove('hidden');
        document.getElementById('processBtn').classList.remove('hidden');
        
        // Reset upscaled section
        document.getElementById('upscaledImage').classList.add('hidden');
        document.getElementById('loadingSpinner').style.display = 'flex';
        document.getElementById('actionButtons').classList.add('hidden');
    };
    reader.readAsDataURL(file);
    
    showToast('Gambar berhasil diupload!', 'fa-check-circle', '#5eead4');
}

// ==================== PROCESS IMAGE ====================
async function processImage() {
    if (!originalImageFile) {
        showToast('Upload gambar terlebih dahulu!', 'fa-exclamation-circle', '#fbbf24');
        return;
    }
    
    const processBtn = document.getElementById('processBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const upscaledImg = document.getElementById('upscaledImage');
    
    // Show loading state
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    loadingSpinner.style.display = 'flex';
    upscaledImg.classList.add('hidden');
    
    showToast('Memproses gambar...', 'fa-hourglass-half', '#60a5fa');
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('image', originalImageFile);
        formData.append('scale', selectedScale);
        
        // Call API
        const response = await fetch('/api/upscale', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Gagal memproses gambar');
        }
        
        // Get image blob
        const blob = await response.blob();
        upscaledImageUrl = URL.createObjectURL(blob);
        
        // Show result with fade in
        upscaledImg.src = upscaledImageUrl;
        upscaledImg.onload = () => {
            loadingSpinner.style.display = 'none';
            upscaledImg.classList.remove('hidden');
            document.getElementById('actionButtons').classList.remove('hidden');
            processBtn.classList.add('hidden');
        };
        
        showToast('Upscale berhasil! ✨', 'fa-check-circle', '#10b981');
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Gagal memproses gambar!', 'fa-exclamation-circle', '#ef4444');
        loadingSpinner.style.display = 'none';
        
    } finally {
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Upscale Sekarang!';
    }
}

// ==================== DOWNLOAD IMAGE ====================
async function downloadImage() {
    if (!upscaledImageUrl) {
        showToast('Belum ada gambar untuk didownload!', 'fa-exclamation-circle', '#fbbf24');
        return;
    }
    
    try {
        showToast('Mendownload gambar...', 'fa-download', '#60a5fa');
        
        // Fetch the blob URL
        const response = await fetch(upscaledImageUrl);
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `upscaled_${selectedScale}x_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Download berhasil! 🎉', 'fa-check-circle', '#10b981');
        
    } catch (error) {
        console.error('Download error:', error);
        showToast('Gagal mendownload gambar!', 'fa-exclamation-circle', '#ef4444');
    }
}

// ==================== RESET UPSCALER ====================
function resetUpscaler() {
    // Reset variables
    originalImageFile = null;
    if (upscaledImageUrl) {
        URL.revokeObjectURL(upscaledImageUrl);
        upscaledImageUrl = null;
    }
    selectedScale = 4;
    
    // Reset UI
    document.getElementById('imageInput').value = '';
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('processBtn').classList.add('hidden');
    document.getElementById('actionButtons').classList.add('hidden');
    
    // Reset scale buttons
    const buttons = document.querySelectorAll('.scale-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.scale === '4') {
            btn.classList.add('active');
        }
    });
    
    showToast('Reset berhasil!', 'fa-rotate-right', '#5eead4');
}

// ==================== SHOW TOAST NOTIFICATION ====================
function showToast(message, icon, color) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set content
    toastIcon.className = `fas ${icon}`;
    toastIcon.style.color = color;
    toastMessage.textContent = message;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== DRAG AND DROP SUPPORT ====================
const uploadArea = document.querySelector('.upload-area');
const uploadContent = document.querySelector('.upload-content');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadContent.style.borderColor = 'rgba(94, 234, 212, 0.7)';
    uploadContent.style.background = 'rgba(20, 184, 166, 0.15)';
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadContent.style.borderColor = 'rgba(94, 234, 212, 0.4)';
    uploadContent.style.background = 'transparent';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadContent.style.borderColor = 'rgba(94, 234, 212, 0.4)';
    uploadContent.style.background = 'transparent';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        document.getElementById('imageInput').files = files;
        handleImageUpload({ target: { files: [files[0]] } });
    }
});

// ==================== PREVENT DEFAULT DROP ON DOCUMENT ====================
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});