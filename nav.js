/* ============================================================
   nav.js — Navbar Vue.js
   
   Fonctionnalités :
   - Glassmorphism au scroll (isScrolled)
   - Section active détectée via IntersectionObserver (activeSection)
   - Menu mobile avec animation (menuOpen)
   - Fermeture automatique au clic sur un lien
   ============================================================ */

const { createApp, ref, onMounted, onUnmounted } = Vue;

createApp({
    setup() {

        /* ── État réactif ── */
        const isScrolled     = ref(false);
        const menuOpen       = ref(false);
        const activeSection  = ref('');

        /* ── Liens de navigation ── */
        const links = [
            { href: '#fonctionnement', label: 'Comment ça marche', id: 'fonctionnement' },
            { href: '#sous-traitance', label: 'Sous-traitance',    id: 'sous-traitance' },
            { href: '#module',         label: 'Module rentabilité', id: 'module'         },
            { href: '#tarifs',         label: 'Tarifs',             id: 'tarifs'         },
        ];

        /* ── Scroll : glassmorphism ── */
        function onScroll() {
            isScrolled.value = window.scrollY > 20;
        }

        /* ── Menu mobile ── */
        function toggleMenu() {
            menuOpen.value = !menuOpen.value;

            // Bloquer le scroll body quand le menu est ouvert
            document.body.style.overflow = menuOpen.value ? 'hidden' : '';
        }

        function closeMenu() {
            menuOpen.value = false;
            document.body.style.overflow = '';
        }

        /* ── Section active via IntersectionObserver ── */
        let observer;

        function initObserver() {
            const sections = document.querySelectorAll('section[id]');
            if (!sections.length) return;

            observer = new IntersectionObserver(
                function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            activeSection.value = entry.target.id;
                        }
                    });
                },
                { threshold: 0.4 }
            );

            sections.forEach(function(section) {
                observer.observe(section);
            });
        }

        /* ── Lifecycle ── */
        onMounted(function() {
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
            initObserver();
        });

        onUnmounted(function() {
            window.removeEventListener('scroll', onScroll);
            if (observer) observer.disconnect();
            document.body.style.overflow = '';
        });

        return {
            isScrolled,
            menuOpen,
            activeSection,
            links,
            toggleMenu,
            closeMenu,
        };
    }
}).mount('#nav-app');