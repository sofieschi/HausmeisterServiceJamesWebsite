"use strict";

(() => {
  const initServiceStories = () => {
    if (!document.body.classList.contains("leistungen-page")) return;
    const mode = window.matchMedia(
      "(min-width: 64rem) and (min-height: 38rem) and (prefers-reduced-motion: no-preference)"
    );
    const states = [];
    const nearby = new Set();
    let frame = 0;
    let measurePending = true;

    const loadPhoto = (state, index) => {
      if (!state.photoCache.has(index)) {
        const entry = state.photos[index];
        const image = new Image(entry.width, entry.height);
        image.className = "gallery-feature-image";
        image.alt = entry.alt || "";
        image.decoding = "async";
        image.sizes = "(min-width: 64rem) 46vw, 100vw";
        if (entry.srcset) image.srcset = entry.srcset;
        image.src = entry.preview || entry.src;
        state.photoCache.set(index, image.decode().then(() => image));
      }
      return state.photoCache.get(index);
    };

    // Only one decoded-image transition runs per gallery; rapid scrolling queues
    // the latest target instead of restarting a fade or revealing an unloaded image.
    const showPhoto = async (state, index) => {
      if (!state.photoTrigger || !state.photos.length) return;
      state.requestedPhoto = index;
      if (state.photoBusy) return;
      state.photoBusy = true;
      try {
        while (state.photoIndex !== state.requestedPhoto) {
          const target = state.requestedPhoto;
          const incoming = await loadPhoto(state, target);
          if (target !== state.requestedPhoto) continue;
          const outgoing = state.photoTrigger.querySelector(".gallery-feature-image");
          incoming.removeAttribute("aria-hidden");
          incoming.classList.remove("service-story-outgoing");
          state.photoTrigger.prepend(incoming);
          state.photoTrigger.dataset.galleryOpen = String(target);
          state.photoIndex = target;
          if (outgoing) {
            outgoing.classList.add("service-story-outgoing");
            outgoing.setAttribute("aria-hidden", "true");
            if (state.enabled && mode.matches) {
              // Fade both layers so differing aspect ratios never reveal the
              // edges of the next photo abruptly beneath the outgoing one.
              const timing = {
                duration: 900, easing: "cubic-bezier(0.45, 0, 0.55, 1)", fill: "both"
              };
              const fades = [
                incoming.animate([{ opacity: 0 }, { opacity: 1 }], timing),
                outgoing.animate([{ opacity: 1 }, { opacity: 0 }], timing)
              ];
              try {
                await Promise.all(fades.map((fade) => fade.finished));
              } finally {
                outgoing.remove();
                fades.forEach((fade) => fade.cancel());
              }
            }
            outgoing.remove();
          }
        }
      } catch {
        // Keep the last working photo and its lightbox index if loading fails.
        state.photoCache.delete(state.requestedPhoto);
      } finally {
        state.photoBusy = false;
      }
    };

    // Move existing nodes rather than duplicating or rewriting service content.
    const makeSteps = (text) => {
      const children = Array.from(text.children);
      const headingEnd = children.findIndex((node) => node.tagName === "H2");
      if (headingEnd < 0) return null;
      const heading = document.createElement("div");
      heading.className = "service-story-heading";
      children.slice(0, headingEnd + 1).forEach((node) => {
        heading.append(node, document.createTextNode("\n"));
      });

      const units = [];
      children.slice(headingEnd + 1).forEach((node) => {
        if (node.tagName === "BR") return;
        if (node.tagName !== "UL" || !node.children.length) {
          units.push(node);
          return;
        }
        let list = null;
        let length = 0;
        let count = 0;
        Array.from(node.children).forEach((item) => {
          const itemLength = item.textContent.trim().length;
          if (!list || length + itemLength > 380 || count === 2) {
            list = document.createElement("ul");
            units.push(list);
            length = 0;
            count = 0;
          }
          list.append(item, document.createTextNode("\n"));
          length += itemLength;
          count += 1;
        });
      });

      const container = document.createElement("div");
      container.className = "service-story-steps";
      const steps = [];
      units.forEach((node) => {
        const previous = steps.at(-1);
        const previousLength = previous?.textContent.trim().length || 0;
        const length = node.textContent.trim().length;
        let step = previous;
        if (!step || previousLength >= 110 || previousLength + length > 420) {
          step = document.createElement("div");
          step.className = "service-story-step";
          container.append(step, document.createTextNode("\n"));
          steps.push(step);
        }
        step.append(node, document.createTextNode("\n"));
      });
      text.replaceChildren(heading, document.createTextNode("\n"), container);
      return steps;
    };

    document.querySelectorAll(".leistung-detail-section").forEach((section) => {
      const grid = section.querySelector(".leistung-detail-grid");
      const text = section.querySelector(".leistung-text");
      const media = section.querySelector(".leistung-images");
      if (!grid || !text || !media) return;
      const steps = makeSteps(text);
      if (!steps?.length) return;
      const progress = document.createElement("nav");
      progress.className = "service-text-progress";
      progress.setAttribute("aria-label", `Textabschnitte: ${text.querySelector("h2").textContent.trim()}`);
      progress.hidden = true;
      const count = document.createElement("span");
      count.className = "service-text-count";
      count.setAttribute("aria-hidden", "true");
      const buttons = document.createElement("div");
      buttons.className = "service-text-progress-buttons";
      const gallery = media.querySelector("[data-gallery-images]");
      let photos = [];
      try { photos = JSON.parse(gallery?.dataset.galleryImages || "[]"); } catch { /* Static image remains usable. */ }
      const state = {
        section, grid, text, media, steps, progress, count, buttons: [],
        index: 0, enabled: false, distance: 1,
        photos, photoTrigger: gallery?.querySelector(".gallery-lightbox-trigger"),
        photoIndex: 0, requestedPhoto: 0, photoBusy: false, photoCache: new Map()
      };
      steps.forEach((_, index) => {
        steps[index].id = `${section.id}-text-step-${index + 1}`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "service-text-step-control";
        button.setAttribute("aria-label", `Textabschnitt ${index + 1} von ${steps.length}`);
        button.setAttribute("aria-controls", steps[index].id);
        button.addEventListener("click", () => {
          if (!state.enabled) return;
          const top = parseFloat(getComputedStyle(grid).top) || 0;
          const padding = parseFloat(getComputedStyle(section).paddingTop) || 0;
          const start = window.scrollY + section.getBoundingClientRect().top + padding - top;
          window.scrollTo({ top: start + index * state.distance + (index ? 36 : 0), behavior: "smooth" });
        });
        buttons.append(button);
        state.buttons.push(button);
      });
      progress.append(count, buttons);
      text.append(progress);
      states.push(state);
    });

    const activate = (state, index) => {
      state.index = index;
      state.section.dataset.storyStep = String(index);
      state.count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(state.steps.length).padStart(2, "0")}`;
      state.steps.forEach((step, stepIndex) => {
        const active = stepIndex === index;
        step.classList.toggle("is-active", active);
        step.inert = state.enabled && !active;
        if (state.enabled) step.setAttribute("aria-hidden", String(!active));
        else step.removeAttribute("aria-hidden");
        if (active) state.buttons[stepIndex].setAttribute("aria-current", "step");
        else state.buttons[stepIndex].removeAttribute("aria-current");
      });
    };

    const measure = () => {
      states.forEach((state) => {
        state.section.classList.toggle("is-text-story", mode.matches);
        state.progress.hidden = !mode.matches;
        state.section.style.removeProperty("--service-story-height");
        const top = parseFloat(getComputedStyle(state.grid).top) || 128;
        const height = state.grid.offsetHeight;
        // Long text or a short viewport uses the fully readable, unpinned fallback.
        state.enabled = mode.matches && height <= window.innerHeight - top - 20;
        state.section.classList.toggle("is-text-story", state.enabled);
        state.progress.hidden = !state.enabled;
        if (state.enabled) {
          state.distance = Math.max(260, Math.min(440, window.innerHeight * 0.45));
          const style = getComputedStyle(state.section);
          const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
          state.section.style.setProperty("--service-story-height",
            `${height + padding + state.steps.length * state.distance}px`);
        }
        activate(state, state.index);
        if (!state.enabled) showPhoto(state, 0);
      });
    };

    const update = () => {
      frame = 0;
      if (measurePending) {
        measurePending = false;
        measure();
      }
      if (!mode.matches || document.body.classList.contains("lightbox-open")) return;
      nearby.forEach((state) => {
        if (!state.enabled) return;
        const style = getComputedStyle(state.section);
        const top = parseFloat(getComputedStyle(state.grid).top) || 128;
        const travel = top - state.section.getBoundingClientRect().top - parseFloat(style.paddingTop);
        let index = Math.min(state.steps.length - 1, Math.max(0, Math.floor(travel / state.distance)));
        const tolerance = 28;
        if (index > state.index && travel < (state.index + 1) * state.distance + tolerance) index = state.index;
        else if (index < state.index && travel > state.index * state.distance - tolerance) index = state.index;
        if (index !== state.index) activate(state, index);
        if (state.photos.length > 1) {
          // Separate photo intervals ensure every assigned photo is reached even
          // when a service has more photos than text panels (e.g. glass cleaning).
          const photoDistance = state.steps.length * state.distance / state.photos.length;
          let photoIndex = Math.min(state.photos.length - 1, Math.max(0, Math.floor(travel / photoDistance)));
          if (photoIndex > state.requestedPhoto && travel < (state.requestedPhoto + 1) * photoDistance + tolerance) photoIndex = state.requestedPhoto;
          else if (photoIndex < state.requestedPhoto && travel > state.requestedPhoto * photoDistance - tolerance) photoIndex = state.requestedPhoto;
          showPhoto(state, photoIndex);
          // Warm just the next photo, not every gallery on the page.
          if (photoIndex + 1 < state.photos.length) loadPhoto(state, photoIndex + 1).catch(() => {});
        }
      });
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const requestMeasure = () => {
      measurePending = true;
      requestUpdate();
    };

    if ("IntersectionObserver" in window) {
      const bySection = new Map(states.map((state) => [state.section, state]));
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const state = bySection.get(entry.target);
          if (entry.isIntersecting) nearby.add(state);
          else nearby.delete(state);
        });
        requestUpdate();
      }, { rootMargin: "15% 0px" });
      states.forEach((state) => observer.observe(state.section));
    } else {
      states.forEach((state) => nearby.add(state));
    }

    if (mode.addEventListener) mode.addEventListener("change", requestMeasure);
    else mode.addListener(requestMeasure);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestMeasure);
    window.addEventListener("load", requestMeasure, { once: true });
    window.addEventListener("pageshow", requestMeasure);
    document.fonts?.ready.then(requestMeasure);
    if (document.querySelector('.reveal[style*="--reveal-delay"]')) {
      document.body.classList.add("service-story-ready");
    }
    requestMeasure();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initServiceStories, { once: true });
  } else {
    initServiceStories();
  }
})();
