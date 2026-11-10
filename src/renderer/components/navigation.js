export function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and views
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            // Add active class to corresponding buttons in sidebar and mobile
            const target = btn.dataset.target;
            document.querySelectorAll(`.nav-btn[data-target="${target}"]`).forEach(b => b.classList.add('active'));
            
            // Show target view
            document.getElementById(target).classList.add('active');
        });
    });
}
