// utils.js
// This file contains shared utility functions that can be used across the entire application.
// This helps to avoid code duplication and ensures consistent behavior.

/**
 * Displays a temporary message to the user within a specified container element.
 * This function dynamically creates, styles, and removes the message alert.
 *
 * @param {string} message The text content of the message to display.
 * @param {'success' | 'error' | 'warning'} type The type of the message, which determines its color scheme.
 * @param {string} containerId The ID of the HTML element where the message box will be appended.
 */
export function showMessage(message, type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        // Log an error to the console if the target container doesn't exist.
        console.error(`Message container with ID "${containerId}" not found.`);
        return;
    }

    // Create the message box div element.
    const messageBox = document.createElement('div');
    messageBox.textContent = message;
    
    // Determine the Tailwind CSS classes based on the message type.
    let typeClasses = '';
    if (type === 'success') {
        typeClasses = 'bg-green-100 border-green-400 text-green-700';
    } else if (type === 'error') {
        typeClasses = 'bg-red-100 border-red-400 text-red-700';
    } else {
        // Default to 'warning' style if the type is not 'success' or 'error'.
        typeClasses = 'bg-yellow-100 border-yellow-400 text-yellow-700';
    }
    
    // Apply all necessary classes to the message box.
    messageBox.className = `p-4 mb-4 text-sm rounded-lg border ${typeClasses} transition-opacity duration-300 ease-out opacity-0`;
    messageBox.setAttribute('role', 'alert');
    
    // Add the message box to the DOM.
    container.appendChild(messageBox);

    // Use a short timeout to allow the element to be painted before adding the 'opacity-100' class, triggering the fade-in animation.
    setTimeout(() => {
        messageBox.classList.remove('opacity-0');
    }, 10);

    // Set a timer to automatically remove the message after 5 seconds.
    setTimeout(() => {
        // Fade out the message box before removing it from the DOM.
        messageBox.classList.add('opacity-0');
        // Wait for the fade-out transition to complete before removing the element.
        setTimeout(() => {
            messageBox.remove();
        }, 300); // This duration should match the transition duration.
    }, 5000);
}
