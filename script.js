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

  const initPortfolioExperience = () => {
    const DEBUG_PORTFOLIO = true;
    const debugPortfolio = (...args) => {
      if (DEBUG_PORTFOLIO) {
        console.log("[portfolio-lightbox]", ...args);
      }
    };

    const marquee = document.querySelector(".heart-marquee");
    const track = marquee?.querySelector(".heart-marquee-track");
    const group = track?.querySelector(".heart-marquee-group");
    const controlButtons = Array.from(document.querySelectorAll(".heart-marquee-button"));
    const portfolioItems = Array.from(document.querySelectorAll(".portfolio-link"));
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = lightbox?.querySelector(".lightbox-image");
    const closeButton = lightbox?.querySelector(".lightbox-close");
    const prevButton = lightbox?.querySelector(".lightbox-prev");
    const nextButton = lightbox?.querySelector(".lightbox-next");

    debugPortfolio("found portfolio links:", portfolioItems.length);

    if (!marquee || !track || !group || !portfolioItems.length || !lightbox || !lightboxImage || !closeButton || !prevButton || !nextButton) {
      return;
    }

    const reducedMotionQuery = window.matchMedia(MEDIA_REDUCED_MOTION);
    const autoSpeed = 26;
    const resumeDelayMs = 900;

    let maxOffset = 0;
    let offset = 0;
    let rafId = 0;
    let lastTimestamp = 0;
    let isHovered = false;
    let isFocused = false;
    let isInViewport = true;
    let resumeTimeoutId = 0;
    let currentIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    const portfolioEntries = portfolioItems
      .map((trigger, index) => {
        const image = trigger.querySelector("img");
        if (!image) {
          return null;
        }

        const fullSrc = image.dataset.full || trigger.getAttribute("href") || image.currentSrc || image.src;
        image.dataset.full = fullSrc;

        return {
          index,
          trigger,
          image,
          fullSrc,
          alt: image.alt || "",
        };
      })
      .filter(Boolean);

    if (!portfolioEntries.length) {
      return;
    }

    const normalizeOffset = (value) => {
      if (!maxOffset) {
        return 0;
      }
      return Math.min(Math.max(value, 0), maxOffset);
    };

    const applyTransform = () => {
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };

    const updateBounds = () => {
      const groupWidth = group.scrollWidth;
      const viewportWidth = marquee.clientWidth;
      maxOffset = Math.max(0, groupWidth - viewportWidth);
      offset = normalizeOffset(offset);
      applyTransform();
    };

    const cancelResume = () => {
      if (!resumeTimeoutId) {
        return;
      }
      window.clearTimeout(resumeTimeoutId);
      resumeTimeoutId = 0;
    };

    const pauseAutoScroll = () => {
      cancelResume();
      lastTimestamp = 0;
    };

    const isAutoScrollPaused = () =>
      reducedMotionQuery.matches || !isInViewport || document.hidden || isHovered || isFocused;

    const shouldKeepTicking = () => !reducedMotionQuery.matches && isInViewport;

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

      if (!isAutoScrollPaused() && maxOffset > 0) {
        const nextOffset = offset + autoSpeed * deltaSeconds;
        offset = nextOffset >= maxOffset ? 0 : nextOffset;
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

    const nudgeBy = (distance) => {
      if (!maxOffset) {
        return;
      }

      pauseAutoScroll();

      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }

      lastTimestamp = 0;

      const nextOffset = offset + distance;

      if (nextOffset > maxOffset) {
        offset = 0;
      } else if (nextOffset < 0) {
        offset = maxOffset;
      } else {
        offset = nextOffset;
      }

      applyTransform();

      window.setTimeout(() => {
        lastTimestamp = 0;

        if (!reducedMotionQuery.matches && isInViewport) {
          requestTick();
        }
      }, 220);
    };

    marquee.addEventListener("mouseenter", () => {
      isHovered = true;
      pauseAutoScroll();
    });

    marquee.addEventListener("mouseleave", () => {
      isHovered = false;
      scheduleResume();
    });

    marquee.addEventListener("focusin", () => {
      isFocused = true;
      pauseAutoScroll();
    });

    marquee.addEventListener("focusout", () => {
      const activeElement = document.activeElement;
      isFocused = Boolean(activeElement instanceof HTMLElement && marquee.contains(activeElement));
      if (!isFocused) {
        scheduleResume();
      }
    });

    controlButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const direction = Number.parseInt(button.dataset.marqueeStep || "0", 10);
        if (!Number.isFinite(direction) || direction === 0) {
          return;
        }

        debugPortfolio("gallery arrow clicked", direction, { maxOffset, offset });
        const firstCard = group.querySelector(".heart-media-card");
        const cardWidth = firstCard
          ? firstCard.getBoundingClientRect().width
          : marquee.clientWidth * 0.55;

        const gapValue = parseFloat(
          getComputedStyle(group).gap || "24"
        );

        const stepDistance = cardWidth + gapValue;
        nudgeBy(stepDistance * direction);
      });
    });

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
        return;
      }

      updateBounds();
      requestTick();
    });

    const updateImage = () => {
      const currentEntry = portfolioEntries[currentIndex];
      debugPortfolio("current image href:", currentEntry.fullSrc);
      lightboxImage.src = currentEntry.fullSrc;
      lightboxImage.removeAttribute("srcset");
      lightboxImage.removeAttribute("sizes");
      lightboxImage.alt = currentEntry.alt;
    };

    const openLightbox = (index) => {
      currentIndex = index;
      debugPortfolio("clicked index:", currentIndex);
      updateImage();
      lightbox.classList.add("active");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    };

    const closeLightbox = () => {
      lightbox.classList.remove("active");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
    };

    const showNextImage = () => {
      currentIndex = (currentIndex + 1) % portfolioEntries.length;
      debugPortfolio("next clicked", currentIndex);
      updateImage();
    };

    const showPreviousImage = () => {
      currentIndex = (currentIndex - 1 + portfolioEntries.length) % portfolioEntries.length;
      debugPortfolio("prev clicked", currentIndex);
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

    portfolioItems.forEach((trigger, index) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        openLightbox(index);
      });
    });

    prevButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showPreviousImage();
    });

    nextButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showNextImage();
    });

    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeLightbox();
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    lightboxImage.addEventListener("click", (event) => {
      event.stopPropagation();
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

    window.addEventListener("resize", updateBounds);
    window.addEventListener("load", updateBounds, { once: true });
    group.querySelectorAll("img").forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", updateBounds, { once: true });
      }
    });

    updateBounds();
    if (!reducedMotionQuery.matches) {
      requestTick();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPortfolioExperience, { once: true });
  } else {
    initPortfolioExperience();
  }

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
