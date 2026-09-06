
async function loaded(): Promise<void> {
}

document.addEventListener("DOMContentLoaded", () => {
    loaded().catch((error) => {
        console.error(error);
    });
});


export function toggleExpand(element: HTMLElement, updateCursor?: boolean): void {
    const parentElement = element.closest('.collapsed, .expanded, .non-expandable') as HTMLElement | null;
    const nonExpandable = element.closest('.non-expandable');
    if (parentElement && parentElement !== nonExpandable) {
        let expanded = parentElement.classList.contains('expanded');
        if (expanded) {
            parentElement.classList.remove('expanded');
            parentElement.classList.add('collapsed');
        } else {
            parentElement.classList.remove('collapsed');
            parentElement.classList.add('expanded');
        }
    }
    if (updateCursor) {
        element.style.cursor = 'auto';
    }
}

