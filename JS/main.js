$(function () {

    var flipbook = $("#flipbook");
    var currentZoom = 100;
    var isDragging = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var panOffsetX = 0;
    var panOffsetY = 0;
    var isPanning = false;
    var isFlipping = false;

    // Touch event variables
    var touchStartX = 0;
    var touchStartY = 0;
    var touchStartDistance = 0;
    var isTouching = false;
    var isMultiTouch = false;

    // Detect mobile device
    function isMobile() {
        return window.innerWidth <= 768;
    }

    // Get total pages from DOM
    var totalPages = flipbook.find('.page').length;

    // Initialize flipbook with responsive settings
    function initializeFlipbook() {
        var isMobileView = isMobile();
        var displayMode = isMobileView ? 'single' : 'double';
        var containerWidth = $(".flipbook-container").width();
        var containerHeight = $(".flipbook-container").height();
        var bookWidth = isMobileView ? containerWidth * 0.99 : 600;
var bookHeight = isMobileView 
? Math.min(containerHeight, containerWidth * 1.4)
: 800;

        // Destroy previous instance if exists
        if (flipbook.data('turn')) {
            flipbook.turn('destroy');
        }


        flipbook.turn({
            width: bookWidth,
            height: bookHeight,
            autoCenter: true,
            gradients: true,
            acceleration: true,
            pages: totalPages,
            display: displayMode,
            duration: isMobileView ? 600 : 800,
            elevation: isMobileView ? 0 : 50,
            when: {
                turned: function (event, page, view) {
                    updatePageIndicator();
                    isFlipping = false;
                },
                start: function (event, pageObject) {
                    isFlipping = true;
                }
            }
        });
    }

    // Update page indicator
    function updatePageIndicator() {
        var currentPage = flipbook.turn("page");
        $("#current-page").text(currentPage);
        $("#total-pages").text(totalPages);
        
        // Update progress bar
        var progressPercentage = ((currentPage - 1) / (totalPages - 1)) * 100;
        $("#progress-fill").css("width", progressPercentage + "%");
    }

    // Initialize on load
    initializeFlipbook();
    updatePageIndicator();

    // Re-initialize on window resize and orientation change
    var resizeTimer;
    $(window).on('resize orientationchange', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            initializeFlipbook();
            updatePageIndicator();

            // Reset zoom on mobile orientation change
            if (isMobile()) {
                currentZoom = 100;
                panOffsetX = 0;
                panOffsetY = 0;
                $("#zoom-slider").val(100);
            }
        }, 300);
    });

    // Arrow navigation with flip state management
    $("#prev-arrow").click(function () {
        if (!isFlipping) {
            flipbook.turn("previous");
        }
    });

    $("#next-arrow").click(function () {
        if (!isFlipping) {
            flipbook.turn("next");
        }
    });

    // Pan functionality
    function applyPan() {
        flipbook.css({
            "transition": "none"
        });

        var scale = currentZoom / 100;
        var translateX = panOffsetX / scale;
        var translateY = panOffsetY / scale;

        flipbook.css({
            "transform": "scale(" + scale + ") translate(" + translateX + "px, " + translateY + "px)"
        });
    }

    function constrainPan() {
        var scale = currentZoom / 100;
        var flipbookWidth = flipbook.width();
        var flipbookHeight = flipbook.height();
        var scaledWidth = flipbookWidth * scale;
        var scaledHeight = flipbookHeight * scale;

        var maxX = (scaledWidth - flipbookWidth) / 2;
        var maxY = (scaledHeight - flipbookHeight) / 2;

        panOffsetX = Math.max(-maxX, Math.min(maxX, panOffsetX));
        panOffsetY = Math.max(-maxY, Math.min(maxY, panOffsetY));
    }

    // Calculate distance between two touch points
    function getTouchDistance(touches) {
        if (touches.length < 2) return 0;
        var dx = touches[0].clientX - touches[1].clientX;
        var dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Touch events for mobile
    flipbook.on("touchstart", function (e) {
        if (isFlipping) {
            e.preventDefault();
            return false;
        }

        isTouching = true;
        isMultiTouch = e.touches.length > 1;

        if (isMultiTouch) {
            // Pinch-to-zoom - capture initial pinch state
            touchStartDistance = getTouchDistance(e.touches);
            e.preventDefault();
        } else {
            // Single touch - swipe or pan
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isDragging = true;
            isPanning = false;
        }
    });

    flipbook.on("touchmove", function (e) {
        if (isFlipping) {
            e.preventDefault();
            return false;
        }

        if (isMultiTouch && e.touches.length > 1) {
            // Pinch-to-zoom logic with improved smoothness
            e.preventDefault();
            var currentDistance = getTouchDistance(e.touches);

            // Smooth scaling
            var pinchRatio = currentDistance / touchStartDistance;
            var newZoom = Math.max(50, Math.min(200, currentZoom * pinchRatio));

            // Apply zoom immediately without debounce for smooth pinch
            var scale = newZoom / 100;
            flipbook.css({
                "transform": "scale(" + scale + ") translate(" + (panOffsetX / scale) + "px, " + (panOffsetY / scale) + "px)",
                "transform-origin": "center center",
                "transition": "none"
            });

            currentZoom = newZoom;
            touchStartDistance = currentDistance;
        } else if (isDragging && !isFlipping && !isMultiTouch) {
            if (currentZoom > 100) {
                // Zoomed: pan the page with one finger
                e.preventDefault();
                isPanning = true;
                panOffsetX += (e.touches[0].clientX - touchStartX) / (currentZoom / 100);
                panOffsetY += (e.touches[0].clientY - touchStartY) / (currentZoom / 100);

                constrainPan();
                applyPan();

                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            } else {
                // Normal zoom: prepare for swipe
                flipbook.css("opacity", 0.95);
            }
        }
    });

    flipbook.on("touchend", function (e) {
        if (isDragging && !isFlipping && !isMultiTouch) {
            if (currentZoom > 100) {
                // Zoomed: panning mode - just reset
                flipbook.css("opacity", 1);
                isPanning = false;
            } else {
                // Normal zoom: swipe mode
                if (e.changedTouches.length > 0) {
                    var swipeDistance = touchStartX - e.changedTouches[0].clientX;

                    // Require minimum 30px swipe on mobile for better responsiveness
                    if (Math.abs(swipeDistance) > 30) {
                        isFlipping = true;

                        if (swipeDistance > 0) {
                            // Swiped left - go to next page
                            flipbook.turn("next");
                        } else {
                            // Swiped right - go to previous page
                            flipbook.turn("previous");
                        }
                    }
                }

                flipbook.css("opacity", 1);
            }
            isDragging = false;
        }

        isTouching = false;
        isMultiTouch = false;
    });

    // Mouse drag-to-flip and drag-to-pan functionality
    flipbook.on("mousedown", function (e) {
        if (isFlipping || isTouching) {
            e.preventDefault();
            return false;
        }

        isDragging = true;
        dragStartX = e.pageX;
        dragStartY = e.pageY;
        isPanning = false;

        if (currentZoom > 100) {
            flipbook.css("cursor", "grabbing");
        }
    });

    $(document).on("mousemove", function (e) {
        if (isDragging && !isFlipping && !isTouching) {
            var deltaX = e.pageX - dragStartX;
            var deltaY = e.pageY - dragStartY;

            if (currentZoom > 100) {
                isPanning = true;
                panOffsetX += (e.pageX - dragStartX) / (currentZoom / 100);
                panOffsetY += (e.pageY - dragStartY) / (currentZoom / 100);

                constrainPan();
                applyPan();

                dragStartX = e.pageX;
                dragStartY = e.pageY;
            } else {
                if (Math.abs(deltaX) > 10) {
                    flipbook.css("opacity", 0.95);
                }
            }
        }
    });

    $(document).on("mouseup", function (e) {
        if (isDragging && !isFlipping && !isTouching) {
            if (currentZoom > 100) {
                flipbook.css({
                    "opacity": 1,
                    "cursor": "grab"
                });
                isPanning = false;
            } else {
                var dragDistance = e.pageX - dragStartX;

                if (Math.abs(dragDistance) > 80) {
                    isFlipping = true;

                    if (dragDistance > 0) {
                        flipbook.turn("previous");
                    } else {
                        flipbook.turn("next");
                    }
                }

                flipbook.css("opacity", 1);
            }
            isDragging = false;
        }
    });

    flipbook.on("mouseenter", function () {
        if (!isFlipping && currentZoom > 100) {
            flipbook.css("cursor", "grab");
        }
    });

    flipbook.on("mouseleave", function () {
        if (!isFlipping) {
            flipbook.css("cursor", "default");
        }
    });

    // Zoom functionality
    var zoomTimeout;

    function applyZoom(zoomLevel) {
        if (isFlipping) return;

        var newZoom = zoomLevel / 100;
        var scale = newZoom;
        var translateX = panOffsetX / scale;
        var translateY = panOffsetY / scale;

        flipbook.css({
            "transform": "scale(" + scale + ") translate(" + translateX + "px, " + translateY + "px)",
            "transform-origin": "center center",
            "transition": "transform 0.3s ease-out"
        });
        currentZoom = zoomLevel;

        if (zoomLevel === 100) {
            setTimeout(function () {
                panOffsetX = 0;
                panOffsetY = 0;
                flipbook.css("transition", "none");
            }, 300);
        }
    }

    $("#zoom-slider").on("input", function () {
        clearTimeout(zoomTimeout);
        var value = $(this).val();

        zoomTimeout = setTimeout(function () {
            applyZoom(value);
        }, 10);
    });

    $("#zoom-out").click(function () {
        if (!isFlipping) {
            var newZoom = Math.max(50, currentZoom - 10);
            $("#zoom-slider").val(newZoom).trigger("input");
        }
    });

    $("#zoom-in").click(function () {
        if (!isFlipping) {
            var newZoom = Math.min(200, currentZoom + 10);
            $("#zoom-slider").val(newZoom).trigger("input");
        }
    });

    // Fullscreen functionality
    $("#fullscreen-btn").click(function () {
        if (isFlipping) return;

        var elem = document.documentElement;

        if (!document.fullscreenElement &&
            !document.webkitFullscreenElement &&
            !document.mozFullScreenElement &&
            !document.msFullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    });

});


