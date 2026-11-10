export const Modal = {
    show: (title, message, buttons) => {
        const container = document.getElementById('modal-container');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        
        const actions = document.getElementById('modal-actions');
        actions.innerHTML = '';
        
        buttons.forEach(btn => {
            const b = document.createElement('button');
            b.className = `btn ${btn.primary ? 'btn-primary' : 'btn-secondary'}`;
            b.textContent = btn.text;
            b.addEventListener('click', () => {
                if (btn.onClick) btn.onClick();
                container.classList.add('hidden');
            });
            actions.appendChild(b);
        });
        
        container.classList.remove('hidden');
    },
    alert: (title, message) => {
        Modal.show(title, message, [{ text: 'OK', primary: true }]);
    },
    confirm: (title, message, onConfirm) => {
        Modal.show(title, message, [
            { text: 'Cancel', primary: false },
            { text: 'Confirm', primary: true, onClick: onConfirm }
        ]);
    }
};
