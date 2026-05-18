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
      hero.style.setProperty("--hero-parallax-y", `${offset.toFixed(3)}px`);
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

  const initQuoteParallax = () => {
    const quoteSection = document.querySelector(".quote-section");
    if (!quoteSection) {
      return;
    }

    const reducedMotionQuery = window.matchMedia(MEDIA_REDUCED_MOTION);
    const isSmallScreen = window.matchMedia(MEDIA_PARALLAX_DISABLED).matches;
    if (reducedMotionQuery.matches) {
      quoteSection.style.setProperty("--quote-parallax-y", "0px");
      return;
    }

    const maxOffset = 400;
    let rafId = 0;

    const updateParallax = () => {
      rafId = 0;
      const rect = quoteSection.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      const sectionCenter = rect.top + rect.height / 2;
      const distanceFromCenter = sectionCenter - viewportCenter;
      const normalized = Math.max(-1, Math.min(1, distanceFromCenter / window.innerHeight));
      const offset = normalized * -maxOffset;
      quoteSection.style.setProperty("--quote-parallax-y", `${offset.toFixed(2)}px`);
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

  initQuoteParallax();

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

  const createLightboxController = () => {
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = lightbox?.querySelector(".lightbox-image");
    const closeButton = lightbox?.querySelector(".lightbox-close");
    const prevButton = lightbox?.querySelector(".lightbox-prev");
    const nextButton = lightbox?.querySelector(".lightbox-next");

    if (!lightbox || !lightboxImage || !closeButton || !prevButton || !nextButton) {
      return null;
    }

    let entries = [];
    let currentIndex = 0;
    let activeTrigger = null;
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    const updateImage = () => {
      const currentEntry = entries[currentIndex];
      if (!currentEntry) {
        return;
      }

      lightboxImage.src = currentEntry.fullSrc;
      lightboxImage.removeAttribute("srcset");
      lightboxImage.removeAttribute("sizes");
      lightboxImage.alt = currentEntry.alt;
    };

    const openLightbox = (nextEntries, index = 0, trigger = null) => {
      if (!Array.isArray(nextEntries) || !nextEntries.length) {
        return;
      }

      entries = nextEntries;
      currentIndex = ((index % entries.length) + entries.length) % entries.length;
      activeTrigger = trigger instanceof HTMLElement ? trigger : null;
      updateImage();
      lightbox.classList.add("active");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    };

    const closeLightbox = () => {
      lightbox.classList.remove("active");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
      if (activeTrigger) {
        activeTrigger.focus({ preventScroll: true });
      }
      activeTrigger = null;
    };

    const showNextImage = () => {
      if (!entries.length) {
        return;
      }
      currentIndex = (currentIndex + 1) % entries.length;
      updateImage();
    };

    const showPreviousImage = () => {
      if (!entries.length) {
        return;
      }
      currentIndex = (currentIndex - 1 + entries.length) % entries.length;
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

    return {
      open: openLightbox,
    };
  };

  const buildPortfolioEntries = (triggers) =>
    triggers
      .map((trigger) => {
        const image = trigger.querySelector("img");
        if (!image) {
          return null;
        }

        const fullSrc =
          image.dataset.full || trigger.getAttribute("href") || image.currentSrc || image.src;

        return {
          fullSrc,
          alt: image.alt || "",
        };
      })
      .filter(Boolean);

  const initPortfolioExperience = (lightboxController) => {
    const marquee = document.querySelector(".heart-marquee");
    const track = marquee?.querySelector(".heart-marquee-track");
    const group = track?.querySelector(".heart-marquee-group");
    const controlButtons = Array.from(document.querySelectorAll(".heart-marquee-button"));
    const portfolioItems = Array.from(group?.querySelectorAll(".portfolio-link") || []);

    if (!marquee || !track || !group || !portfolioItems.length) {
      return;
    }

    const portfolioEntries = lightboxController ? buildPortfolioEntries(portfolioItems) : [];

    const getStepDistance = () => {
      const firstCard = group.querySelector(".heart-media-card");
      const cardWidth = firstCard
        ? firstCard.getBoundingClientRect().width
        : marquee.clientWidth * 0.55;
      const gapValue = Number.parseFloat(window.getComputedStyle(group).gap || "24") || 24;
      return cardWidth + gapValue;
    };

    const getMaxScrollLeft = () => Math.max(0, marquee.scrollWidth - marquee.clientWidth);

    const scrollGalleryBy = (direction) => {
      const stepDistance = getStepDistance();
      const maxScrollLeft = getMaxScrollLeft();
      const currentScrollLeft = marquee.scrollLeft;
      const threshold = stepDistance * 0.35;

      if (direction > 0 && currentScrollLeft >= maxScrollLeft - threshold) {
        marquee.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      if (direction < 0 && currentScrollLeft <= threshold) {
        marquee.scrollTo({ left: maxScrollLeft, behavior: "smooth" });
        return;
      }

      marquee.scrollBy({ left: stepDistance * direction, behavior: "smooth" });
    };

    controlButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const direction = Number.parseInt(button.dataset.marqueeStep || "0", 10);
        if (!Number.isFinite(direction) || direction === 0) {
          return;
        }
        scrollGalleryBy(direction);
      });
    });

    if (!lightboxController || !portfolioEntries.length) {
      return;
    }

    portfolioItems.forEach((trigger, index) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        lightboxController.open(portfolioEntries, index, trigger);
      });
    });
  };

  const initServiceGalleries = (lightboxController) => {
    if (!lightboxController) {
      return;
    }

    const galleries = Array.from(document.querySelectorAll(".leistung-gallery[data-gallery-images]"));
    galleries.forEach((gallery) => {
      const trigger = gallery.querySelector(".gallery-lightbox-trigger");
      if (!trigger) {
        return;
      }

      let entries = [];
      const imagesJson = gallery.getAttribute("data-gallery-images") || "[]";
      try {
        const parsed = JSON.parse(imagesJson);
        if (Array.isArray(parsed)) {
          entries = parsed
            .map((entry) => {
              if (!entry || typeof entry.src !== "string" || !entry.src.trim()) {
                return null;
              }

              return {
                fullSrc: entry.src.trim(),
                alt: typeof entry.alt === "string" ? entry.alt : "",
              };
            })
            .filter(Boolean);
        }
      } catch (error) {
        console.error("Invalid gallery data-gallery-images JSON", error, gallery);
      }

      if (!entries.length) {
        const image = trigger.querySelector("img");
        if (image) {
          entries = [
            {
              fullSrc: image.currentSrc || image.src,
              alt: image.alt || "",
            },
          ];
        }
      }

      if (!entries.length) {
        return;
      }

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const startIndex = Number.parseInt(trigger.getAttribute("data-gallery-open") || "0", 10);
        lightboxController.open(entries, Number.isFinite(startIndex) ? startIndex : 0, trigger);
      });
    });
  };

  const initServiceGalleryRotation = () => {
    const ROTATION_INTERVAL_MS = 5000;
    const galleries = Array.from(document.querySelectorAll(".leistung-gallery[data-gallery-images]"));
    const supportsObserver = "IntersectionObserver" in window;

    galleries.forEach((gallery) => {
      const featureImage = gallery.querySelector(".gallery-feature-image");
      const indicator = gallery.querySelector(".gallery-indicator");
      if (!(featureImage instanceof HTMLImageElement) || !(indicator instanceof HTMLElement)) {
        return;
      }

      let entries = [];
      try {
        const parsed = JSON.parse(gallery.getAttribute("data-gallery-images") || "[]");
        if (Array.isArray(parsed)) {
          entries = parsed
            .map((entry) => {
              if (!entry || typeof entry.src !== "string" || !entry.src.trim()) {
                return null;
              }

              return {
                src: entry.src.trim(),
                alt: typeof entry.alt === "string" ? entry.alt : "",
              };
            })
            .filter(Boolean);
        }
      } catch (error) {
        console.error("Invalid gallery rotation data-gallery-images JSON", error, gallery);
      }

      if (entries.length <= 1) {
        indicator.replaceChildren();
        if (entries.length === 1) {
          const dot = document.createElement("span");
          dot.className = "gallery-indicator-dot is-active";
          indicator.append(dot);
        }
        return;
      }

      let currentIndex = 0;
      let intervalId = 0;
      let isVisible = !supportsObserver;
      const dots = entries.map((_, index) => {
        const dot = document.createElement("span");
        dot.className = `gallery-indicator-dot${index === 0 ? " is-active" : ""}`;
        return dot;
      });

      indicator.replaceChildren(...dots);

      const updateDots = (activeIndex) => {
        dots.forEach((dot, index) => {
          dot.classList.toggle("is-active", index === activeIndex);
        });
      };

      const renderIndex = (index) => {
        const entry = entries[index];
        if (!entry) {
          return;
        }

        featureImage.classList.add("is-rotating");
        window.setTimeout(() => {
          featureImage.removeAttribute("srcset");
          featureImage.removeAttribute("sizes");
          featureImage.src = entry.src;
          featureImage.alt = entry.alt;
          updateDots(index);
          featureImage.classList.remove("is-rotating");
        }, 160);
      };

      const showNext = () => {
        currentIndex = (currentIndex + 1) % entries.length;
        renderIndex(currentIndex);
      };

      const stopRotation = () => {
        if (intervalId) {
          window.clearInterval(intervalId);
          intervalId = 0;
        }
      };

      const startRotation = () => {
        if (!isVisible) {
          return;
        }
        stopRotation();
        intervalId = window.setInterval(showNext, ROTATION_INTERVAL_MS);
      };

      gallery.addEventListener("mouseenter", stopRotation);
      gallery.addEventListener("mouseleave", startRotation);

      if (supportsObserver) {
        const observer = new IntersectionObserver(
          (entriesList) => {
            entriesList.forEach((entry) => {
              if (entry.target !== gallery) {
                return;
              }

              isVisible = entry.isIntersecting;
              if (isVisible) {
                startRotation();
              } else {
                stopRotation();
              }
            });
          },
          {
            root: null,
            rootMargin: "0px",
            threshold: 0.2,
          }
        );

        observer.observe(gallery);
      } else {
        startRotation();
      }
    });
  };

  const lightboxController = createLightboxController();

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        initPortfolioExperience(lightboxController);
        initServiceGalleries(lightboxController);
        initServiceGalleryRotation();
      },
      { once: true }
    );
  } else {
    initPortfolioExperience(lightboxController);
    initServiceGalleries(lightboxController);
    initServiceGalleryRotation();
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
