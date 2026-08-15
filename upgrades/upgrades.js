/* ===== DRAGGABLE & FLOATING NODE PIPELINE SCRIPT ===== */

function initNodePipeline() {
  const cardUpgrade = document.getElementById('card-upgrade');
  if (!cardUpgrade) return;

  const cardInner = cardUpgrade.querySelector('.card-inner');
  const svgCanvas = document.getElementById('nodesSvgCanvas');
  if (!cardInner || !svgCanvas) return;

  // Slideshow interval variables
  let slideshowInterval = null;
  let slideshowIndex = 0;

  // State Management
  const pipeline = {
    selectedStyle: null,
    llmCompiled: false,
    imageGenerated: false,
    audioEnabled: false,
    suhailEnabled: false,
    connections: {
      'choosing-llm': false,
      'llm-image': false,
      'image-video': false,
      'music-video': false,
      'suhail-video': false
    },
    draftCable: null // Currently active drag/click cable line
  };

  // Content configurations corresponding to selected style
  const styleConfigs = {
    production_videos: {
      prompt: "/generate cinematic corporate studio interview, dynamic professional lighting, high-fidelity 4k camera depth of field, premium production quality --ar 16:9",
      images: [
        "upgrades/production_videos/Photorealistic_cinematic_continuation_of_the_202605242009.webp",
        "upgrades/production_videos/make_background_lighting_same_as_202605242009.webp",
        "upgrades/production_videos/make_background_lightning_look_of_202605242008.webp",
        "upgrades/production_videos/remove_backlit_light_on_keyboard_202605242009.webp",
        "upgrades/production_videos/upscale_image_2x_2K_202605242008.webp"
      ],
      video: "upgrades/production_videos/video1.mp4",
      aspectRatio: "16/9",
      wrapperHeight: "180px"
    },
    ugc_real_estate: {
      prompt: "/generate photorealistic modern luxury real estate listing house tour, glowing sunset lighting, interior design architectural digest render --ar 9:16",
      images: [
        "upgrades/UGC_real_estate/SCENE_3.webp",
        "upgrades/UGC_real_estate/Screenshot_2026-05-24_195343.webp",
        "upgrades/UGC_real_estate/Screenshot_2026-05-24_195408.webp",
        "upgrades/UGC_real_estate/Screenshot_2026-05-24_195431.webp",
        "upgrades/UGC_real_estate/Screenshot_2026-05-24_195451.webp",
        "upgrades/UGC_real_estate/Screenshot_2026-05-24_195516.webp"
      ],
      video: "upgrades/UGC_real_estate/video3.mp4",
      aspectRatio: "9/16",
      wrapperHeight: "560px"
    }
  };

  // --- DRAG AND DROP GRAPHICS ENGINE ---
  const nodesContainer = document.querySelector('.nodes-container');
  const cards = document.querySelectorAll('.node-card');

  // Bind drag-and-drop listeners to the card itself (not just the headers)
  cards.forEach(card => {
    card.addEventListener('mousedown', (e) => {
      // Ignore dragging if clicking interactive control items
      if (e.target.closest('button, input, select, textarea, canvas, .node-port, .terminal-content, video')) return;
      startDrag(e, card);
    });
    card.addEventListener('touchstart', (e) => {
      if (e.target.closest('button, input, select, textarea, canvas, .node-port, .terminal-content, video')) return;
      startDrag(e, card);
    }, { passive: false });
  });

  let draggedCard = null;
  let offsetX = 0;
  let offsetY = 0;

  function startDrag(e, card) {
    // Only drag on left-click
    if (e.type === 'mousedown' && e.button !== 0) return;
    
    // Prevent scrolling when dragging elements on touch
    if (e.type === 'touchstart') {
      e.stopPropagation();
    }

    draggedCard = card;
    card.classList.add('dragging');

    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    const cardRect = card.getBoundingClientRect();
    
    offsetX = clientX - cardRect.left;
    offsetY = clientY - cardRect.top;

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  }

  function drag(e) {
    if (!draggedCard || !nodesContainer) return;
    
    // Prevent mobile rubber-band scrolling
    e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const containerRect = nodesContainer.getBoundingClientRect();

    // Calculate coordinate position relative to the container parent
    let left = clientX - containerRect.left - offsetX;
    let top = clientY - containerRect.top - offsetY;

    // Enforce bounds lock so nodes can't float out of the section
    const maxLeft = containerRect.width - draggedCard.offsetWidth;
    const maxTop = containerRect.height - draggedCard.offsetHeight;

    left = Math.max(0, Math.min(left, maxLeft));
    top = Math.max(0, Math.min(top, maxTop));

    // Convert positions to percentages so it stays highly responsive!
    draggedCard.style.left = `${(left / containerRect.width) * 100}%`;
    draggedCard.style.top = `${(top / containerRect.height) * 100}%`;

    // Continuous cable tracing bend recalculations
    drawWiring();
  }

  function endDrag() {
    if (draggedCard) {
      draggedCard.classList.remove('dragging');
    }
    draggedCard = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
    drawWiring();
  }

  // --- SVG CONNECTION DRAWER SYSTEM ---
  
  // Re-draw all active links and draft lines
  function drawWiring() {
    // Clear all lines
    svgCanvas.innerHTML = '';

    // Create a dynamic linear gradient definition for cables
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.id = 'neonGradient';
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%');
    grad.setAttribute('y2', '0%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#bd00ff');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#39ff14');
    
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svgCanvas.appendChild(defs);

    // Draw active connections
    drawConnection('choosing', 'port-choosing-out', 'port-llm-in', 'choosing-llm', '#bd00ff');
    drawConnection('llm', 'port-llm-out', 'port-image-in', 'llm-image', '#bd00ff');
    drawConnection('image', 'port-image-out', 'port-video-in-image', 'image-video', '#bd00ff');
    drawConnection('music', 'port-music-out', 'port-video-in-audio', 'music-video', '#39ff14');
    drawConnection('suhail', 'port-suhail-out', 'port-video-in-suhail', 'suhail-video', '#ff9f43');

    // Draw active click-drag/draft wire if moving
    if (pipeline.draftCable) {
      const parentRect = cardInner.getBoundingClientRect();
      const originPort = document.getElementById(pipeline.draftCable.originId);
      if (originPort) {
        const oRect = originPort.getBoundingClientRect();
        const ox = oRect.left - parentRect.left + oRect.width / 2;
        const oy = oRect.top - parentRect.top + oRect.height / 2;
        const tx = pipeline.draftCable.tx;
        const ty = pipeline.draftCable.ty;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.className.baseVal = 'connection-cable draft';
        path.setAttribute('d', calculateBezierPath(ox, oy, tx, ty));
        svgCanvas.appendChild(path);
      }
    }
  }

  // Draw specific locked connections
  function drawConnection(originId, originPortId, destPortId, linkKey, baseColor) {
    if (!pipeline.connections[linkKey]) return;

    const originPort = document.getElementById(originPortId);
    const destPort = document.getElementById(destPortId);

    if (originPort && destPort) {
      const parentRect = cardInner.getBoundingClientRect();
      const oRect = originPort.getBoundingClientRect();
      const dRect = destPort.getBoundingClientRect();

      const ox = oRect.left - parentRect.left + oRect.width / 2;
      const oy = oRect.top - parentRect.top + oRect.height / 2;
      const dx = dRect.left - parentRect.left + dRect.width / 2;
      const dy = dRect.top - parentRect.top + dRect.height / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.className.baseVal = `connection-cable locked ${linkKey === 'music-video' ? 'locked-audio' : ''}`;
      path.setAttribute('d', calculateBezierPath(ox, oy, dx, dy));
      svgCanvas.appendChild(path);
    }
  }

  // Cubic Bezier calculation between ports
  function calculateBezierPath(x1, y1, x2, y2) {
    const horizontalDistance = Math.abs(x2 - x1);
    const controlOffset = Math.min(150, horizontalDistance * 0.5); // Blender/Unreal style dynamic curve
    const cp1x = x1 + controlOffset;
    const cp1y = y1;
    const cp2x = x2 - controlOffset;
    const cp2y = y2;
    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }

  // Resize and Scroll listeners to keep wiring updated
  window.addEventListener('resize', drawWiring);
  window.addEventListener('scroll', drawWiring);

  // --- INTERACTIVE LINK PORT CLICK/DRAG LOGIC ---
  let activeOutputPort = null;

  // Bind event listeners to ports
  document.querySelectorAll('.node-port').forEach(port => {
    port.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = port.getAttribute('data-type');
      const nodeId = port.getAttribute('data-node');
      const portId = port.id;

      if (type === 'output') {
        // Can only draw output lines if node is fully active/ready
        const isReady = checkNodeOutputReady(nodeId);
        if (!isReady) return;

        // Toggle or start line dragging
        activeOutputPort = { id: portId, node: nodeId };
        port.classList.add(nodeId === 'music' ? 'glow-green' : (nodeId === 'suhail' ? 'glow-orange' : 'glow-purple'));
        
        // Initialize draft cable
        const parentRect = cardInner.getBoundingClientRect();
        const oRect = port.getBoundingClientRect();
        const ox = oRect.left - parentRect.left + oRect.width / 2;
        const oy = oRect.top - parentRect.top + oRect.height / 2;

        pipeline.draftCable = { originId: portId, tx: ox, ty: oy };
        drawWiring();
      } else if (type === 'input' && activeOutputPort) {
        // Attempting to lock connection
        const isValid = validateConnection(activeOutputPort.node, nodeId, portId);
        if (isValid) {
          // Play compilation / link animations
          registerLink(activeOutputPort.node, nodeId, portId);
          resetDraftState();
        } else {
          // Cancel draft if invalid link clicked
          resetDraftState();
        }
      }
    });
  });

  // Track draft line to cursor position inside card bounds
  cardUpgrade.addEventListener('mousemove', (e) => {
    if (pipeline.draftCable) {
      const parentRect = cardInner.getBoundingClientRect();
      pipeline.draftCable.tx = e.clientX - parentRect.left;
      pipeline.draftCable.ty = e.clientY - parentRect.top;
      drawWiring();
    }
  });

  // Cancel drawing if background clicked
  cardUpgrade.addEventListener('click', () => {
    if (pipeline.draftCable) {
      resetDraftState();
    }
  });

  function resetDraftState() {
    if (activeOutputPort) {
      const portEl = document.getElementById(activeOutputPort.id);
      if (portEl) {
        portEl.classList.remove('glow-purple', 'glow-green', 'glow-orange');
      }
    }
    activeOutputPort = null;
    pipeline.draftCable = null;
    drawWiring();
  }

  // Check if output node is actually ready to emit wires
  function checkNodeOutputReady(nodeId) {
    if (nodeId === 'choosing') return pipeline.selectedStyle !== null;
    if (nodeId === 'llm') return pipeline.llmCompiled;
    if (nodeId === 'image') return pipeline.imageGenerated;
    if (nodeId === 'music') return pipeline.audioEnabled;
    if (nodeId === 'suhail') return pipeline.suhailEnabled;
    return false;
  }

  // Ensure user is matching correct wiring sockets
  function validateConnection(originNode, destNode, destPortId) {
    if (originNode === 'choosing' && destNode === 'llm') return true;
    if (originNode === 'llm' && destNode === 'image') return true;
    if (originNode === 'image' && destNode === 'video' && destPortId === 'port-video-in-image') return true;
    if (originNode === 'music' && destNode === 'video' && destPortId === 'port-video-in-audio') return true;
    if (originNode === 'suhail' && destNode === 'video' && destPortId === 'port-video-in-suhail') return true;
    return false;
  }

  // Register link locks and trigger respective cascade animations
  function registerLink(originNode, destNode, destPortId) {
    // Dismiss the hint card on first connection
    const hintCard = document.getElementById('nodeHintCard');
    if (hintCard) {
      hintCard.style.transition = 'opacity 0.4s ease';
      hintCard.style.opacity = '0';
      setTimeout(() => hintCard.remove(), 400);
    }

    if (originNode === 'choosing' && destNode === 'llm') {
      pipeline.connections['choosing-llm'] = true;
      triggerLLMCompile();
    } else if (originNode === 'llm' && destNode === 'image') {
      pipeline.connections['llm-image'] = true;
      triggerImageRender();
    } else if (originNode === 'image' && destNode === 'video') {
      pipeline.connections['image-video'] = true;
      document.getElementById('status-image-link').textContent = 'Image: Connected';
      document.getElementById('status-image-link').classList.add('linked');
      checkVideoUnlock();
    } else if (originNode === 'music' && destNode === 'video') {
      pipeline.connections['music-video'] = true;
      document.getElementById('status-audio-link').textContent = 'Audio: Connected';
      document.getElementById('status-audio-link').classList.add('linked');
      checkVideoUnlock();
    } else if (originNode === 'suhail' && destNode === 'video') {
      pipeline.connections['suhail-video'] = true;
      document.getElementById('status-suhail-link').textContent = "Suhail's Touch: Connected";
      document.getElementById('status-suhail-link').classList.add('linked');
      checkVideoUnlock();
    }

    drawWiring();
  }

  // --- STATE-MACHINE PROCESSING STAGERS ---

  // 1. Choosing Node Click Select
  const styleBtns = document.querySelectorAll('.style-selector .style-btn');
  styleBtns.forEach(btn => {
    function handleStyleSelect(e) {
      e.preventDefault();
      e.stopPropagation();

      styleBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const style = btn.getAttribute('data-style');
      pipeline.selectedStyle = style;
      const config = styleConfigs[style];

      // 1. If LLM compiler has been reached / compiled, instantly update the prompt text!
      if (pipeline.llmCompiled) {
        const promptText = document.getElementById('typewriterPrompt');
        if (promptText) {
          promptText.textContent = config.prompt;
        }
      }

      // 2. If Image compiler has been reached / generated, instantly update slideshow images & proportions!
      if (pipeline.imageGenerated) {
        if (slideshowInterval) {
          clearInterval(slideshowInterval);
          slideshowInterval = null;
        }

        const imageNode = document.getElementById('node-image');
        const imgElement = document.getElementById('diffusionImage');
        const imageWrapper = imageNode.querySelector('.image-preview-box');
        if (imageWrapper && config.wrapperHeight) {
          imageWrapper.style.height = config.wrapperHeight;
          imageWrapper.style.aspectRatio = config.aspectRatio;
        }

        if (imgElement) {
          imgElement.src = config.images[0];
          
          // Re-start the slideshow sequence
          slideshowIndex = 0;
          slideshowInterval = setInterval(() => {
            slideshowIndex = (slideshowIndex + 1) % config.images.length;
            imgElement.src = config.images[slideshowIndex];
          }, 2000);
        }
      }

      // 3. If Video Compiler node has been unlocked / video generated, instantly update video source & proportions!
      const lockOverlay = document.getElementById('videoLockOverlay');
      if (lockOverlay && lockOverlay.classList.contains('unlocked')) {
        const videoNode = document.getElementById('node-video');
        const wrapper = videoNode.querySelector('.video-wrapper');
        if (wrapper && config.wrapperHeight) {
          wrapper.style.height = config.wrapperHeight;
          wrapper.style.aspectRatio = config.aspectRatio;
        }

        const video = document.getElementById('nodeVideoElement');
        if (video) {
          video.src = config.video;
          video.load();
          
          // Auto-play the swapped video so they see the result immediately!
          video.muted = true;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("Auto-play prevented after hotswap", error);
              // If it fails to autoplay, make sure the play button is visible
              const playBtn = document.getElementById('videoOverlayPlayBtn');
              if (playBtn) {
                playBtn.style.opacity = '1';
                playBtn.style.pointerEvents = 'auto';
              }
            });
          }
        }
      }

      // If choosing node was not connected, reveal the next node (LLM)
      if (!pipeline.connections['choosing-llm']) {
        const llmNode = document.getElementById('node-llm');
        if (llmNode) {
          llmNode.classList.remove('hidden-node');
          llmNode.classList.remove('disabled');
        }

        // Glow the choosing output port immediately
        const outPort = document.getElementById('port-choosing-out');
        if (outPort) {
          outPort.classList.add('glow-purple');
        }
      }

      drawWiring();
    }
    btn.addEventListener('click', handleStyleSelect);
    btn.addEventListener('touchstart', handleStyleSelect, { passive: false });
  });

  // 2. LLM Node Prompt Compile (Instant without typewriter animation)
  function triggerLLMCompile() {
    const llmNode = document.getElementById('node-llm');
    const promptText = document.getElementById('typewriterPrompt');
    const config = styleConfigs[pipeline.selectedStyle];

    // Remove glow from choosing port
    document.getElementById('port-choosing-out').classList.remove('glow-purple');

    // Turn LLM Node active
    llmNode.classList.remove('disabled');
    const statusDot = llmNode.querySelector('.node-status-dot');

    promptText.textContent = config.prompt;
    pipeline.llmCompiled = true;
    statusDot.classList.add('active');

    // Reveal Image Node dynamically!
    const imageNode = document.getElementById('node-image');
    if (imageNode) {
      imageNode.classList.remove('hidden-node');
      imageNode.classList.remove('disabled');
    }

    // Glow the output port of LLM Node
    document.getElementById('port-llm-out').classList.add('glow-purple');
    drawWiring();
  }

  // 3. Image Node Render (Instant without delay/spinner, loops through images in a slideshow)
  function triggerImageRender() {
    const imageNode = document.getElementById('node-image');
    const imgElement = document.getElementById('diffusionImage');
    const config = styleConfigs[pipeline.selectedStyle];

    // Remove glow from LLM port
    document.getElementById('port-llm-out').classList.remove('glow-purple');

    imageNode.classList.remove('disabled');
    const statusDot = imageNode.querySelector('.node-status-dot');

    if (slideshowInterval) {
      clearInterval(slideshowInterval);
      slideshowInterval = null;
    }

    // Dynamically adjust the height and aspect ratio of the Image compiler container!
    const imageWrapper = imageNode.querySelector('.image-preview-box');
    if (imageWrapper && config.wrapperHeight) {
      imageWrapper.style.height = config.wrapperHeight;
      imageWrapper.style.aspectRatio = config.aspectRatio;
    }

    imgElement.src = config.images[0];
    
    imgElement.onload = () => {
      // If already fully unlocked, this is a slideshow frame swap; skip compiling activations
      if (pipeline.imageGenerated) return;

      imgElement.classList.add('revealed');
      statusDot.classList.add('active');
      pipeline.imageGenerated = true;

      // Reveal Music, Suhail's Touch, and Video Compiler Node together dynamically!
      const musicNode = document.getElementById('node-music');
      const suhailNode = document.getElementById('node-suhail');
      const videoNode = document.getElementById('node-video');
      if (musicNode) musicNode.classList.remove('hidden-node');
      if (suhailNode) suhailNode.classList.remove('hidden-node');
      if (videoNode) {
        videoNode.classList.remove('hidden-node');
        videoNode.classList.remove('disabled');
      }

      // Glow the output port of Image Node
      document.getElementById('port-image-out').classList.add('glow-purple');
      drawWiring();

      // Start the slideshow with a 2-second gap
      slideshowIndex = 0;
      slideshowInterval = setInterval(() => {
        slideshowIndex = (slideshowIndex + 1) % config.images.length;
        imgElement.src = config.images[slideshowIndex];
      }, 2000);
    };
  }

  // 4. Music Node Volume Waveform Canvas
  const musicToggle = document.getElementById('musicToggleBtn');
  const waveCanvas = document.getElementById('waveformCanvas');
  const waveCtx = waveCanvas?.getContext('2d');
  let waveAnimId;

  // Waveform canvas resize
  if (waveCanvas) {
    waveCanvas.width = waveCanvas.clientWidth;
    waveCanvas.height = waveCanvas.clientHeight;
  }

  if (musicToggle) {
    function handleMusicToggle(e) {
      e.preventDefault();
      e.stopPropagation();
      // Do not toggle if wire is already connected
      if (pipeline.connections['music-video']) return;

      pipeline.audioEnabled = !pipeline.audioEnabled;

      if (pipeline.audioEnabled) {
        musicToggle.classList.add('active');
        musicToggle.querySelector('.music-label').textContent = 'Audio Tracks Armed';
        
        // Glow the output port of Music Node in green
        document.getElementById('port-music-out').classList.add('glow-green');
        animateWaveform();
      } else {
        musicToggle.classList.remove('active');
        musicToggle.querySelector('.music-label').textContent = 'Enable Audio';
        document.getElementById('port-music-out').classList.remove('glow-green');
        cancelAnimationFrame(waveAnimId);
        waveCtx?.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      }
      drawWiring();
    }
    musicToggle.addEventListener('click', handleMusicToggle);
    musicToggle.addEventListener('touchstart', handleMusicToggle, { passive: false });
  }

  const suhailToggle = document.getElementById('suhailToggleBtn');
  if (suhailToggle) {
    function handleSuhailToggle(e) {
      e.preventDefault();
      e.stopPropagation();
      // Do not toggle if wire is already connected
      if (pipeline.connections['suhail-video']) return;

      pipeline.suhailEnabled = !pipeline.suhailEnabled;

      if (pipeline.suhailEnabled) {
        suhailToggle.classList.add('active');
        suhailToggle.querySelector('.style-name').textContent = 'Creative Style Active';
        
        // Glow the output port of Suhail's Touch Node in orange
        document.getElementById('port-suhail-out').classList.add('glow-orange');
      } else {
        suhailToggle.classList.remove('active');
        suhailToggle.querySelector('.style-name').textContent = 'Apply Creative Style';
        document.getElementById('port-suhail-out').classList.remove('glow-orange');
      }
      drawWiring();
    }
    suhailToggle.addEventListener('click', handleSuhailToggle);
    suhailToggle.addEventListener('touchstart', handleSuhailToggle, { passive: false });
  }

  // Animated sound waves
  let wavePhase = 0;
  function animateWaveform() {
    if (!waveCtx || !waveCanvas) return;
    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
    
    waveCtx.lineWidth = 2;
    waveCtx.strokeStyle = 'rgba(57, 255, 20, 0.6)';
    waveCtx.beginPath();
    
    const sliceWidth = waveCanvas.width / 80;
    let x = 0;
    
    for (let i = 0; i < 80; i++) {
      // Create random beautiful pulsing amplitude shapes
      const amp = Math.sin(i * 0.15 + wavePhase) * (waveCanvas.height * 0.38);
      const noise = Math.cos(i * 0.3 - wavePhase * 1.5) * 5;
      const y = waveCanvas.height / 2 + amp + noise;

      if (i === 0) {
        waveCtx.moveTo(x, y);
      } else {
        waveCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    waveCtx.stroke();
    wavePhase += 0.08;
    waveAnimId = requestAnimationFrame(animateWaveform);
  }

  // 5. Video Node Locking and Compile Unlocking
  function checkVideoUnlock() {
    const videoNode = document.getElementById('node-video');
    videoNode.classList.remove('disabled');

    // Both audio, image, and suhail's touch connections must be locked
    if (pipeline.connections['image-video'] && pipeline.connections['music-video'] && pipeline.connections['suhail-video']) {
      triggerVideoUnlock();
    }
  }

  function triggerVideoUnlock() {
    try {
      const videoNode = document.getElementById('node-video');
      const lockOverlay = document.getElementById('videoLockOverlay');
      const playBtn = document.getElementById('videoOverlayPlayBtn');
      const video = document.getElementById('nodeVideoElement');
      
      // Fallback config just in case selectedStyle is somehow null or invalid
      let config = styleConfigs[pipeline.selectedStyle];
      if (!config) {
        config = styleConfigs['production_videos']; // Fallback
      }

      // Safely remove glow from output port signals
      document.getElementById('port-image-out')?.classList.remove('glow-purple');
      document.getElementById('port-music-out')?.classList.remove('glow-green');
      document.getElementById('port-suhail-out')?.classList.remove('glow-orange');

      const statusDot = videoNode?.querySelector('.node-status-dot');
      statusDot?.classList.add('active');

      // Dynamically adjust the height and aspect ratio of the Video Compiler container!
      const wrapper = videoNode?.querySelector('.video-wrapper');
      if (wrapper && config.wrapperHeight) {
        wrapper.style.height = config.wrapperHeight;
        wrapper.style.aspectRatio = config.aspectRatio;
      }

      // Load selected config video clip
      if (video) {
        video.src = config.video;
        video.load();
        
        // Auto-play the video silently so the user immediately sees the visual outcome
        video.muted = true;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            if (playBtn) {
              playBtn.style.opacity = '0';
              playBtn.style.pointerEvents = 'none';
            }
          }).catch(error => {
            console.warn("Auto-play prevented", error);
          });
        }
      }

      // Unlock instantly
      lockOverlay?.classList.add('unlocked');
      playBtn?.classList.add('visible');
      
    } catch (err) {
      // If something fails, show the error directly on the lock screen so we can debug!
      const lockText = document.querySelector('#videoLockOverlay .lock-text');
      if (lockText) {
        lockText.textContent = 'ERROR: ' + err.message + ' | ' + err.stack;
        lockText.style.color = 'red';
      }
      console.error(err);
    }
  }

  // Custom Video Player controls
  const playBtn = document.getElementById('videoOverlayPlayBtn');
  const videoElement = document.getElementById('nodeVideoElement');

  if (playBtn) {
    function handlePlayToggle(e) {
      e.preventDefault();
      e.stopPropagation();
      if (videoElement.paused) {
        // Mute background lofi sound tracks so video can play with full sound!
        const bgmAudio = window.bgm; // Global lofi background Audio variable
        if (bgmAudio) {
          gsap.to(bgmAudio, {
            volume: 0,
            duration: 0.8,
            onComplete: () => bgmAudio.pause()
          });
        }

        videoElement.muted = false;
        videoElement.play();
        playBtn.style.opacity = '0';
        playBtn.style.pointerEvents = 'none';
      } else {
        videoElement.pause();
        playBtn.style.opacity = '1';
        playBtn.style.pointerEvents = 'auto';
      }
    }
    playBtn.addEventListener('click', handlePlayToggle);
    playBtn.addEventListener('touchstart', handlePlayToggle, { passive: false });
  }

  if (videoElement) {
    function handleVideoClick(e) {
      e.preventDefault();
      e.stopPropagation();
      if (!videoElement.paused) {
        videoElement.pause();
        playBtn.style.opacity = '1';
        playBtn.style.pointerEvents = 'auto';
      }
    }
    videoElement.addEventListener('click', handleVideoClick);
    videoElement.addEventListener('touchstart', handleVideoClick, { passive: false });
  }
  // --- DYNAMIC BUBBLE TEXT ANIMATION (Animation removed) ---

  // Initial draw
  setTimeout(drawWiring, 800);
}

// Prevent DOMContentLoaded race conditions
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNodePipeline);
} else {
  initNodePipeline();
}
