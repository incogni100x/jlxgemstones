const initNavigation = () => {
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
  const mobileMenuPanel = document.getElementById("mobileMenuPanel");
  const mobileMenuClose = document.getElementById("mobileMenuClose");
  const siteHeader = document.getElementById("siteHeader");
  const solidThreshold = siteHeader?.dataset?.solidThreshold
    ? Number(siteHeader.dataset.solidThreshold)
    : 16;

  const closeMobileMenu = () => {
    if (!mobileMenuOverlay || !mobileMenuPanel) return;
    if (mobileMenuOverlay.classList.contains("hidden")) return;

    mobileMenuPanel.classList.add("translate-x-full");
    mobileMenuOverlay.classList.add("opacity-0");

    setTimeout(() => {
      mobileMenuOverlay.classList.add("hidden");
      document.body.style.overflow = "";
    }, 300);

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
    }
  };

  const openMobileMenu = () => {
    if (!mobileMenuOverlay || !mobileMenuPanel) return;

    mobileMenuOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      mobileMenuOverlay.classList.remove("opacity-0");
      mobileMenuPanel.classList.remove("translate-x-full");
    });

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "true");
    }
  };

  if (menuToggle && mobileMenuOverlay && mobileMenuPanel) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      if (isExpanded) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    mobileMenuOverlay.addEventListener("click", (event) => {
      if (event.target === mobileMenuOverlay) {
        closeMobileMenu();
      }
    });

    if (mobileMenuClose) {
      mobileMenuClose.addEventListener("click", closeMobileMenu);
    }

    mobileMenuPanel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
    });
  }

  const updateHeaderState = () => {
    if (!siteHeader) return;
    if (window.scrollY > solidThreshold) {
      siteHeader.classList.add("header-solid");
    } else {
      siteHeader.classList.remove("header-solid");
    }
  };

  if (siteHeader) {
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    updateHeaderState();
  }
};

document.addEventListener("DOMContentLoaded", initNavigation);
