document.addEventListener("DOMContentLoaded", function () {
    let tocSidebar = document.querySelector('.md-sidebar--secondary');
    if (!tocSidebar) return;

    tocSidebar.querySelectorAll(".md-nav__item").forEach(item => {
        let subList = item.querySelector(".md-nav__list");
        let link = item.querySelector(".md-nav__link");

        if (subList) {
            item.classList.add("has-children");

            link.addEventListener("click", function (event) {
                event.preventDefault();

                let targetId = link.getAttribute("href");
                if (targetId) {
                    let targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }

                subList.style.display = subList.style.display === "block" ? "none" : "block";
                item.classList.toggle("md-nav__item--active");
            });
        }
    });

    // Funzione per trasformare i link del menu laterale da index/index.html a solo index
    function fixSidebarIndexLinks() {
        // Seleziona il menu laterale principale (sidebar primario)
        let primarySidebar = document.querySelector('.md-sidebar--primary');
        if (!primarySidebar) return;

        // Trova tutti i link nel menu laterale
        let sidebarLinks = primarySidebar.querySelectorAll('a[href*="index/index.html"]');
        
        sidebarLinks.forEach(link => {
            let href = link.getAttribute('href');
            if (href && href.includes('index/index.html')) {
                // Trasforma index/index.html in solo index
                let newHref = href.replace('index/index.html', 'index.html');
                link.setAttribute('href', newHref);
                console.log('Fixed sidebar link:', href, '->', newHref);
            }
        });
    }

    // Funzione per sostituire il "." del logo con index.html
    function fixLogoLink() {
        // Cerca il logo con href="."
        let logoLinks = document.querySelectorAll('a.md-nav__button');
        
        logoLinks.forEach(logo => {
            let href = logo.getAttribute('href');
            if (href === '.' || href === '..') {
                // Sostituisce "." con "index.html"
                logo.setAttribute('href', 'index.html');
                console.log('Fixed logo link from "." to "index.html"');
            }
        });
    }


    // Esegui le funzioni
    fixSidebarIndexLinks();
    fixLogoLink();
});
