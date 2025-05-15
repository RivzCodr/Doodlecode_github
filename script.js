document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('doodleArea');
    const ctx = canvas.getContext('2d');
    const soundButton = document.getElementById('soundButton');
    const clearButton = document.getElementById('clearButton');
    const colorBrushes = document.querySelectorAll('.color-brush');

    let drawing = false;
    let currentColor = '#000000'; // Default color
    let currentLineWidth = 5; // Default line width

    // Set initial canvas background (important for clearing and image data)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function getTouchPos(evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.touches[0].clientX - rect.left,
            y: evt.touches[0].clientY - rect.top
        };
    }

    function startDrawing(e) {
        drawing = true;
        draw(e); // Draw a dot on click/tap
    }

    function stopDrawing() {
        drawing = false;
        ctx.beginPath(); // Reset current path
    }

    function draw(e) {
        if (!drawing) return;

        e.preventDefault(); // Prevent scrolling on touch
        let pos;
        if (e.type.startsWith('touch')) {
            pos = getTouchPos(e);
        } else {
            pos = getMousePos(e);
        }

        ctx.lineWidth = currentLineWidth;
        ctx.lineCap = 'round';
        ctx.strokeStyle = currentColor;

        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath(); // Start a new path
        ctx.moveTo(pos.x, pos.y);
    }

    // Event Listeners for Drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing); // Stop drawing if mouse leaves canvas
    canvas.addEventListener('mousemove', draw);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchmove', draw);


    // Color selection
    colorBrushes.forEach(brush => {
        brush.addEventListener('click', () => {
            currentColor = brush.dataset.color;
            // Optionally indicate selected brush
            document.querySelector('.color-brush.selected')?.classList.remove('selected');
            brush.classList.add('selected');
            if (currentColor === '#FFFFFF') { // Eraser
                currentLineWidth = 20; // Make eraser thicker
            } else {
                currentLineWidth = 5; // Reset to default line width
            }
        });
    });
    // Select black by default
    document.querySelector('.color-brush[data-color="#000000"]').classList.add('selected');


    // Clear button
    clearButton.addEventListener('click', () => {
        ctx.fillStyle = 'white'; // Ensure background is white
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath(); // Reset path
    });

    // --- Sound Generation ---
    let audioContext;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        alert('Web Audio API is not supported in this browser. Sound will not work.');
    }

    soundButton.addEventListener('click', () => {
        if (!audioContext) {
            alert('AudioContext not available. Cannot play sound.');
            return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data; // Pixel data: [R,G,B,A, R,G,B,A, ...]
        const width = canvas.width;
        const height = canvas.height;
        const durationPerColumn = 0.02; // seconds, adjust for speed
        let currentTime = audioContext.currentTime;

        // Normalize frequencies to a pleasant range
        const minFreq = 100; // Hz (e.g., G2)
        const maxFreq = 1000; // Hz (e.g., B5)

        for (let x = 0; x < width; x++) {
            let yPositionsInColumn = [];
            for (let y = 0; y < height; y++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                // const a = data[index + 3]; // Alpha

                // Check if pixel is not white (or very light gray) and has some opacity
                if (!(r > 240 && g > 240 && b > 240) && data[index+3] > 50) { // Not white and somewhat opaque
                    yPositionsInColumn.push(y);
                }
            }

            if (yPositionsInColumn.length > 0) {
                // Average Y position for this column
                const avgY = yPositionsInColumn.reduce((sum, val) => sum + val, 0) / yPositionsInColumn.length;

                // Map Y to frequency (inverted: lower Y on screen = higher pitch)
                const frequency = minFreq + ((height - avgY) / height) * (maxFreq - minFreq);

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.type = 'sine'; // 'sine', 'square', 'sawtooth', 'triangle'
                oscillator.frequency.setValueAtTime(frequency, currentTime + x * durationPerColumn);
                gainNode.gain.setValueAtTime(0.3, currentTime + x * durationPerColumn); // Volume

                oscillator.start(currentTime + x * durationPerColumn);
                oscillator.stop(currentTime + x * durationPerColumn + durationPerColumn * 0.9); // Shorten note slightly
            }
        }
    });
});
