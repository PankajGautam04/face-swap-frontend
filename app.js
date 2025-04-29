(function () {
    function App() {
        const [sourceImageFile, setSourceImageFile] = React.useState(null);
        const [targetImageFile, setTargetImageFile] = React.useState(null);
        const [sourceVideoFile, setSourceVideoFile] = React.useState(null);
        const [targetVideoFile, setTargetVideoFile] = React.useState(null);
        const [targetFaces, setTargetFaces] = React.useState([]);
        const [selectedFaceIndex, setSelectedFaceIndex] = React.useState(null);
        const [resultImage, setResultImage] = React.useState(null);
        const [resultVideo, setResultVideo] = React.useState(null);
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState(null);
        const [isDarkMode, setIsDarkMode] = React.useState(false);
        const [showFaceSelection, setShowFaceSelection] = React.useState(false);
        const [activeTab, setActiveTab] = React.useState('image');
        const [isMenuOpen, setIsMenuOpen] = React.useState(false);

        // Theme toggle
        const toggleTheme = () => {
            setIsDarkMode(!isDarkMode);
        };

        // Toggle mobile menu
        const toggleMenu = () => {
            setIsMenuOpen(!isMenuOpen);
        };

        // Reset states when activeTab changes
        React.useEffect(() => {
            console.log('Switching tab to:', activeTab);
            setSourceImageFile(null);
            setTargetImageFile(null);
            setSourceVideoFile(null);
            setTargetVideoFile(null);
            setTargetFaces([]);
            setSelectedFaceIndex(null);
            setShowFaceSelection(false);
            setResultImage(null);
            setResultVideo(null);
            setError(null);
            setLoading(false);
            console.log('States reset for tab:', activeTab);
        }, [activeTab]);

        // Cleanup object URLs to prevent memory leaks
        React.useEffect(() => {
            return () => {
                if (sourceImageFile) URL.revokeObjectURL(URL.createObjectURL(sourceImageFile));
                if (targetImageFile) URL.revokeObjectURL(URL.createObjectURL(targetImageFile));
                if (sourceVideoFile) URL.revokeObjectURL(URL.createObjectURL(sourceVideoFile));
                if (targetVideoFile) URL.revokeObjectURL(URL.createObjectURL(targetVideoFile));
                if (resultImage) URL.revokeObjectURL(resultImage);
                if (resultVideo) URL.revokeObjectURL(resultVideo);
            };
        }, [sourceImageFile, targetImageFile, sourceVideoFile, targetVideoFile, resultImage, resultVideo]);

        // Rename and convert file to .jpg for images or keep video format
        const renameFile = (file, newName, isImage) => {
            if (isImage) {
                const fileName = file.name.toLowerCase();
                if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
                    return new File([file], newName, { type: file.type });
                }
                return new File([file], newName, { type: 'image/jpeg' });
            }
            return new File([file], newName, { type: file.type });
        };

        // Handle file selection with size validation
        const handleSourceImageChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5_000_000) {
                    setError("Source image too large (max 5MB).");
                    setSourceImageFile(null);
                    console.log('Source image too large:', file.size);
                    return;
                }
                const renamedFile = renameFile(file, 'source.jpg', true);
                setSourceImageFile(renamedFile);
                setSourceVideoFile(null);
                setError(null);
                console.log('Source image set:', renamedFile.name);
            } else {
                setSourceImageFile(null);
                console.log('Source image cleared');
            }
        };

        const handleTargetImageChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5_000_000) {
                    setError("Target image too large (max 5MB).");
                    setTargetImageFile(null);
                    console.log('Target image too large:', file.size);
                    return;
                }
                const renamedFile = renameFile(file, 'target.jpg', true);
                setTargetImageFile(renamedFile);
                setTargetVideoFile(null);
                setTargetFaces([]);
                setSelectedFaceIndex(null);
                setShowFaceSelection(false);
                setError(null);
                console.log('Target image set:', renamedFile.name);
            } else {
                setTargetImageFile(null);
                setTargetFaces([]);
                setSelectedFaceIndex(null);
                setShowFaceSelection(false);
                console.log('Target image cleared');
            }
        };

        const handleSourceVideoChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 50_000_000) {
                    setError("Source video too large (max 50MB).");
                    setSourceVideoFile(null);
                    console.log('Source video too large:', file.size);
                    return;
                }
                const renamedFile = renameFile(file, 'source.mp4', false);
                setSourceVideoFile(renamedFile);
                setSourceImageFile(null);
                setError(null);
                console.log('Source video set:', renamedFile.name);
            } else {
                setSourceVideoFile(null);
                console.log('Source video cleared');
            }
        };

        const handleTargetVideoChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 50_000_000) {
                    setError("Target video too large (max 50MB).");
                    setTargetVideoFile(null);
                    console.log('Target video too large:', file.size);
                    return;
                }
                const renamedFile = renameFile(file, 'target.mp4', false);
                setTargetVideoFile(renamedFile);
                setTargetImageFile(null);
                setTargetFaces([]);
                setSelectedFaceIndex(null);
                setShowFaceSelection(false);
                setError(null);
                console.log('Target video set:', renamedFile.name);
                // Auto-detect faces for video
                detectFaces();
            } else {
                setTargetVideoFile(null);
                setTargetFaces([]);
                setSelectedFaceIndex(null);
                setShowFaceSelection(false);
                console.log('Target video cleared');
            }
        };

        // Detect faces in target image or video
        const detectFaces = async () => {
            if (!targetImageFile && !targetVideoFile) {
                setError("Please upload a target image or video.");
                console.log('No target file uploaded');
                return false;
            }
            
            setLoading(true);
            setError(null);
            
            const formData = new FormData();
            if (targetImageFile) {
                formData.append("target", targetImageFile);
                console.log('Sending target image for face detection:', targetImageFile.name);
            } else {
                formData.append("target", targetVideoFile);
                console.log('Sending target video for face detection:', targetVideoFile.name);
            }
            
            try {
                const response = await fetch("https://face-detection-pkw8.onrender.com/detect-faces/", {
                    method: "POST",
                    body: formData,
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Failed to detect faces");
                }
                
                const data = await response.json();
                setTargetFaces(data.faces);
                console.log('Faces detected:', data.faces);
                
                if (data.faces.length === 0) {
                    setError("No faces detected in the target.");
                    console.log('No faces detected');
                    return false;
                } else if (data.faces.length === 1) {
                    setSelectedFaceIndex(0);
                    setShowFaceSelection(false);
                    console.log('Single face auto-selected');
                    return true;
                } else {
                    setShowFaceSelection(true);
                    console.log('Multiple faces detected, showing selection');
                    return false;
                }
            } catch (err) {
                setError("Failed to detect faces: " + err.message);
                console.error('Face detection error:', err.message);
                return false;
            } finally {
                setLoading(false);
            }
        };

        // Handle face selection
        const handleFaceSelect = (index) => {
            setSelectedFaceIndex(index === selectedFaceIndex ? null : index);
            console.log('Face selected:', index);
        };

        // Handle submit (image or video)
        const handleSubmit = async (e) => {
            e.preventDefault();
            if (activeTab === 'image' && (!sourceImageFile || !targetImageFile)) {
                setError("Please upload both source and target images.");
                console.log('Missing image files');
                return;
            }
            if (activeTab === 'video' && (!sourceVideoFile || !targetVideoFile)) {
                setError("Please upload both source and target videos.");
                console.log('Missing video files');
                return;
            }

            if (targetFaces.length === 0) {
                console.log('No faces detected yet, calling detectFaces');
                const canProceed = await detectFaces();
                if (!canProceed) return;
            }

            if (targetFaces.length > 1 && selectedFaceIndex === null) {
                setError("Please select a face from the target.");
                console.log('Face selection required');
                return;
            }

            setLoading(true);
            setError(null);
            setResultImage(null);
            setResultVideo(null);
            console.log('Submitting form for', activeTab, 'swap');

            const formData = new FormData();
            formData.append("face_index", selectedFaceIndex || 0);
            if (activeTab === 'image') {
                formData.append("source", sourceImageFile);
                formData.append("target", targetImageFile);
                console.log('Sending image files:', sourceImageFile.name, targetImageFile.name);
            } else {
                formData.append("source", sourceVideoFile);
                formData.append("target", targetVideoFile);
                console.log('Sending video files:', sourceVideoFile.name, targetVideoFile.name);
            }

            try {
                const response = await fetch(
                    activeTab === 'image'
                        ? "https://face-swap-api-7fb0.onrender.com/swap-faces/"
                        : "https://face-swap-api-7fb0.onrender.com/swap-faces-video/",
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `Failed to swap faces in ${activeTab}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                if (activeTab === 'image') {
                    setResultImage(url);
                    console.log('Image swap result set:', url);
                } else {
                    setResultVideo(url);
                    console.log('Video swap result set:', url);
                }
            } catch (err) {
                setError("Failed to swap faces: " + err.message);
                console.error('Swap error:', err);
            } finally {
                setLoading(false);
            }
        };

        return React.createElement(
            'div',
            { className: isDarkMode ? 'dark-mode' : '' },
            React.createElement(
                'nav',
                { className: 'bg-white shadow-lg fixed w-full z-50' },
                React.createElement(
                    'div',
                    { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                    React.createElement(
                        'div',
                        { className: 'flex justify-between h-16' },
                        React.createElement(
                            'div',
                            { className: 'flex items-center' },
                            React.createElement(
                                'h1',
                                { className: 'text-3xl font-bold gradient-text' },
                                'FaceSwap'
                            )
                        ),
                        React.createElement(
                            'div',
                            { className: 'flex items-center' },
                            React.createElement(
                                'div',
                                { className: `navbar-links ${isMenuOpen ? 'active' : ''}` },
                                React.createElement(
                                    'a',
                                    { href: '#home', className: 'gradient-text hover:gradient-text-secondary font-medium px-3 py-2' },
                                    'Home'
                                ),
                                React.createElement(
                                    'a',
                                    { href: '#swap', className: 'gradient-text hover:gradient-text-secondary font-medium px-3 py-2' },
                                    'Swap'
                                ),
                                React.createElement(
                                    'a',
                                    { href: '#features', className: 'gradient-text hover:gradient-text-secondary font-medium px-3 py-2' },
                                    'Features'
                                ),
                                React.createElement(
                                    'a',
                                    { href: '#contact', className: 'gradient-text hover:gradient-text-secondary font-medium px-3 py-2' },
                                    'Contact'
                                ),
                                React.createElement(
                                    'a',
                                    { href: '#team', className: 'gradient-text hover:gradient-text-secondary font-medium px-3 py-2' },
                                    'Team'
                                )
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: toggleTheme,
                                    className: 'p-2 rounded-full bg-slate-100 hover:bg-slate-200 ml-4',
                                    title: `Switch to ${isDarkMode ? 'Bright' : 'Dark'} Mode`
                                },
                                React.createElement(
                                    'i',
                                    { className: `fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-purple-600` }
                                )
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: toggleMenu,
                                    className: 'navbar-toggle p-2 rounded-full bg-slate-100 hover:bg-slate-200 ml-2 sm:hidden',
                                    title: 'Toggle Menu'
                                },
                                React.createElement(
                                    'i',
                                    { className: `fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-purple-600` }
                                )
                            )
                        )
                    )
                )
            ),
            React.createElement(
                'section',
                { id: 'home', className: 'hero-gradient pt-24 pb-24' },
                React.createElement(
                    'div',
                    { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center' },
                    React.createElement(
                        'h2',
                        { className: 'text-5xl sm:text-6xl font-extrabold text-white animate-slide-up' },
                        'Transform Your Moments with FaceSwap'
                    ),
                    React.createElement(
                        'p',
                        { className: 'mt-6 text-xl sm:text-2xl text-white opacity-90 max-w-3xl mx-auto animate-slide-up' },
                        'Swap faces in photos and videos effortlessly with our advanced AI technology. Fun, fast, and free!'
                    ),
                    React.createElement(
                        'a',
                        { href: '#swap', className: 'mt-10 inline-block px-10 py-4 rounded-full text-white font-semibold text-lg btn-primary' },
                        'Start Swapping Now'
                    )
                )
            ),
            React.createElement(
                'section',
                { id: 'features', className: 'py-24 bg-white' },
                React.createElement(
                    'div',
                    { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                    React.createElement(
                        'h2',
                        { className: 'text-4xl sm:text-5xl font-bold text-center mb-16 animate-slide-up gradient-text' },
                        'Why FaceSwap?'
                    ),
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-1 md:grid-cols-3 gap-12' },
                        React.createElement(
                            'div',
                            { className: 'bg-slate-100 p-8 rounded-2xl card-hover animate-slide-up' },
                            React.createElement('i', { className: 'fas fa-bolt text-4xl text-purple-600 mb-4' }),
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-4 gradient-text' }, 'Lightning Fast'),
                            React.createElement('p', { className: 'text-slate-600' }, 'Process face swaps in seconds with our high-performance AI.')
                        ),
                        React.createElement(
                            'div',
                            { className: 'bg-slate-100 p-8 rounded-2xl card-hover animate-slide-up' },
                            React.createElement('i', { className: 'fas fa-shield-alt text-4xl text-purple-600 mb-4' }),
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-4 gradient-text' }, 'Secure & Private'),
                            React.createElement('p', { className: 'text-slate-600' }, 'Your files are processed securely and deleted after use.')
                        ),
                        React.createElement(
                            'div',
                            { className: 'bg-slate-100 p-8 rounded-2xl card-hover animate-slide-up' },
                            React.createElement('i', { className: 'fas fa-video text-4xl text-purple-600 mb-4' }),
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-4 gradient-text' }, 'Image & Video Support'),
                            React.createElement('p', { className: 'text-slate-600' }, 'Swap faces in both photos and videos with ease.')
                        )
                    )
                )
            ),
            React.createElement(
                'section',
                { id: 'swap', className: 'py-24 bg-slate-50' },
                React.createElement(
                    'div',
                    { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                    React.createElement(
                        'h2',
                        { className: 'text-4xl sm:text-5xl font-bold text-center mb-16 animate-slide-up gradient-text' },
                        'Create Your Face Swap'
                    ),
                    React.createElement(
                        'div',
                        { className: 'bg-white rounded-3xl shadow-2xl p-8 sm:p-12' },
                        React.createElement(
                            'div',
                            { className: 'flex justify-center mb-8' },
                            React.createElement(
                                'button',
                                {
                                    onClick: () => setActiveTab('image'),
                                    className: `tab px-6 py-3 rounded-l-lg text-lg font-medium ${activeTab === 'image' ? 'active' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`
                                },
                                'Image Swap'
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: () => setActiveTab('video'),
                                    className: `tab px-6 py-3 rounded-r-lg text-lg font-medium ${activeTab === 'video' ? 'active' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`
                                },
                                'Video Swap ',
                                React.createElement('span', { className: 'beta-label' }, 'Beta')
                            )
                        ),
                        React.createElement(
                            'form',
                            { onSubmit: handleSubmit, className: 'space-y-10' },
                            loading && React.createElement(
                                'div',
                                { className: 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50' },
                                React.createElement(
                                    'div',
                                    { className: 'flex flex-col items-center' },
                                    React.createElement(
                                        'svg',
                                        { className: 'animate-spin h-10 w-10 text-white mb-4', viewBox: '0 0 24 24' },
                                        React.createElement('circle', { className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
                                        React.createElement('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' })
                                    ),
                                    React.createElement('span', { className: 'text-white text-xl font-semibold' }, 'Processing...')
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'grid grid-cols-1 lg:grid-cols-2 gap-12' },
                                React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                        'label',
                                        { className: 'block text-xl font-semibold mb-4 gradient-text' },
                                        `Source ${activeTab === 'image' ? 'Image' : 'Video'}`
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'border-3 border-dashed border-slate-400 rounded-2xl bg-slate-100 upload-box mx-auto' },
                                        (sourceImageFile || sourceVideoFile) ? React.createElement(
                                            'div',
                                            { className: 'preview-container' },
                                            activeTab === 'image' ? React.createElement(
                                                'img',
                                                {
                                                    src: sourceImageFile ? URL.createObjectURL(sourceImageFile) : '',
                                                    alt: 'Source Preview',
                                                    className: 'rounded-lg shadow-lg'
                                                }
                                            ) : React.createElement(
                                                'video',
                                                {
                                                    src: sourceVideoFile ? URL.createObjectURL(sourceVideoFile) : '',
                                                    className: 'rounded-lg shadow-lg',
                                                    controls: true
                                                }
                                            )
                                        ) : React.createElement(
                                            'p',
                                            { className: 'text-slate-600' },
                                            `Upload ${activeTab === 'image' ? 'image' : 'video'} here`
                                        ),
                                        React.createElement(
                                            'div',
                                            { className: 'upload-button-container' },
                                            React.createElement('input', {
                                                type: 'file',
                                                accept: activeTab === 'image' ? 'image/*' : 'video/mp4,video/webm',
                                                onChange: activeTab === 'image' ? handleSourceImageChange : handleSourceVideoChange,
                                                className: 'hidden',
                                                id: 'source-upload'
                                            }),
                                            React.createElement(
                                                'label',
                                                {
                                                    htmlFor: 'source-upload',
                                                    className: 'cursor-pointer inline-flex items-center px-8 py-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-lg font-medium'
                                                },
                                                React.createElement('i', { className: 'fas fa-upload mr-3' }),
                                                activeTab === 'image'
                                                    ? (sourceImageFile ? 'Change Source Image' : 'Upload Source Image')
                                                    : (sourceVideoFile ? 'Change Source Video' : 'Upload Source Video')
                                            )
                                        )
                                    )
                                ),
                                React.createElement(
                                    'div',
                                    null,
                                    React.createElement(
                                        'label',
                                        { className: 'block text-xl font-semibold mb-4 gradient-text' },
                                        `Target ${activeTab === 'image' ? 'Image' : 'Video'}`
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'border-3 border-dashed border-slate-400 rounded-2xl bg-slate-100 upload-box mx-auto' },
                                        (targetImageFile || targetVideoFile) ? React.createElement(
                                            'div',
                                            { className: 'preview-container' },
                                            activeTab === 'image' ? React.createElement(
                                                'img',
                                                {
                                                    src: targetImageFile ? URL.createObjectURL(targetImageFile) : '',
                                                    alt: 'Target Preview',
                                                    className: 'rounded-lg shadow-lg'
                                                }
                                            ) : React.createElement(
                                                'video',
                                                {
                                                    src: targetVideoFile ? URL.createObjectURL(targetVideoFile) : '',
                                                    className: 'rounded-lg shadow-lg',
                                                    controls: true
                                                }
                                            )
                                        ) : React.createElement(
                                            'p',
                                            { className: 'text-slate-600' },
                                            `Upload ${activeTab === 'image' ? 'image' : 'video'} here`
                                        ),
                                        React.createElement(
                                            'div',
                                            { className: 'upload-button-container' },
                                            React.createElement('input', {
                                                type: 'file',
                                                accept: activeTab === 'image' ? 'image/*' : 'video/mp4,video/webm',
                                                onChange: activeTab === 'image' ? handleTargetImageChange : handleTargetVideoChange,
                                                className: 'hidden',
                                                id: 'target-upload'
                                            }),
                                            React.createElement(
                                                'label',
                                                {
                                                    htmlFor: 'target-upload',
                                                    className: 'cursor-pointer inline-flex items-center px-8 py-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-lg font-medium'
                                                },
                                                React.createElement('i', { className: 'fas fa-upload mr-3' }),
                                                activeTab === 'image'
                                                    ? (targetImageFile ? 'Change Target Image' : 'Upload Target Image')
                                                    : (targetVideoFile ? 'Change Target Video' : 'Upload Target Video')
                                            )
                                        )
                                    )
                                )
                            ),
                            showFaceSelection && targetFaces.length > 1 && React.createElement(
                                'div',
                                { className: 'mt-8 animate-fade-in' },
                                React.createElement(
                                    'h3',
                                    { className: 'text-xl font-semibold text-center mb-6 gradient-text' },
                                    `Select a Face to Replace (${targetFaces.length} faces detected)`
                                ),
                                React.createElement(
                                    'div',
                                    { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6' },
                                    targetFaces.map((face, index) => React.createElement(
                                        'div',
                                        {
                                            key: index,
                                            className: `face-box ${selectedFaceIndex === index ? 'selected' : ''}`,
                                            onClick: () => handleFaceSelect(index)
                                        },
                                        React.createElement('img', {
                                            src: `data:image/jpeg;base64,${face.image_base64}`,
                                            alt: `Face ${index + 1}`
                                        }),
                                        React.createElement('div', { className: 'face-label' }, `Face ${index + 1}`)
                                    ))
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'text-center' },
                                React.createElement(
                                    'button',
                                    {
                                        type: 'submit',
                                        disabled: loading || 
                                            (activeTab === 'image' && (!sourceImageFile || !targetImageFile)) || 
                                            (activeTab === 'video' && (!sourceVideoFile || !targetVideoFile)),
                                        className: `px-10 py-4 rounded-lg text-white font-semibold text-lg btn-primary ${loading || 
                                            (activeTab === 'image' && (!sourceImageFile || !targetImageFile)) || 
                                            (activeTab === 'video' && (!sourceVideoFile || !targetVideoFile)) ? 'opacity-50 cursor-not-allowed' : ''}`
                                    },
                                    loading ? React.createElement(
                                        'div',
                                        { className: 'flex items-center' },
                                        React.createElement(
                                            'svg',
                                            { className: 'animate-spin h-6 w-6 mr-3 text-white', viewBox: '0 0 24 24' },
                                            React.createElement('circle', { className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
                                            React.createElement('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' })
                                        ),
                                        'Processing...'
                                    ) : (
                                        targetFaces.length > 1 && selectedFaceIndex === null 
                                            ? "Select a Face" 
                                            : `Swap Faces in ${activeTab === 'image' ? 'Image' : 'Video'}`
                                    )
                                )
                            )
                        ),
                        (resultImage || resultVideo) && React.createElement(
                            'div',
                            { className: 'mt-12 animate-slide-up' },
                            React.createElement('h3', { className: 'text-2xl font-semibold text-center mb-6 gradient-text' }, 'Your Face Swap Result'),
                            resultImage && React.createElement('img', {
                                src: resultImage,
                                alt: 'Swapped Face',
                                className: 'mx-auto rounded-lg shadow-2xl max-w-full'
                            }),
                            resultVideo && React.createElement('video', {
                                src: resultVideo,
                                className: 'mx-auto rounded-lg shadow-2xl max-w-full',
                                controls: true
                            }),
                            React.createElement(
                                'div',
                                { className: 'text-center mt-6' },
                                React.createElement(
                                    'a',
                                    {
                                        href: resultImage || resultVideo,
                                        download: resultImage ? 'faceswap_result.jpg' : 'faceswap_result.mp4',
                                        className: 'inline-flex items-center px-8 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700'
                                    },
                                    React.createElement('i', { className: 'fas fa-download mr-2' }),
                                    'Download Result'
                                )
                            )
                        ),
                        error && React.createElement(
                            'div',
                            { className: 'mt-8 p-6 bg-red-100 text-red-700 rounded-lg text-center animate-fade-in' },
                            React.createElement('i', { className: 'fas fa-exclamation-circle mr-3 text-xl' }),
                            error
                        )
                    )
                )
            ),
            React.createElement(
                'section',
                { id: 'contact', className: 'py-24 bg-white' },
                React.createElement(
                    'div',
                    { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                    React.createElement(
                        'h2',
                        { className: 'text-4xl sm:text-5xl font-bold text-center mb-16 animate-slide-up gradient-text' },
                        'Get in Touch'
                    ),
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-1 md:grid-cols-2 gap-12' },
                        React.createElement(
                            'div',
                            { className: 'animate-slide-up' },
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-6 gradient-text' }, 'Contact Information'),
                            React.createElement('p', { className: 'text-slate-600 mb-4' }, 'Questions or feedback? Our team is here to help you make the most of FaceSwap.'),
                            React.createElement('p', { className: 'text-slate-600' }, React.createElement('i', { className: 'fas fa-envelope mr-2' }), 'pankajgautamprk@gmail.com'),
                            React.createElement(
                                'div',
                                { className: 'flex space-x-4 mt-6' },
                                React.createElement('a', { href: '#', className: 'text-slate-600 hover:text-purple-600' }, React.createElement('i', { className: 'fab fa-linkedin text-2xl' })),
                                React.createElement('a', { href: 'https://github.com/PankajGautam04', target: '_blank', rel: 'noopener noreferrer', className: 'text-slate-600 hover:text-purple-600' }, React.createElement('i', { className: 'fab fa-github text-2xl' }))
                            )
                        ),
                        React.createElement(
                            'div',
                            { className: 'bg-slate-100 p-8 rounded-2xl shadow-lg animate-slide-up' },
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-6 gradient-text' }, 'Send Us a Message'),
                            React.createElement(
                                'div',
                                { className: 'space-y-6' },
                                React.createElement('input', { type: 'text', placeholder: 'Your Name', className: 'w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600' }),
                                React.createElement('input', { type: 'email', placeholder: 'Your Email', className: 'w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600' }),
                                React.createElement('textarea', { placeholder: 'Your Message', rows: '5', className: 'w-full p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600' }),
                                React.createElement('button', { className: 'w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 btn-primary' }, 'Send Message')
                            )
                        )
                    )
                )
            ),
            React.createElement(
                'section',
                { id: 'team', className: 'py-24 bg-slate-50' },
                React.createElement(
                    'div',
                    { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                    React.createElement(
                        'h2',
                        { className: 'text-4xl sm:text-5xl font-bold text-center mb-16 animate-slide-up gradient-text' },
                        'Meet Our Team'
                    ),
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-1 md:grid-cols-3 gap-10' },
                        React.createElement(
                            'div',
                            { className: 'bg-white p-8 rounded-2xl card-hover animate-slide-up' },
                            React.createElement('i', { className: 'fas fa-user-circle text-4xl text-purple-600 mb-4' }),
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-2 gradient-text-secondary' }, 'Chandrapal Parmar'),
                            React.createElement('p', { className: 'text-slate-600' }, 'MCA Student')
                        ),
                        React.createElement(
                            'div',
                            { className: 'bg-white p-8 rounded-2xl card-hover animate-slide-up' },
                            React.createElement('i', { className: 'fas fa-user-circle text-4xl text-purple-600 mb-4' }),
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-2 gradient-text-secondary' }, 'Pankaj Gautam'),
                            React.createElement('p', { className: 'text-slate-600' }, 'MCA Student')
                        ),
                        React.createElement(
                            'div',
                            { className: 'bg-white p-8 rounded-2xl card-hover animate-slide-up' },
                            React.createElement('i', { className: 'fas fa-user-circle text-4xl text-purple-600 mb-4' }),
                            React.createElement('h3', { className: 'text-2xl font-semibold mb-2 gradient-text-secondary' }, 'Siddharth Namdev'),
                            React.createElement('p', { className: 'text-slate-600' }, 'MCA Student')
                        )
                    )
                )
            ),
            React.createElement(
                'footer',
                { className: 'bg-slate-900 text-white py-12' },
                React.createElement(
                    'div',
                    { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-1 md:grid-cols-4 gap-12' },
                        React.createElement(
                            'div',
                            null,
                            React.createElement('h3', { className: 'text-2xl font-bold mb-6 gradient-text' }, 'FaceSwap'),
                            React.createElement('p', { className: 'text-slate-400' }, 'Transform your photos and videos with AI-powered face swapping.')
                        ),
                        React.createElement(
                            'div',
                            null,
                            React.createElement('h4', { className: 'text-lg font-semibold mb-4 gradient-text' }, 'Quick Links'),
                            React.createElement(
                                'ul',
                                { className: 'space-y-2' },
                                React.createElement('li', null, React.createElement('a', { href: '#home', className: 'text-slate-400 hover:text-white' }, 'Home')),
                                React.createElement('li', null, React.createElement('a', { href: '#swap', className: 'text-slate-400 hover:text-white' }, 'Swap')),
                                React.createElement('li', null, React.createElement('a', { href: '#features', className: 'text-slate-400 hover:text-white' }, 'Features')),
                                React.createElement('li', null, React.createElement('a', { href: '#contact', className: 'text-slate-400 hover:text-white' }, 'Contact')),
                                React.createElement('li', null, React.createElement('a', { href: '#team', className: 'text-slate-400 hover:text-white' }, 'Team'))
                            )
                        ),
                        React.createElement(
                            'div',
                            null,
                            React.createElement('h4', { className: 'text-lg font-semibold mb-4 gradient-text' }, 'Resources'),
                            React.createElement(
                                'ul',
                                { className: 'space-y-2' },
                                React.createElement('li', null, React.createElement('a', { href: '#', className: 'text-slate-400 hover:text-white' }, 'Support'))
                            )
                        ),
                        React.createElement(
                            'div',
                            null,
                            React.createElement('h4', { className: 'text-lg font-semibold mb-4 gradient-text' }, 'Follow Us'),
                            React.createElement(
                                'div',
                                { className: 'flex space-x-4' },
                                React.createElement('a', { href: '#', className: 'text-slate-400 hover:text-white' }, React.createElement('i', { className: 'fab fa-linkedin text-2xl' })),
                                React.createElement('a', { href: 'https://github.com/PankajGautam04', target: '_blank', rel: 'noopener noreferrer', className: 'text-slate-400 hover:text-white' }, React.createElement('i', { className: 'fab fa-github text-2xl' }))
                            )
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'mt-12' },
                        React.createElement('h4', { className: 'text-lg font-semibold mb-4 gradient-text text-center' }, 'Disclaimer'),
                        React.createElement(
                            'p',
                            { className: 'text-slate-400 text-center text-sm' },
                            'FaceSwap is intended for educational and entertainment purposes only. Users are responsible for ensuring they have permission to use the images uploaded. Do not use this tool to create harmful, misleading, or illegal content, including deepfakes that violate privacy or spread misinformation. We do not store your images after processing. By using FaceSwap, you agree to use it responsibly and in compliance with applicable laws.'
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'mt-6 text-center text-slate-400' },
                        React.createElement('p', null, '© 2025 FaceSwap. All rights reserved.')
                    )
                )
            )
        );
    }

    // Render the App component
    const rootElement = document.getElementById("root");
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));
})();
