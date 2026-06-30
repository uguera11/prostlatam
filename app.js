// app.js - Logic for the dynamic quiz player

document.addEventListener("DOMContentLoaded", function() {
    const quizData = window.QUIZ_DATA;
    if (!quizData) {
        console.error("Quiz data not loaded!");
        return;
    }

    const container = document.getElementById("quiz-container");
    const header = document.getElementById("quiz-header");
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const backBtn = document.getElementById("back-btn");

    // Navigation state
    let currentStepId = quizData.steps[0].id;
    let stepHistory = [];
    let answers = {}; // store answers if needed

    // Find step by ID
    function getStepById(id) {
        return quizData.steps.find(step => step.id === id);
    }

    // Get index of step to calculate progress percentage
    function getStepIndex(id) {
        return quizData.steps.findIndex(step => step.id === id);
    }

    // Go to step
    function goToStep(id, pushHistory = true) {
        const step = getStepById(id);
        if (!step) {
            console.error("Step not found:", id);
            return;
        }

        // Stop any playing audios before leaving
        stopAllAudios();

        if (pushHistory && currentStepId && currentStepId !== id) {
            stepHistory.push(currentStepId);
        }

        currentStepId = id;
        renderStep(step);
        updateProgress();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Go back
    function goBack() {
        if (stepHistory.length > 0) {
            const prevId = stepHistory.pop();
            goToStep(prevId, false);
        }
    }

    // Update Header and Progress bar
    function updateProgress() {
        const index = getStepIndex(currentStepId);
        const total = quizData.steps.length;
        
        // Show/hide back button and header
        if (index === 0) {
            header.classList.add("hidden");
        } else {
            header.classList.remove("hidden");
        }

        if (stepHistory.length === 0) {
            backBtn.style.visibility = "hidden";
        } else {
            backBtn.style.visibility = "visible";
        }

        // Calculate percent
        const percent = Math.round((index / (total - 1)) * 100);
        progressBar.style.width = percent + "%";
        progressText.textContent = percent + "%";
    }

    // Render step
    function renderStep(step) {
        container.innerHTML = "";
        
        const stepDiv = document.createElement("div");
        stepDiv.className = "quiz-step";
        stepDiv.dataset.stepId = step.id;

        // Check if this step is a loading step
        const hasLoading = step.layers.some(l => l.type === "loading");
        
        // Render each layer
        step.layers.forEach((layer, index) => {
            // Skip the text and metric layers that are embedded inside the arguments comparison cards in step 27
            if (layer.id === "lJYx6E" || layer.id === "xHOPgO" || layer.id === "VDlDQQ" || layer.id === "HM1fjV") {
                return;
            }
            const layerEl = renderLayer(layer, step);
            if (layerEl) {
                stepDiv.appendChild(layerEl);
            }
        });

        container.appendChild(stepDiv);

        // If it's a loading step, handle auto-redirect
        if (hasLoading) {
            handleLoadingStep(step);
        }
    }

    // Render a single layer
    function renderLayer(layer, step) {
        const type = layer.type;
        const content = layer.content;
        if (!content) return null;

        const wrapper = document.createElement("div");
        wrapper.className = `layer-wrapper type-${type}`;
        wrapper.dataset.layerId = layer.id;

        switch (type) {
            case "text":
                const textDiv = document.createElement("div");
                textDiv.className = "layer-text";
                textDiv.innerHTML = content.text || "";
                wrapper.appendChild(textDiv);
                break;

            case "image":
                if (content.image && content.image.src) {
                    const imgDiv = document.createElement("div");
                    imgDiv.className = "layer-image";
                    const img = document.createElement("img");
                    img.src = content.image.src;
                    img.alt = layer.title || "Imagem";
                    imgDiv.appendChild(img);
                    wrapper.appendChild(imgDiv);
                }
                break;

            case "clear":
                const spacer = document.createElement("div");
                spacer.className = "layer-spacer";
                // parse height classes like h-[2rem] to inline styles
                let height = "1.5rem";
                if (content.clear) {
                    const match = content.clear.match(/h-\[([^\]]+)\]/);
                    if (match) height = match[1];
                }
                spacer.style.height = height;
                wrapper.appendChild(spacer);
                break;

            case "button":
                const btn = document.createElement("button");
                btn.className = "btn-primary";
                if (layer.design && layer.design.pulse) {
                    btn.classList.add("pulse-btn");
                }
                btn.innerHTML = content.label || "Continuar";
                
                btn.addEventListener("click", function() {
                    handleNavigation(content.type, content.destination);
                });
                
                wrapper.appendChild(btn);
                break;

            case "options":
                const optionsGrid = document.createElement("div");
                const gridClass = (layer.design && layer.design.grid) || "grid-cols-1";
                optionsGrid.className = `options-grid ${gridClass}`;

                const isMultiple = content.multiple || false;
                const optionsList = content.options || [];

                optionsList.forEach((opt, oIdx) => {
                    const optCard = document.createElement("div");
                    optCard.className = "option-card";
                    if (isMultiple) {
                        optCard.classList.add("checklist-item");
                    }
                    optCard.dataset.optionId = opt.id;
                    optCard.dataset.destination = opt.destination;

                    // Indicator for checklist
                    if (isMultiple) {
                        const checkInd = document.createElement("div");
                        checkInd.className = "checkbox-indicator";
                        checkInd.innerHTML = '<i class="fa-solid fa-check"></i>';
                        optCard.appendChild(checkInd);
                    }

                    // Emoji/Image
                    if (opt.image) {
                        if (opt.image.type === "emoji" && opt.image.src) {
                            const emojiSpan = document.createElement("div");
                            emojiSpan.className = "option-emoji";
                            emojiSpan.textContent = opt.image.src;
                            optCard.appendChild(emojiSpan);
                        } else if (opt.image.src) {
                            const imgDiv = document.createElement("div");
                            imgDiv.className = "option-image";
                            const img = document.createElement("img");
                            img.src = opt.image.src;
                            imgDiv.appendChild(img);
                            optCard.appendChild(imgDiv);
                        }
                    }

                    // Label/Text
                    const textSpan = document.createElement("div");
                    textSpan.className = "option-text";
                    textSpan.innerHTML = opt.label || "";
                    optCard.appendChild(textSpan);

                    // Add initial active state if configured
                    if (opt.selected || opt.chosen) {
                        optCard.classList.add("active");
                        if (isMultiple) {
                            if (!answers[layer.id]) answers[layer.id] = [];
                            answers[layer.id].push(opt.id);
                        }
                    }

                    // Click handler
                    optCard.addEventListener("click", function() {
                        if (isMultiple) {
                            optCard.classList.toggle("active");
                            // toggle selection in answers
                            if (!answers[layer.id]) answers[layer.id] = [];
                            const idx = answers[layer.id].indexOf(opt.id);
                            if (idx > -1) {
                                answers[layer.id].splice(idx, 1);
                            } else {
                                answers[layer.id].push(opt.id);
                            }
                        } else {
                            // single choice: highlight and transition
                            document.querySelectorAll(".option-card").forEach(c => c.classList.remove("active"));
                            optCard.classList.add("active");
                            
                            // Save answer
                            answers[layer.id] = opt.id;
                            
                            setTimeout(() => {
                                handleNavigation("next", opt.destination);
                            }, 250);
                        }
                    });

                    optionsGrid.appendChild(optCard);
                });

                wrapper.appendChild(optionsGrid);
                break;

            case "notification":
                const notifDiv = document.createElement("div");
                const styleClass = (layer.design && layer.design.style) || "default";
                notifDiv.className = `layer-notification ${styleClass}`;

                if (content.title) {
                    const title = document.createElement("div");
                    title.className = "notification-title";
                    title.innerHTML = content.title;
                    notifDiv.appendChild(title);
                }
                if (content.text) {
                    const text = document.createElement("div");
                    text.className = "notification-text";
                    text.innerHTML = content.text;
                    notifDiv.appendChild(text);
                }
                wrapper.appendChild(notifDiv);
                break;

            case "metric":
                const metricDiv = document.createElement("div");
                metricDiv.className = "metric-bar-wrapper";

                const mHeader = document.createElement("div");
                mHeader.className = "metric-header";
                
                const mTitle = document.createElement("span");
                mTitle.innerHTML = content.title || "Progreso";
                mHeader.appendChild(mTitle);

                const mPercent = document.createElement("span");
                mPercent.className = "metric-percent";
                mPercent.textContent = "0%";
                mHeader.appendChild(mPercent);
                
                metricDiv.appendChild(mHeader);

                const mTrack = document.createElement("div");
                mTrack.className = "metric-track";
                
                const mFill = document.createElement("div");
                const barColor = (layer.design && layer.design.color) || "bg-green-500";
                mFill.className = `metric-fill ${barColor}`;
                mTrack.appendChild(mFill);
                
                metricDiv.appendChild(mTrack);
                wrapper.appendChild(metricDiv);

                // Animate progress bar fill after injection
                setTimeout(() => {
                    const targetVal = parseInt(content.percent || "100");
                    mFill.style.width = targetVal + "%";
                    // Animate text counter
                    let currentVal = 0;
                    const interval = setInterval(() => {
                        if (currentVal >= targetVal) {
                            mPercent.textContent = targetVal + "%";
                            clearInterval(interval);
                        } else {
                            currentVal += Math.ceil(targetVal / 30);
                            if (currentVal > targetVal) currentVal = targetVal;
                            mPercent.textContent = currentVal + "%";
                        }
                    }, 30);
                }, 300);

                break;

            case "audio":
                const audioPlayer = document.createElement("div");
                audioPlayer.className = "audio-player";

                // Profile avatar
                const audioAv = document.createElement("div");
                audioAv.className = "audio-avatar";
                const avImg = document.createElement("img");
                avImg.src = (content.image && content.image.src) || "images/sintomas.jpg";
                audioAv.appendChild(avImg);
                audioPlayer.appendChild(audioAv);

                // Play Button
                const playBtn = document.createElement("button");
                playBtn.className = "audio-controls";
                playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                audioPlayer.appendChild(playBtn);

                // Audio Details / Timeline
                const audioInfo = document.createElement("div");
                audioInfo.className = "audio-info";

                const senderName = document.createElement("div");
                senderName.className = "audio-sender";
                senderName.textContent = content.sender || "Reprodutor de Áudio";
                audioInfo.appendChild(senderName);

                const timeline = document.createElement("div");
                timeline.className = "audio-timeline";
                const progress = document.createElement("div");
                progress.className = "audio-progress";
                timeline.appendChild(progress);
                audioInfo.appendChild(timeline);

                const timeInfo = document.createElement("div");
                timeInfo.className = "audio-time";
                const curTime = document.createElement("span");
                curTime.textContent = "0:00";
                const totalTime = document.createElement("span");
                totalTime.textContent = "--:--";
                timeInfo.appendChild(curTime);
                timeInfo.appendChild(totalTime);
                audioInfo.appendChild(timeInfo);

                audioPlayer.appendChild(audioInfo);
                wrapper.appendChild(audioPlayer);

                // Audio object creation
                if (content.audio && content.audio.src) {
                    const audio = new Audio(content.audio.src);
                    audio.preload = "metadata";

                    audio.addEventListener("loadedmetadata", function() {
                        totalTime.textContent = formatTime(audio.duration);
                    });

                    audio.addEventListener("timeupdate", function() {
                        const pct = (audio.currentTime / audio.duration) * 100;
                        progress.style.width = pct + "%";
                        curTime.textContent = formatTime(audio.currentTime);
                    });

                    audio.addEventListener("ended", function() {
                        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        progress.style.width = "0%";
                        curTime.textContent = "0:00";
                    });

                    playBtn.addEventListener("click", function() {
                        if (audio.paused) {
                            // Stop other playing audios first
                            stopAllAudios();
                            audio.play();
                            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        } else {
                            audio.pause();
                            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        }
                    });

                    // Timeline scrubbing
                    timeline.addEventListener("click", function(e) {
                        const rect = timeline.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const width = rect.width;
                        const pct = clickX / width;
                        audio.currentTime = pct * audio.duration;
                    });

                    // Store in window for cleanup
                    if (!window.activeAudioObjects) window.activeAudioObjects = [];
                    window.activeAudioObjects.push(audio);
                }
                break;

            case "carousel":
                const carouselWrapper = document.createElement("div");
                carouselWrapper.className = "carousel-wrapper";

                const slides = document.createElement("div");
                slides.className = "carousel-slides";

                const items = content.items || [];
                items.forEach(item => {
                    if (item.image && item.image.src) {
                        const slide = document.createElement("div");
                        slide.className = "carousel-slide";
                        const img = document.createElement("img");
                        img.src = item.image.src;
                        slide.appendChild(img);
                        slides.appendChild(slide);
                    }
                });

                carouselWrapper.appendChild(slides);

                // Next/prev navigation buttons
                if (items.length > 1) {
                    const prevBtn = document.createElement("button");
                    prevBtn.className = "carousel-btn carousel-btn-prev";
                    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
                    
                    const nextBtn = document.createElement("button");
                    nextBtn.className = "carousel-btn carousel-btn-next";
                    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

                    carouselWrapper.appendChild(prevBtn);
                    carouselWrapper.appendChild(nextBtn);

                    const dots = document.createElement("div");
                    dots.className = "carousel-dots";

                    items.forEach((_, idx) => {
                        const dot = document.createElement("div");
                        dot.className = "carousel-dot" + (idx === 0 ? " active" : "");
                        dot.addEventListener("click", () => showSlide(idx));
                        dots.appendChild(dot);
                    });

                    wrapper.appendChild(carouselWrapper);
                    wrapper.appendChild(dots);

                    let currentIndex = 0;
                    function showSlide(index) {
                        if (index < 0) index = items.length - 1;
                        if (index >= items.length) index = 0;
                        currentIndex = index;
                        slides.style.transform = `translateX(-${index * 100}%)`;
                        
                        // Update active dot
                        dots.querySelectorAll(".carousel-dot").forEach((d, i) => {
                            if (i === index) d.classList.add("active");
                            else d.classList.remove("active");
                        });
                    }

                    prevBtn.addEventListener("click", () => showSlide(currentIndex - 1));
                    nextBtn.addEventListener("click", () => showSlide(currentIndex + 1));
                } else {
                    wrapper.appendChild(carouselWrapper);
                }
                break;

            case "quotes":
                const qContainer = document.createElement("div");
                qContainer.className = "quotes-container";

                const quotesList = content.quotes || [];
                quotesList.forEach(q => {
                    const qCard = document.createElement("div");
                    qCard.className = "quote-card";

                    const qHeader = document.createElement("div");
                    qHeader.className = "quote-header";

                    const qAvatar = document.createElement("div");
                    qAvatar.className = "quote-avatar";
                    const avImg = document.createElement("img");
                    avImg.src = q.image ? q.image.src : "images/sintomas.jpg";
                    qAvatar.appendChild(avImg);
                    qHeader.appendChild(qAvatar);

                    const authInfo = document.createElement("div");
                    authInfo.className = "quote-author-info";
                    const authName = document.createElement("span");
                    authName.className = "quote-author-name";
                    authName.textContent = q.name || "Depoimento";
                    const authAct = document.createElement("span");
                    authAct.className = "quote-author-activity";
                    authAct.textContent = q.activity || "";
                    
                    authInfo.appendChild(authName);
                    authInfo.appendChild(authAct);

                    const stars = document.createElement("div");
                    stars.className = "quote-stars";
                    for (let sVal = 0; sVal < 5; sVal++) {
                        stars.innerHTML += '<i class="fa-solid fa-star"></i>';
                    }
                    authInfo.appendChild(stars);

                    qHeader.appendChild(authInfo);
                    qCard.appendChild(qHeader);

                    const qText = document.createElement("div");
                    qText.className = "quote-text";
                    qText.textContent = q.text || "";
                    qCard.appendChild(qText);

                    qContainer.appendChild(qCard);
                });

                wrapper.appendChild(qContainer);
                break;

            case "price":
                const priceCard = document.createElement("div");
                priceCard.className = "checkout-offer-card";

                if (content.title) {
                    const priceTitle = document.createElement("div");
                    priceTitle.innerHTML = content.title;
                    priceCard.appendChild(priceTitle);
                }

                if (content.before) {
                    const beforeText = document.createElement("div");
                    beforeText.className = "offer-por-apenas";
                    beforeText.textContent = content.before;
                    priceCard.appendChild(beforeText);
                }

                if (content.value) {
                    const valueVal = document.createElement("div");
                    valueVal.className = "offer-current-value";
                    valueVal.textContent = content.value;
                    priceCard.appendChild(valueVal);
                }

                wrapper.appendChild(priceCard);
                break;

            case "video":
                const videoDiv = document.createElement("div");
                videoDiv.className = "layer-video";
                
                // Content is usually iframe string, e.g. <iframe width="660" height="1174" ...
                let videoHtml = content.video || "";
                // modify frame width and height to fit container
                videoHtml = videoHtml.replace(/width="[^"]+"/, 'width="100%"').replace(/height="[^"]+"/, 'height="100%"');
                videoDiv.innerHTML = videoHtml;
                
                wrapper.appendChild(videoDiv);
                break;

            case "arguments":
                const argsGrid = document.createElement("div");
                argsGrid.className = "arguments-grid";
                const colsClass = (content.cols) || "grid-cols-2";
                argsGrid.classList.add(colsClass);

                const argList = content.arguments || [];
                argList.forEach((arg, aIdx) => {
                    const argCard = document.createElement("div");
                    argCard.className = "argument-card";

                    // Title
                    const argTitle = document.createElement("div");
                    argTitle.className = "argument-title";
                    let titleText = arg.text || "";
                    argTitle.innerHTML = titleText;
                    argCard.appendChild(argTitle);

                    // Image
                    if (arg.image && arg.image.src) {
                        const imgWrapper = document.createElement("div");
                        imgWrapper.className = "argument-image";
                        const img = document.createElement("img");
                        let src = arg.image.src;
                        if (src.includes("antes_despues.jpg")) {
                            if (aIdx === 0) {
                                src = "https://media.inlead.cloud/uploads/23849/2025-10-24/mrjBS-antes.webp";
                            } else {
                                src = "https://media.inlead.cloud/uploads/23849/2025-10-24/5HcEO-depois.webp";
                            }
                        }
                        img.src = src;
                        imgWrapper.appendChild(img);
                        argCard.appendChild(imgWrapper);
                    }
                    // Description
                    const argDesc = document.createElement("div");
                    argDesc.className = "argument-description";
                    const descLayerId = aIdx === 0 ? "lJYx6E" : "xHOPgO";
                    const descLayer = step.layers.find(l => l.id === descLayerId);
                    if (descLayer && descLayer.content && descLayer.content.text) {
                        argDesc.innerHTML = descLayer.content.text;
                    } else {
                        if (aIdx === 0) {
                            argDesc.innerHTML = "<p><strong>Este é você sendo afetado pelos parasitas:</strong> cada dia com mais dificuldade para urinar e perdendo, aos poucos, seu desempenho sexual.</p>";
                        } else {
                            argDesc.innerHTML = "<p><strong>Este é você livre da HPB:</strong> próstata controlada, noites bem dormidas, sem pinga-pinga e com o desempenho sexual de quando tinha 25 anos.</p>";
                        }
                    }
                    argCard.appendChild(argDesc);

                    // Sliders
                    const sliderWrapper = document.createElement("div");
                    sliderWrapper.className = "argument-slider-wrapper";
                    
                    const sliderTrack = document.createElement("div");
                    sliderTrack.className = "argument-slider-track";
                    
                    const metricLayerId = aIdx === 0 ? "VDlDQQ" : "HM1fjV";
                    const metricLayer = step.layers.find(l => l.id === metricLayerId);
                    let percentVal = aIdx === 0 ? 40 : 97;
                    let isActive = aIdx === 1;
                    
                    if (metricLayer && metricLayer.content) {
                        percentVal = parseInt(metricLayer.content.percent || (aIdx === 0 ? "40" : "97"));
                        if (metricLayer.design && metricLayer.design.color) {
                            isActive = metricLayer.design.color.includes("green") || metricLayer.design.color !== "light";
                        }
                    }

                    if (isActive) {
                        sliderTrack.classList.add("slider-track-active");
                    }
                    
                    const sliderHandle = document.createElement("div");
                    sliderHandle.className = "argument-slider-handle";
                    sliderHandle.style.left = percentVal + "%";
                    
                    sliderTrack.appendChild(sliderHandle);
                    sliderWrapper.appendChild(sliderTrack);
                    argCard.appendChild(sliderWrapper);

                    argsGrid.appendChild(argCard);
                });

                wrapper.appendChild(argsGrid);
                break;

            default:
                console.warn("Unsupported layer type:", type);
                break;
        }

        return wrapper;
    }

    // Handle button or single choice click transitions
    function handleNavigation(navType, destination) {
        if (!destination) return;

        if (navType === "redirect" || destination.startsWith("http")) {
            // Redirect to checkout URL
            window.location.href = destination;
        } else if (destination === "next") {
            // Find next step in array
            const currIdx = getStepIndex(currentStepId);
            if (currIdx < quizData.steps.length - 1) {
                const nextStep = quizData.steps[currIdx + 1];
                goToStep(nextStep.id);
            }
        } else {
            // Go to specific step ID
            goToStep(destination);
        }
    }

    // Stop and clean up all audios
    function stopAllAudios() {
        if (window.activeAudioObjects) {
            window.activeAudioObjects.forEach(audio => {
                audio.pause();
            });
        }
        document.querySelectorAll(".audio-controls").forEach(btn => {
            btn.innerHTML = '<i class="fa-solid fa-play"></i>';
        });
    }

    // Formatter for audio duration (seconds to m:ss)
    function formatTime(secs) {
        if (isNaN(secs)) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return m + ":" + (s < 10 ? "0" : "") + s;
    }

    // Handle simulation loaders in loading steps
    function handleLoadingStep(step) {
        const loadingLayer = step.layers.find(l => l.type === "loading");
        const sec = (loadingLayer && loadingLayer.content.seconds) || 3;
        const dest = (loadingLayer && loadingLayer.content.destination) || "next";

        // Inject loader element
        const loadWrapper = document.createElement("div");
        loadWrapper.className = "loading-container";
        
        const spinner = document.createElement("div");
        spinner.className = "loader-spinner";
        loadWrapper.appendChild(spinner);

        const text = document.createElement("div");
        text.className = "loading-text";
        text.innerHTML = (loadingLayer && loadingLayer.content.description) || "Processando...";
        loadWrapper.appendChild(text);

        container.appendChild(loadWrapper);

        // Simulation interval to transition automatically
        setTimeout(() => {
            handleNavigation("next", dest);
        }, sec * 1000);
    }

    // Set back click listener
    backBtn.addEventListener("click", goBack);

    // Initialize first step
    goToStep(currentStepId, false);
});
