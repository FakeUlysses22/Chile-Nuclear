'use strict';

/* Importante: evita que .reveal oculte contenido si JS falla */
document.documentElement.classList.add("js");

/* Helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

(() => {
  document.addEventListener("DOMContentLoaded", () => {

    // ===== NAV (burger + mobile menu) =====
    const burger = $("#navBurger");
    const mobileMenu = $("#mobileMenu");

    const supportsInert = "inert" in HTMLElement.prototype;

    function setMenu(open) {
      if (!burger || !mobileMenu) return;

      burger.setAttribute("aria-expanded", String(open));
      mobileMenu.setAttribute("aria-hidden", String(!open));
      mobileMenu.classList.toggle("is-open", open);

      // Evita scroll cuando el menú está abierto (sobre todo en móvil)
      document.body.classList.toggle("no-scroll", open);

      // Mejora accesibilidad: evita tabbing dentro del menú cerrado
      if (supportsInert) mobileMenu.inert = !open;
    }

    burger?.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") !== "true";
      setMenu(open);
      if (open) {
        // Enfoca el primer link del menú para navegación con teclado
        const first = $(".mobile-menu__link, .mobile-menu .btn", mobileMenu);
        first?.focus?.();
      } else {
        burger?.focus?.();
      }
    });

    $$(".mobile-menu__link, .mobile-menu .btn").forEach((a) => {
      a.addEventListener("click", () => setMenu(false));
    });

    // Click fuera / Escape para cerrar
    document.addEventListener("click", (e) => {
      if (!burger || !mobileMenu) return;
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      if (!isOpen) return;

      const target = e.target;
      const clickedInside = mobileMenu.contains(target) || burger.contains(target);
      if (!clickedInside) setMenu(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!burger || !mobileMenu) return;
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      if (isOpen) setMenu(false);
    });

    // ===== Reveal (IntersectionObserver) =====
    const reveals = $$(".reveal");
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.14 });

      reveals.forEach((el) => revealObserver.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add("visible"));
    }

    // ===== Scroll progress + To top =====
    const scrollBar = $("#scrollBar");
    const toTop = $("#toTop");

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct = docH > 0 ? (scrollTop / docH) * 100 : 0;

      if (scrollBar) scrollBar.style.width = `${pct}%`;
      if (toTop) toTop.classList.toggle("is-visible", scrollTop > 600);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toTop?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // ===== Active nav link by section =====
    const navLinks = $$(".nav__link");
    const sections = navLinks
      .map((a) => $(a.getAttribute("href")))
      .filter(Boolean);

    // Intersection Observer para secciones y links de navegación porfavor no tocar
    if ("IntersectionObserver" in window && navLinks.length) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((l) => l.classList.remove("is-active"));
          const id = `#${entry.target.id}`;
          const active = navLinks.find((l) => l.getAttribute("href") === id);
          active?.classList.add("is-active");
        });
      }, { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 });

      sections.forEach((s) => sectionObserver.observe(s));
    }

    // ===== Counters =====
    const counterEls = $$("[data-counter='true']");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    function setCounterFinal(el) {
      const to = Number(el.dataset.to || "0");
      const suffix = el.dataset.suffix || "";
      el.textContent = `${to}${suffix}`;
    }

    function animateCounter(el) {
      const to = Number(el.dataset.to || "0");
      const suffix = el.dataset.suffix || "";
      const duration = 900;
      const start = performance.now();

      function tick(t) {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(to * eased);
        el.textContent = `${val}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = `${to}${suffix}`;
      }

      requestAnimationFrame(tick);
    }

    counterEls.forEach(setCounterFinal);

    if (!reduceMotion && "IntersectionObserver" in window && counterEls.length) {
      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const suffix = el.dataset.suffix || "";
          // Solo al aparecer: baja a 0 y anima (evita “saltos” al cargar)
          el.textContent = `0${suffix}`;
          animateCounter(el);
          counterObserver.unobserve(el);
        });
      }, { threshold: 0.35 });

      counterEls.forEach((el) => counterObserver.observe(el));
    }

    // ===== Accordion (solo uno abierto) =====
    const accordion = $("[data-accordion]");
    if (accordion) {
      const items = $$("details", accordion);
      items.forEach((d) => {
        d.addEventListener("toggle", () => {
          if (!d.open) return;
          items.forEach((other) => {
            if (other !== d) other.removeAttribute("open");
          });
        });
      });
    }

    // ===== Lightbox =====
    const lightbox = $("#lightbox");
    const lbContent = lightbox ? $(".lightbox__content", lightbox) : null;
    const lbImg = lightbox ? $(".lightbox__img", lightbox) : null;
    const lbCaption = $("#lightboxCaption");
    const lbClose = lightbox ? $(".lightbox__close", lightbox) : null;

    let lastFocused = null;

    function trapFocus(e) {
      if (!lightbox || lightbox.getAttribute("aria-hidden") === "true") return;
      if (e.key !== "Tab") return;

      const focusable = [lbClose].filter(Boolean);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function openLightbox(imgEl, captionText) {
      if (!lightbox || !lbImg || !lbCaption) return;

      lastFocused = document.activeElement;

      lbImg.src = imgEl.src;
      lbImg.alt = imgEl.alt || "";
      lbCaption.textContent = captionText || "";

      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");

      lbClose?.focus?.();

      document.addEventListener("keydown", onLightboxKeydown);
    }

    function closeLightbox() {
      if (!lightbox || !lbImg) return;

      lightbox.setAttribute("aria-hidden", "true");
      lbImg.src = "";
      document.body.classList.remove("no-scroll");

      document.removeEventListener("keydown", onLightboxKeydown);

      // Devuelve el foco a donde estaba (mejor UX)
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
      lastFocused = null;
    }

    function onLightboxKeydown(e) {
      if (e.key === "Escape") closeLightbox();
      trapFocus(e);
    }

    $$(".gallery-item").forEach((item) => {
      const img = $("img", item);
      const cap = $("figcaption", item);
      const btn = $(".gallery-item__btn", item);
      if (!img || !btn) return;
      btn.addEventListener("click", () => openLightbox(img, cap?.textContent || ""));
    });

    lbClose?.addEventListener("click", closeLightbox);
    lightbox?.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  });
})();
