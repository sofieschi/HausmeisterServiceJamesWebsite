"use strict";

(() => {
  const MEDIA_DESKTOP_NAV = "(min-width: 56.25rem)";
  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
  const MEDIA_PARALLAX_DISABLED = "(max-width: 56.24rem)";
  const HERO_TOPBAR_BUFFER_PX = 24;
  const REVEAL_BASE_DELAY_MS = 90;
  const REVEAL_GROUP_STAGGER_MS = 110;
  const REVEAL_SERVICE_STAGGER_MS = 500;

  const getScrollY = () => window.scrollY || window.pageYOffset || 0;
  const isDesktopNav = () => window.matchMedia(MEDIA_DESKTOP_NAV).matches;
  const onMediaQueryChange = (query, handler) => {
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handler);
      return;
    }

    if (typeof query.addListener === "function") {
      query.addListener(handler);
    }
  };

  const yearTarget = document.getElementById("year");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }

  const initHeaderCompactState = () => {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }
    const heroSection = document.querySelector(".hero");

    header.classList.add("is-initializing");

    let rafId = 0;
    const syncHeaderState = () => {
      rafId = 0;
      const currentScrollY = getScrollY();
      const shouldCompact = currentScrollY > 18;
      header.classList.toggle("is-scrolled", shouldCompact);

      if (currentScrollY <= 10) {
        header.classList.remove("is-topbar-hidden");
        return;
      }

      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom;
        const topbarVisibleZone = (header.offsetHeight || 0) + HERO_TOPBAR_BUFFER_PX;
        const isWithinHeroZone = heroBottom > topbarVisibleZone;
        header.classList.toggle("is-topbar-hidden", !isWithinHeroZone);
      } else {
        header.classList.add("is-topbar-hidden");
      }
    };

    const requestSync = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(syncHeaderState);
    };

    syncHeaderState();
    window.requestAnimationFrame(() => {
      header.classList.remove("is-initializing");
    });
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
  };

  initHeaderCompactState();

  const menuButton = document.querySelector(".menu-toggle");
  const primaryNav = document.getElementById("primary-nav");

  if (menuButton && primaryNav) {
    const setMenuState = (isOpen) => {
      primaryNav.classList.toggle("is-open", isOpen);
      menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    menuButton.addEventListener("click", () => {
      const isOpen = primaryNav.classList.contains("is-open");
      setMenuState(!isOpen);
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        setMenuState(false);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && primaryNav.classList.contains("is-open")) {
        setMenuState(false);
        menuButton.focus();
      }
    });

    document.addEventListener("click", (event) => {
      const isMobile = !isDesktopNav();
      if (!isMobile || !primaryNav.classList.contains("is-open")) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !primaryNav.contains(target) && !menuButton.contains(target)) {
        setMenuState(false);
      }
    });

    window.addEventListener("resize", () => {
      if (isDesktopNav()) {
        setMenuState(false);
      }
    });
  }

  const initReveal = () => {
    const revealElements = Array.from(document.querySelectorAll(".reveal"));
    if (!revealElements.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(MEDIA_REDUCED_MOTION).matches;
    const desktopServicesQuery = window.matchMedia(MEDIA_DESKTOP_NAV);
    const revealGroupIndex = new Map();
    const serviceCardElements = Array.from(document.querySelectorAll(".services-grid .service-card.reveal"));
    const serviceSection = document.getElementById("leistungen");
    const serviceCardSet = new Set(serviceCardElements);
    const defaultRevealElements = revealElements.filter((element) => !serviceCardSet.has(element));

    const updateServiceCardDelays = () => {
      if (!serviceCardElements.length) {
        return;
      }

      const servicesGrid = serviceCardElements[0].closest(".services-grid");
      const gridTemplateColumns = servicesGrid ? window.getComputedStyle(servicesGrid).gridTemplateColumns : "";
      const columnCount = gridTemplateColumns
        .split(" ")
        .map((value) => value.trim())
        .filter(Boolean).length;
      const cardsPerRow = desktopServicesQuery.matches && columnCount > 1 ? columnCount : 1;

      serviceCardElements.forEach((element, index) => {
        const staggerIndex = desktopServicesQuery.matches ? Math.floor(index / cardsPerRow) : index;
        element.style.setProperty("--reveal-delay", `${staggerIndex * REVEAL_SERVICE_STAGGER_MS}ms`);
      });
    };

    updateServiceCardDelays();

    defaultRevealElements.forEach((element) => {
      const delayAttr = element.getAttribute("data-reveal-delay");
      const delay = delayAttr ? Number.parseInt(delayAttr, 10) : 0;
      let staggerDelay = 0;

      if (!(Number.isFinite(delay) && delay >= 0)) {
        const groupElement = element.closest("[data-reveal-group]");
        if (groupElement) {
          const groupKey = groupElement.getAttribute("data-reveal-group") || "__group__";
          const groupIndex = revealGroupIndex.get(groupKey) || 0;
          staggerDelay = groupIndex * REVEAL_GROUP_STAGGER_MS;
          revealGroupIndex.set(groupKey, groupIndex + 1);
        }
      }

      const explicitDelay = Number.isFinite(delay) && delay >= 0 ? delay : 0;
      const finalDelay = REVEAL_BASE_DELAY_MS + explicitDelay + staggerDelay;
      element.style.setProperty("--reveal-delay", `${finalDelay}ms`);
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => {
        element.classList.add("is-visible");
      });
      return;
    }

    const defaultObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          defaultObserver.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08,
      }
    );

    defaultRevealElements.forEach((element) => {
      defaultObserver.observe(element);
    });

    if (serviceSection && serviceCardElements.length) {
      const serviceObserver = new IntersectionObserver(
        (entries, observer) => {
          const isVisible = entries.some((entry) => entry.isIntersecting);
          if (!isVisible) {
            return;
          }

          serviceCardElements.forEach((card) => {
            card.classList.add("is-visible");
          });

          observer.unobserve(serviceSection);
          observer.disconnect();
        },
        {
          root: null,
          rootMargin: "0px 0px -8% 0px",
          threshold: 0.14,
        }
      );

      serviceObserver.observe(serviceSection);
    }

    window.addEventListener("resize", updateServiceCardDelays);
    desktopServicesQuery.addEventListener("change", updateServiceCardDelays);
  };

  initReveal();

  const initHeroParallax = () => {
    const hero = document.querySelector(".hero.parallax-enabled");
    if (!hero) {
      return;
    }

    const reducedMotionQuery = window.matchMedia(MEDIA_REDUCED_MOTION);
    const isSmallScreen = window.matchMedia(MEDIA_PARALLAX_DISABLED).matches;
    if (reducedMotionQuery.matches || isSmallScreen) {
      hero.style.setProperty("--hero-parallax-y", "0px");
      return;
    }

    const ratioAttr = Number.parseFloat(hero.getAttribute("data-parallax-ratio") || "0.92");
    const ratio = Number.isFinite(ratioAttr) ? Math.min(0.95, Math.max(0.9, ratioAttr)) : 0.92;
    const compensation = 1 - ratio;

    let rafId = 0;
    const updateParallax = () => {
      rafId = 0;
      const heroRect = hero.getBoundingClientRect();
      if (heroRect.bottom <= 0 || heroRect.top >= window.innerHeight) {
        return;
      }

      const offset = getScrollY() * compensation;
      hero.style.setProperty("--hero-parallax-y", `${offset.toFixed(2)}px`);
    };

    const requestUpdate = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(updateParallax);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  };

  initHeroParallax();

  const accordions = document.querySelectorAll("[data-accordion]");
  accordions.forEach((accordion) => {
    const buttons = accordion.querySelectorAll(".faq-question");
    const getPanel = (button) => {
      const panelId = button.getAttribute("aria-controls");
      return panelId ? document.getElementById(panelId) : null;
    };

    const closePanel = (button) => {
      const panel = getPanel(button);
      button.setAttribute("aria-expanded", "false");
      if (panel) {
        panel.hidden = true;
      }
    };

    const openPanel = (button) => {
      const panel = getPanel(button);
      button.setAttribute("aria-expanded", "true");
      if (panel) {
        panel.hidden = false;
      }
    };

    const closeOthers = (activeButton) => {
      buttons.forEach((button) => {
        if (button !== activeButton) {
          closePanel(button);
        }
      });
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const isOpen = button.getAttribute("aria-expanded") === "true";
        if (isOpen) {
          closePanel(button);
          return;
        }
        closeOthers(button);
        openPanel(button);
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          button.click();
        }
      });
    });
  });

  const initHeartMarquee = () => {
    const marquee = document.querySelector(".heart-marquee");
    const track = marquee?.querySelector(".heart-marquee-track");
    const controlButtons = Array.from(document.querySelectorAll(".heart-marquee-button"));
    if (!marquee || !track) {
      return;
    }

    const originalGroup = track.querySelector(".heart-marquee-group");
    if (!originalGroup) {
      return;
    }

    const existingGroups = Array.from(track.querySelectorAll(".heart-marquee-group"));
    if (existingGroups.length < 2) {
      const cloneGroup = originalGroup.cloneNode(true);
      cloneGroup.setAttribute("aria-hidden", "true");
      cloneGroup.querySelectorAll(".heart-media-card").forEach((item) => {
        item.classList.add("is-clone");
      });
      cloneGroup.querySelectorAll("a").forEach((link) => {
        link.setAttribute("tabindex", "-1");
      });
      track.append(cloneGroup);
    } else {
      existingGroups.slice(1).forEach((group) => {
        group.setAttribute("aria-hidden", "true");
        group.querySelectorAll(".heart-media-card").forEach((item) => {
          item.classList.add("is-clone");
        });
        group.querySelectorAll("a").forEach((link) => {
          link.setAttribute("tabindex", "-1");
        });
      });
    }

    const reducedMotionQuery = window.matchMedia(MEDIA_REDUCED_MOTION);
    const autoSpeed = 26;
    const resumeDelayMs = 900;
    const dragThresholdPx = 8;
    const suppressClickThresholdPx = 10;

    let loopWidth = 0;
    let offset = 0;
    let rafId = 0;
    let lastTimestamp = 0;
    let pointerId = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let dragStartOffset = 0;
    let dragDistanceX = 0;
    let dragDistanceY = 0;
    let isPointerDown = false;
    let isDragging = false;
    let isHovered = false;
    let isFocused = false;
    let isInViewport = true;
    let resumeTimeoutId = 0;
    let shouldSuppressClick = false;

    const normalizeOffset = (value) => {
      if (!loopWidth) {
        return 0;
      }

      let nextValue = value % loopWidth;
      if (nextValue < 0) {
        nextValue += loopWidth;
      }
      return nextValue;
    };

    const applyTransform = () => {
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };

    const updateLoopWidth = () => {
      const firstGroup = track.querySelector(".heart-marquee-group");
      loopWidth = firstGroup?.scrollWidth || 0;
      if (!Number.isFinite(loopWidth) || loopWidth <= 0) {
        loopWidth = 0;
        offset = 0;
      } else {
        offset = normalizeOffset(offset);
      }
      applyTransform();
    };

    const cancelResume = () => {
      if (!resumeTimeoutId) {
        return;
      }
      window.clearTimeout(resumeTimeoutId);
      resumeTimeoutId = 0;
    };

    const isAutoScrollPaused = () =>
      reducedMotionQuery.matches || !isInViewport || document.hidden || isHovered || isFocused || isDragging || isPointerDown;

    const shouldKeepTicking = () => !reducedMotionQuery.matches && (isInViewport || isPointerDown || isDragging);

    const requestTick = () => {
      if (rafId || reducedMotionQuery.matches) {
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    const tick = (timestamp) => {
      rafId = 0;

      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (!isAutoScrollPaused() && loopWidth > 0) {
        offset = normalizeOffset(offset + autoSpeed * deltaSeconds);
        applyTransform();
      }

      if (shouldKeepTicking()) {
        requestTick();
      }
    };

    const scheduleResume = () => {
      cancelResume();
      if (reducedMotionQuery.matches) {
        return;
      }
      resumeTimeoutId = window.setTimeout(() => {
        resumeTimeoutId = 0;
        lastTimestamp = 0;
        if (isInViewport) {
          requestTick();
        }
      }, resumeDelayMs);
    };

    const pauseAutoScroll = () => {
      cancelResume();
      lastTimestamp = 0;
    };

    const nudgeBy = (distance) => {
      if (!loopWidth) {
        return;
      }
      pauseAutoScroll();
      offset = normalizeOffset(offset + distance);
      applyTransform();
      scheduleResume();
    };

    const handlePointerMove = (event) => {
      if (!isPointerDown || event.pointerId !== pointerId) {
        return;
      }

      dragDistanceX = event.clientX - pointerStartX;
      dragDistanceY = event.clientY - pointerStartY;

      if (!isDragging) {
        if (Math.abs(dragDistanceY) > Math.abs(dragDistanceX) && Math.abs(dragDistanceY) > dragThresholdPx) {
          if (marquee.hasPointerCapture(event.pointerId)) {
            marquee.releasePointerCapture(event.pointerId);
          }
          endPointerInteraction();
          return;
        }

        if (Math.abs(dragDistanceX) < dragThresholdPx || Math.abs(dragDistanceX) <= Math.abs(dragDistanceY)) {
          return;
        }

        isDragging = true;
        marquee.classList.add("is-dragging");
      }

      event.preventDefault();
      offset = normalizeOffset(dragStartOffset - dragDistanceX);
      applyTransform();
    };

    const endPointerInteraction = () => {
      if (!isPointerDown) {
        return;
      }

      if (isDragging && Math.abs(dragDistanceX) >= suppressClickThresholdPx) {
        shouldSuppressClick = true;
      }

      isPointerDown = false;
      isDragging = false;
      pointerId = null;
      dragDistanceX = 0;
      dragDistanceY = 0;
      marquee.classList.remove("is-dragging");
      scheduleResume();
    };

    marquee.addEventListener("mouseenter", () => {
      isHovered = true;
      pauseAutoScroll();
    });

    marquee.addEventListener("mouseleave", () => {
      isHovered = false;
      if (!isPointerDown) {
        scheduleResume();
      }
    });

    marquee.addEventListener("focusin", (event) => {
      const focusTarget = event.target;
      isFocused = Boolean(focusTarget instanceof HTMLElement && focusTarget.matches(":focus-visible"));
      if (isFocused) {
        pauseAutoScroll();
      }
    });

    marquee.addEventListener("focusout", () => {
      const activeElement = document.activeElement;
      isFocused = Boolean(
        activeElement instanceof HTMLElement &&
        marquee.contains(activeElement) &&
        activeElement.matches(":focus-visible")
      );
      if (!isFocused && !isPointerDown) {
        scheduleResume();
      }
    });

    marquee.addEventListener("pointerdown", (event) => {
      if (reducedMotionQuery.matches || !event.isPrimary || event.button !== 0) {
        return;
      }

      pointerId = event.pointerId;
      isPointerDown = true;
      isDragging = false;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      dragDistanceX = 0;
      dragDistanceY = 0;
      dragStartOffset = offset;
      pauseAutoScroll();
      marquee.setPointerCapture(pointerId);
    });

    marquee.addEventListener("pointermove", handlePointerMove);

    marquee.addEventListener("pointerup", (event) => {
      if (pointerId !== event.pointerId) {
        return;
      }
      if (marquee.hasPointerCapture(event.pointerId)) {
        marquee.releasePointerCapture(event.pointerId);
      }
      endPointerInteraction();
    });

    marquee.addEventListener("pointercancel", (event) => {
      if (pointerId !== event.pointerId) {
        return;
      }
      if (marquee.hasPointerCapture(event.pointerId)) {
        marquee.releasePointerCapture(event.pointerId);
      }
      endPointerInteraction();
    });

    marquee.addEventListener("lostpointercapture", () => {
      endPointerInteraction();
    });

    marquee.addEventListener(
      "click",
      (event) => {
        if (shouldSuppressClick) {
          shouldSuppressClick = false;
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );

    const viewportObserver = new IntersectionObserver(
      (entries) => {
        isInViewport = Boolean(entries[0]?.isIntersecting);
        if (isInViewport) {
          requestTick();
          return;
        }
        pauseAutoScroll();
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      {
        root: null,
        threshold: 0,
      }
    );

    viewportObserver.observe(marquee);

    controlButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const direction = Number.parseInt(button.dataset.marqueeStep || "0", 10);
        if (!Number.isFinite(direction) || direction === 0) {
          return;
        }

        const stepDistance = marquee.clientWidth * 0.55;
        nudgeBy(stepDistance * direction);
      });
    });

    window.addEventListener("resize", () => {
      updateLoopWidth();
      if (!reducedMotionQuery.matches) {
        requestTick();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseAutoScroll();
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        return;
      }

      if (!reducedMotionQuery.matches && isInViewport) {
        lastTimestamp = 0;
        requestTick();
      }
    });

    onMediaQueryChange(reducedMotionQuery, () => {
      cancelResume();
      lastTimestamp = 0;
      if (reducedMotionQuery.matches) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        track.style.transform = "";
        marquee.classList.remove("is-dragging");
        return;
      }

      updateLoopWidth();
      requestTick();
    });

    track.querySelectorAll("img").forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", updateLoopWidth, { once: true });
      }
    });

    updateLoopWidth();
    if (!reducedMotionQuery.matches) {
      requestTick();
    }
  };

  initHeartMarquee();

  const initPortfolioLightbox = () => {
    const track = document.querySelector(".heart-marquee-track");
    const portfolioItems = Array.from(
      document.querySelectorAll(".heart-marquee-track .heart-media-card:not(.is-clone) .portfolio-link")
    );
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = lightbox?.querySelector(".lightbox-image");
    const closeButton = lightbox?.querySelector(".lightbox-close");
    const prevButton = lightbox?.querySelector(".lightbox-prev");
    const nextButton = lightbox?.querySelector(".lightbox-next");

    if (!track || !portfolioItems.length || !lightbox || !lightboxImage || !closeButton || !prevButton || !nextButton) {
      return;
    }

    const portfolioImages = portfolioItems
      .map((trigger, index) => {
        trigger.dataset.portfolioIndex = String(index);
        const image = trigger.querySelector("img");
        if (!image) {
          return null;
        }

        if (!image.dataset.full) {
          image.dataset.full = trigger.getAttribute("href") || image.currentSrc || image.src;
        }

        return image;
      })
      .filter(Boolean);

    const portfolioCount = portfolioImages.length;
    if (!portfolioCount) {
      return;
    }

    const syncTriggerIndex = (trigger) => {
      const group = trigger.closest(".heart-marquee-group");
      const siblings = group ? Array.from(group.querySelectorAll(".heart-media-card .portfolio-link")) : portfolioItems;
      const siblingIndex = siblings.indexOf(trigger);
      if (siblingIndex >= 0) {
        trigger.dataset.portfolioIndex = String(siblingIndex % portfolioCount);
      }

      const image = trigger.querySelector("img");
      if (image && !image.dataset.full) {
        image.dataset.full = trigger.getAttribute("href") || image.currentSrc || image.src;
      }
    };

    track.querySelectorAll(".portfolio-link").forEach(syncTriggerIndex);

    let currentIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    const updateImage = () => {
      const currentImage = portfolioImages[currentIndex];
      const fullSrc = currentImage.dataset.full || currentImage.currentSrc || currentImage.src;
      lightboxImage.src = fullSrc;
      lightboxImage.alt = currentImage.alt;
    };

    const openLightbox = (index) => {
      currentIndex = index;
      updateImage();
      lightbox.classList.add("active");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    };

    const openFromTrigger = (trigger, event) => {
      syncTriggerIndex(trigger);
      const index = Number.parseInt(trigger.dataset.portfolioIndex || "", 10);
      if (!Number.isInteger(index) || index < 0 || index >= portfolioImages.length) {
        return;
      }

      event?.preventDefault();
      event?.stopPropagation();
      trigger.blur();
      openLightbox(index);
    };

    const closeLightbox = () => {
      lightbox.classList.remove("active");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
    };

    const showNextImage = () => {
      currentIndex = (currentIndex + 1) % portfolioImages.length;
      updateImage();
    };

    const showPreviousImage = () => {
      currentIndex = (currentIndex - 1 + portfolioImages.length) % portfolioImages.length;
      updateImage();
    };

    const handleSwipeGesture = () => {
      const swipeDistance = touchEndX - touchStartX;
      if (Math.abs(swipeDistance) < swipeThreshold) {
        return;
      }

      if (swipeDistance < 0) {
        showNextImage();
      } else {
        showPreviousImage();
      }
    };

    track.addEventListener("click", (event) => {
      const trigger = event.target instanceof Element ? event.target.closest(".portfolio-link") : null;
      if (!(trigger instanceof HTMLAnchorElement)) {
        return;
      }
      openFromTrigger(trigger, event);
    });

    track.querySelectorAll(".portfolio-link").forEach((trigger) => {
      if (!(trigger instanceof HTMLAnchorElement)) {
        return;
      }

      trigger.addEventListener("click", (event) => {
        openFromTrigger(trigger, event);
      });

      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          openFromTrigger(trigger, event);
        }
      });
    });

    closeButton.addEventListener("click", closeLightbox);
    nextButton.addEventListener("click", showNextImage);
    prevButton.addEventListener("click", showPreviousImage);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    lightbox.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0].screenX;
      },
      { passive: true }
    );

    lightbox.addEventListener(
      "touchend",
      (event) => {
        touchEndX = event.changedTouches[0].screenX;
        handleSwipeGesture();
      },
      { passive: true }
    );

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("active")) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowRight") {
        showNextImage();
      } else if (event.key === "ArrowLeft") {
        showPreviousImage();
      }
    });
  };

  initPortfolioLightbox();

  const form = document.getElementById("contact-form");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');

      if (submitButton) {
        submitButton.disabled = true;
      }

      const data = {
        name: form.name.value,
        email: form.email.value,
        telefon: form.telefon.value,
        nachricht: form.nachricht.value,
        website: form.website ? form.website.value : "",
      };

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          alert("Vielen Dank! Ihre Anfrage wurde erfolgreich gesendet.");
          form.reset();
        } else {
          alert("Beim Senden ist ein Fehler aufgetreten.");
        }
      } catch (error) {
        console.error(error);
        alert("Serverfehler. Bitte später erneut versuchen.");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
  }
})();
