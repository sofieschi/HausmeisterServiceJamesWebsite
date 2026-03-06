"use strict";

(() => {
  const MEDIA_DESKTOP_NAV = "(min-width: 56.25rem)";
  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
  const MEDIA_PARALLAX_DISABLED = "(max-width: 56.24rem)";
  const REVEAL_SERVICE_EXTRA_DELAY_MS = 40;
  const REVEAL_BASE_DELAY_MS = 90;
  const REVEAL_GROUP_STAGGER_MS = 110;

  const getScrollY = () => window.scrollY || window.pageYOffset || 0;
  const isDesktopNav = () => window.matchMedia(MEDIA_DESKTOP_NAV).matches;

  const yearTarget = document.getElementById("year");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }

  const initHeaderCompactState = () => {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    header.classList.add("is-initializing");

    let rafId = 0;
    let lastScrollY = getScrollY();
    const syncHeaderState = () => {
      rafId = 0;
      const currentScrollY = getScrollY();
      const shouldCompact = currentScrollY > 18;
      header.classList.toggle("is-scrolled", shouldCompact);

      if (currentScrollY <= 10) {
        header.classList.remove("is-topbar-hidden");
        lastScrollY = currentScrollY;
        return;
      }

      const scrollingDown = currentScrollY > lastScrollY + 2;
      const scrollingUp = currentScrollY < lastScrollY - 2;

      if (scrollingDown && currentScrollY > 34) {
        header.classList.add("is-topbar-hidden");
      } else if (scrollingUp) {
        header.classList.remove("is-topbar-hidden");
      }

      lastScrollY = currentScrollY;
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
    const revealGroupIndex = new Map();
    const serviceCardElements = [];
    const defaultRevealElements = [];

    revealElements.forEach((element) => {
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

      const serviceCardElement = element.classList.contains("service-card");
      const explicitDelay = Number.isFinite(delay) && delay >= 0 ? delay : 0;
      const serviceDelay = serviceCardElement ? REVEAL_SERVICE_EXTRA_DELAY_MS : 0;
      const finalDelay = REVEAL_BASE_DELAY_MS + explicitDelay + staggerDelay + serviceDelay;
      element.style.setProperty("--reveal-delay", `${finalDelay}ms`);

      if (serviceCardElement) {
        serviceCardElements.push(element);
      } else {
        defaultRevealElements.push(element);
      }
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
        threshold: 0.12,
      }
    );

    const serviceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          serviceObserver.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -6% 0px",
        threshold: 0.16,
      }
    );

    defaultRevealElements.forEach((element) => {
      defaultObserver.observe(element);
    });

    serviceCardElements.forEach((element) => {
      serviceObserver.observe(element);
    });
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
