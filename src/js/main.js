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

const initContactForm = () => {
  const form = document.getElementById("contact-section-form");
  const submitBtn = document.getElementById("contact-submit-btn");
  const overlay = document.getElementById("contact-success-overlay");
  const closeBtn = document.getElementById("contact-success-close");

  if (!form || !overlay) return;

  const showOverlay = () => {
    // Scroll form into view first
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    
    // Hide form and show overlay
    setTimeout(() => {
      form.style.opacity = "0";
      form.style.pointerEvents = "none";
      overlay.classList.remove("hidden");
      requestAnimationFrame(() => {
        overlay.classList.remove("opacity-0");
      });
    }, 300);
  };

  const hideOverlay = () => {
    overlay.classList.add("opacity-0");
    setTimeout(() => {
      overlay.classList.add("hidden");
      form.style.opacity = "1";
      form.style.pointerEvents = "auto";
      form.reset();
    }, 300);
  };

  const handleClose = () => {
    hideOverlay();
  };

  if (closeBtn) {
    closeBtn.addEventListener("click", handleClose);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
      handleClose();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!submitBtn) return;

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    submitBtn.classList.add("opacity-70", "cursor-not-allowed");

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        showOverlay();
      } else {
        const data = await response.json();
        if (data.errors) {
          alert("There was an error submitting your form. Please try again.");
        } else {
          alert("There was an error submitting your form. Please try again.");
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      alert("There was an error submitting your form. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.classList.remove("opacity-70", "cursor-not-allowed");
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initContactForm();
});
