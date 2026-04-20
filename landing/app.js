// Bear on Stellar — Landing Page
// Scroll reveals, protocol card cycling, copy-to-clipboard, nav tracking

document.addEventListener("DOMContentLoaded", () => {

  // ── Scroll reveal observer (fade-in elements) ──
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );


  // Stagger fade-in items inside grids
  document.querySelectorAll(".eco-grid, .contracts-grid").forEach((group) => {
    const items = group.querySelectorAll(".fade-in");
    items.forEach((el, i) => {
      el.style.transitionDelay = (i * 0.1) + "s";
      revealObserver.observe(el);
    });
  });

  // Standalone fade-in elements
  document.querySelectorAll(".fade-in").forEach((el) => {
    if (!el.style.transitionDelay) {
      revealObserver.observe(el);
    }
  });

  // ── Nav scroll tracking + protocol card cycling ──
  const nav = document.getElementById("nav");
  const sections = document.querySelectorAll("section[id], .protocol-scroll[id], .hiw-scroll[id]");
  const navLinks = document.querySelectorAll(".nav-link[data-section]");

  // How It Works horizontal scroll
  const hiwSection = document.querySelector(".hiw-scroll");
  const hiwTrack = document.querySelector(".hiw-track");
  const hiwSlideCount = document.querySelectorAll(".hiw-slide").length;

  // Protocol scroll-driven cards
  const protocolSection = document.querySelector(".protocol-scroll");
  const protocolCards = document.querySelectorAll(".protocol-card");
  const protocolDots = document.querySelectorAll(".protocol-dots .dot");
  const cardCount = protocolCards.length;

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        // How It Works — translate track horizontally based on vertical scroll
        if (hiwSection && hiwTrack) {
          const hiwRect = hiwSection.getBoundingClientRect();
          const hiwHeight = hiwSection.offsetHeight;
          const hiwScrolled = -hiwRect.top;
          const hiwProgress = Math.max(0, Math.min(1, hiwScrolled / (hiwHeight - window.innerHeight)));
          const maxShift = (hiwSlideCount - 1) * 100; // in vw
          hiwTrack.style.transform = "translateX(-" + (hiwProgress * maxShift) + "vw)";
        }

        // Protocol card switching based on scroll progress
        if (protocolSection) {
          const rect = protocolSection.getBoundingClientRect();
          const sectionHeight = protocolSection.offsetHeight;
          const scrolled = -rect.top;
          const progress = Math.max(0, Math.min(1, scrolled / (sectionHeight - window.innerHeight)));
          const activeIndex = Math.min(cardCount - 1, Math.floor(progress * cardCount));

          protocolCards.forEach((card, i) => {
            card.classList.toggle("active", i === activeIndex);
          });
          protocolDots.forEach((dot, i) => {
            dot.classList.toggle("active", i === activeIndex);
          });
        }

        // Active nav link tracking
        let current = "";
        sections.forEach((section) => {
          const top = section.offsetTop - 120;
          if (window.scrollY >= top) {
            current = section.getAttribute("id");
          }
        });
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.dataset.section === current);
        });

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ── Copy-to-clipboard ──
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = "Copied!";
  document.body.appendChild(toast);

  let toastTimeout;
  document.querySelectorAll(".contract-addr").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const addr = btn.dataset.address;
      if (!addr) return;
      try {
        await navigator.clipboard.writeText(addr);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = addr;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      toast.classList.add("show");
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => toast.classList.remove("show"), 1500);
    });
  });

  // ── Smooth scroll for nav links ──
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});
