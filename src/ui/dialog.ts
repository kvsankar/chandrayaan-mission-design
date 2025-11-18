function showConfirmDialog(message: string, title: string = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal')!;
        const titleEl = document.getElementById('confirm-modal-title')!;
        const messageEl = document.getElementById('confirm-modal-message')!;
        const okBtn = document.getElementById('confirm-modal-ok')!;
        const cancelBtn = document.getElementById('confirm-modal-cancel')!;

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.style.display = 'flex';

        const handleOk = (): void => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = (): void => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

function showAlert(message: string, title: string = 'Notice'): void {
    // Create modal elements if they don't exist
    let modal = document.getElementById('custom-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-alert-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 24px;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        const titleEl = document.createElement('h3');
        titleEl.id = 'alert-modal-title';
        titleEl.style.cssText = `
            margin: 0 0 16px 0;
            color: #fff;
            font-size: 18px;
            font-weight: bold;
        `;

        const messageEl = document.createElement('pre');
        messageEl.id = 'alert-modal-message';
        messageEl.style.cssText = `
            margin: 0 0 20px 0;
            color: #ddd;
            font-size: 14px;
            white-space: pre-wrap;
            font-family: Arial, sans-serif;
            line-height: 1.5;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
        `;

        const okBtn = document.createElement('button');
        okBtn.id = 'alert-modal-ok';
        okBtn.textContent = 'OK';
        okBtn.style.cssText = `
            padding: 8px 24px;
            background: #555;
            border: 1px solid #666;
            border-radius: 4px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        okBtn.addEventListener('mouseenter', () => okBtn.style.background = '#666');
        okBtn.addEventListener('mouseleave', () => okBtn.style.background = '#555');

        buttonContainer.appendChild(okBtn);
        dialog.appendChild(titleEl);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('alert-modal-title')!;
    const messageEl = document.getElementById('alert-modal-message')!;
    const okBtn = document.getElementById('alert-modal-ok')!;

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.style.display = 'flex';

    const handleOk = (): void => {
        modal!.style.display = 'none';
        okBtn.removeEventListener('click', handleOk);
    };

    okBtn.addEventListener('click', handleOk);
}

export { showConfirmDialog, showAlert };
