// Language Switcher JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const languageSwitcher = document.getElementById('language-switcher');
    const languageMenu = document.getElementById('language-menu');
    const switchToIt = document.getElementById('switch-to-it');
    const switchToEn = document.getElementById('switch-to-en');
    
    if (!languageSwitcher || !languageMenu || !switchToIt || !switchToEn) {
        console.log('Language switcher elements not found');
        return;
    }

    // Toggle menu visibility
    languageSwitcher.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        languageMenu.style.display = languageMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!languageSwitcher.contains(e.target)) {
            languageMenu.style.display = 'none';
        }
    });

    // Get current URL and detect language
    function getCurrentLanguage() {
        const path = window.location.pathname;
        if (path.includes('/en/')) {
            return 'en';
        } else if (path.includes('/it/')) {
            return 'it';
        }
        // Default fallback - check if we're in a subdirectory structure
        return 'it'; // Default to Italian
    }

    // Switch language function
    function switchLanguage(targetLang) {
        let currentUrl = window.location.href;
        let newUrl;
        
        const currentLang = getCurrentLanguage();
        
        if (currentLang === 'en' && targetLang === 'it') {
            // Switch from English to Italian
            newUrl = currentUrl.replace('/en/', '/it/');
        } else if (currentLang === 'it' && targetLang === 'en') {
            // Switch from Italian to English
            newUrl = currentUrl.replace('/it/', '/en/');
        } else {
            // Fallback: construct new URL
            const baseUrl = window.location.origin;
            const pathWithoutLang = window.location.pathname.replace(/^\/(en|it)\//, '/');
            newUrl = `${baseUrl}/${targetLang}${pathWithoutLang}`;
        }
        
        console.log(`Switching from ${currentLang} to ${targetLang}: ${newUrl}`);
        window.location.href = newUrl;
    }

    // Event listeners for language switches
    switchToIt.addEventListener('click', function(e) {
        e.preventDefault();
        switchLanguage('it');
    });

    switchToEn.addEventListener('click', function(e) {
        e.preventDefault();
        switchLanguage('en');
    });

    // Update button text based on current language
    function updateSwitcherText() {
        const currentLang = getCurrentLanguage();
        const button = languageSwitcher;
        
        // Hide current language option
        if (currentLang === 'it') {
            switchToIt.style.display = 'none';
            switchToEn.style.display = 'block';
            button.title = 'Switch to English';
        } else {
            switchToIt.style.display = 'block';
            switchToEn.style.display = 'none';
            button.title = 'Passa all\'Italiano';
        }
    }

    // Initialize
    updateSwitcherText();
});