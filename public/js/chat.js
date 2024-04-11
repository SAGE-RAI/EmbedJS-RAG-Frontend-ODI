// Function to render Markdown content using React
async function renderMarkdown(markdown, containerId) {
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const ReactMarkdown = window.ReactMarkdown;

    if (!window.React || !window.ReactDOM || !ReactMarkdown) {
        console.error('React, ReactDOM, or ReactMarkdown is not loaded.');
        return;
    }

    // Ensure the container exists
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('The specified containerId does not exist in the DOM.');
        return;
    }

    // Create a root to render the Markdown content
    const root = ReactDOM.createRoot(container);

    // Render the Markdown component
    root.render(
        React.createElement(ReactMarkdown, null, markdown)
    );
    setTimeout(() => scrollToBottom('msgs_cont'), 100);
}

async function renderMarkdownWordByWord(markdown, containerId) {
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const ReactMarkdown = window.ReactMarkdown;

    if (!window.React || !window.ReactDOM || !ReactMarkdown) {
        console.error('React, ReactDOM, or ReactMarkdown is not loaded.');
        return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
        console.error('The specified containerId does not exist in the DOM.');
        return;
    }

    const root = ReactDOM.createRoot(container);

    // Split the markdown content into a series of tokens that could be words or markdown symbols
    const tokens = markdown.match(/([^\s]+|\s+)/g); // Matches words and whitespace

    let currentIndex = 0;

    // Function to incrementally update the content, preserving Markdown
    const updateContent = () => {
        if (currentIndex >= tokens.length) return;

        // Construct the current content slice with proper Markdown
        const currentContent = tokens.slice(0, currentIndex + 1).join('');
        root.render(
            React.createElement(ReactMarkdown, null, currentContent)
        );

        currentIndex++;
        scrollToBottom('msgs_cont');
        setTimeout(updateContent, 50); // Adjust the delay as needed
    };

    updateContent(); // Start the rendering process
}

function scrollToBottom(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function renderMessage(message) {
    const listCont = document.querySelector('.list_cont');

    // Generate a unique ID for the new message, if not provided
    const messageId = message.id || `msg-${new Date().getTime()}`;

    // Create a new <li> element
    const newLi = document.createElement('li');
    newLi.id = messageId;
    newLi.className = message.role; // Assuming 'role' is part of the message object for styling purposes

    // Append the new <li> to the list container
    listCont.appendChild(newLi);

    // Call renderMarkdownWordByWord to render the message inside the new <li>
    // Make sure renderMarkdownWordByWord is defined in the global scope
    renderMarkdownWordByWord(message.content, messageId);
}