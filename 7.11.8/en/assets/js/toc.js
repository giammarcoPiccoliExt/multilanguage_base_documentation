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

    // Funzione per trasformare i link anchor da path/# a path/index.html#
    function fixAnchorLinks() {
        // Seleziona tutti i link nel documento
        let allLinks = document.querySelectorAll('a[href]');
        
        allLinks.forEach(link => {
            let href = link.getAttribute('href');
            if (href) {
                // Controlla se il link ha il pattern path/#anchor (ma non inizia con #)
                let anchorMatch = href.match(/^([^#]+)\/#{1}(.+)$/);
                if (anchorMatch) {
                    let path = anchorMatch[1]; // La parte prima di /#
                    let anchor = anchorMatch[2]; // La parte dopo #
                    
                    // Trasforma in path/index.html#anchor
                    let newHref = path + '/index.html#' + anchor;
                    link.setAttribute('href', newHref);
                    console.log('Fixed anchor link:', href, '->', newHref);
                }
                // Controlla se il link finisce con / (ma non è solo "/")
                else if (href.endsWith('/') && href !== '/') {
                    // Aggiunge index.html alla fine
                    let newHref = href + 'index.html';
                    link.setAttribute('href', newHref);
                    console.log('Fixed trailing slash link:', href, '->', newHref);
                }
            }
        });
    }

    // Funzione per rimuovere overflow-x dai wrapper delle tabelle
    function removeTableOverflow() {
        let scrollWraps = document.querySelectorAll('.md-typeset__scrollwrap');
        
        scrollWraps.forEach(wrap => {
            // Rimuove overflow-x: auto quando è sullo schermo
            wrap.style.overflowX = 'visible';
            console.log('Removed overflow-x from table wrapper');
        });
    }

    // Esegui le funzioni
    fixSidebarIndexLinks();
    fixLogoLink();
    fixAnchorLinks();
    removeTableOverflow();
});
