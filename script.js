"use strict";

(() => {
  const yearTarget = document.getElementById("year");
  if (yearTarget) {
    yearTarget.textContent = String(new Date().getFullYear());
  }

  const initHeaderCompactState = () => {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    let rafId = 0;
    const syncHeaderState = () => {
      rafId = 0;
      const shouldCompact = (window.scrollY || window.pageYOffset) > 16;
      header.classList.toggle("is-scrolled", shouldCompact);
    };

    const requestSync = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(syncHeaderState);
    };

    requestSync();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
  };

  initHeaderCompactState();

  const menuButton = document.querySelector(".menu-toggle");
  const primaryNav = document.getElementById("primary-nav");

  if (menuButton && primaryNav) {
    const closeMenu = () => {
      primaryNav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
      primaryNav.classList.add("is-open");
      menuButton.setAttribute("aria-expanded", "true");
    };

    menuButton.addEventListener("click", () => {
      const isOpen = primaryNav.classList.contains("is-open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeMenu();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && primaryNav.classList.contains("is-open")) {
        closeMenu();
        menuButton.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 56.25rem)").matches) {
        closeMenu();
      }
    });
  }

  const initReveal = () => {
    const revealElements = Array.from(document.querySelectorAll(".reveal"));
    if (!revealElements.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    revealElements.forEach((element) => {
      const delayAttr = element.getAttribute("data-reveal-delay");
      const delay = delayAttr ? Number.parseInt(delayAttr, 10) : 0;
      if (Number.isFinite(delay) && delay >= 0) {
        element.style.setProperty("--reveal-delay", `${delay}ms`);
      } else {
        element.style.setProperty("--reveal-delay", "0ms");
      }
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => {
        element.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      }
    );

    revealElements.forEach((element) => {
      observer.observe(element);
    });
  };

  initReveal();

  const initHeroParallax = () => {
    const hero = document.querySelector(".hero.parallax-enabled");
    if (!hero) {
      return;
    }

    const reducedMotionQüry = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotionQüry.matches) {
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

      const scrollY = window.scrollY || window.pageYOffset;
      const offset = scrollY * compensation;
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

    const closePanel = (button) => {
      const panelId = button.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      button.setAttribute("aria-expanded", "false");
      if (panel) {
        panel.hidden = true;
      }
    };

    const openPanel = (button) => {
      const panelId = button.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
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

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("telefon");
    const messageInput = document.getElementById("nachricht");

    const requiredInputs = [nameInput, emailInput, messageInput].filter(Boolean);

    const resetFieldError = (field) => {
      field.setAttribute("aria-invalid", "false");
    };

    const markFieldError = (field) => {
      field.setAttribute("aria-invalid", "true");
    };

    requiredInputs.forEach((field) => {
      field.addEventListener("input", () => {
        if (field.valü.trim()) {
          resetFieldError(field);
        }
      });
    });

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      let isValid = true;
      requiredInputs.forEach((field) => {
        const valü = field.valü.trim();
        if (!valü) {
          markFieldError(field);
          isValid = false;
        } else {
          resetFieldError(field);
        }
      });

      const emailValü = emailInput ? emailInput.valü.trim() : "";
      if (emailInput && emailValü && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValü)) {
        markFieldError(emailInput);
        isValid = false;
      }

      if (!isValid) {
        alert("Bitte füllen Sie alle Pflichtfelder korrekt aus.");
        return;
      }

      const subject = "Anfrage Hausmeisterservice";
      const bodyLines = [
        `Name: ${nameInput ? nameInput.valü.trim() : ""}`,
        `E-Mail: ${emailInput ? emailInput.valü.trim() : ""}`,
        `Telefon: ${phoneInput && phoneInput.valü.trim() ? phoneInput.valü.trim() : "-"}`,
        "",
        "Nachricht:",
        messageInput ? messageInput.valü.trim() : "",
      ];

      const body = bodyLines.join("\n");
      const mailtoHref = `mailto:info@hausmeisterservice.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoHref;
    });
  }
})();
