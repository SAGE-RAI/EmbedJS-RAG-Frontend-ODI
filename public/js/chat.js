// Function to render Markdown content using React
// Function to render Markdown content using React
async function renderMarkdown(markdown, container, callback) {
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const ReactMarkdown = window.ReactMarkdown;
    const { useEffect, useState } = React;

    if (!window.React || !window.ReactDOM || !ReactMarkdown) {
        console.error('React, ReactDOM, or ReactMarkdown is not loaded.');
        return;
    }

    // Define a functional component for rendering Markdown
    const MarkdownComponent = ({ markdown }) => {
        useEffect(() => {
            // Call the callback function if it's provided
            if (callback && typeof callback === 'function') {
                callback();
            }
            // Scroll to bottom after rendering
            setTimeout(() => scrollToBottom('msgs_cont'), 100);
        }, []); // Empty dependency array to ensure the effect runs only once after initial render

        return React.createElement(ReactMarkdown, null, markdown);
    };

    // Create a root to render the Markdown content
    const root = ReactDOM.createRoot(container);

    // Render the Markdown component
    root.render(
        React.createElement(MarkdownComponent, { markdown })
    );
}

function renderMarkdownWordByWord(markdown, container, callback) {
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const ReactMarkdown = window.ReactMarkdown;

    if (!window.React || !window.ReactDOM || !ReactMarkdown) {
        console.error('React, ReactDOM, or ReactMarkdown is not loaded.');
        return;
    }

    const root = ReactDOM.createRoot(container);

    // Split the markdown content into a series of tokens that could be words or markdown symbols
    const tokens = markdown.match(/([^\s]+|\s+)/g); // Matches words and whitespace

    let currentIndex = 0;

    // Function to incrementally update the content, preserving Markdown
    const updateContent = () => {
        if (currentIndex >= tokens.length) {
            // Call the callback function if it's provided
            if (callback && typeof callback === 'function') {
                callback();
            }
            return;
        }

        // Construct the current content slice with proper Markdown
        const currentContent = tokens.slice(0, currentIndex + 1).join('');
        root.render(
            React.createElement(ReactMarkdown, null, currentContent)
        );

        currentIndex++;
        scrollToBottom('msgs_cont');
        setTimeout(updateContent, 10); // Adjust the delay as needed
    };

    updateContent(); // Start the rendering process
}

function scrollToBottom(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function renderMessage(message, existingElement = null) {
    const listCont = document.querySelector('.list_cont');

    // Generate a unique ID for the new message, if not provided
    const messageId = message.id || `msg-${new Date().getTime()}`;

    // If an existing element is provided, use it; otherwise, create a new <li> element
    const element = existingElement || document.createElement('li');
    element.id = messageId;
    element.className = message.message.role; // Assuming 'role' is part of the message object for styling purposes

    // If an existing element is provided, clear its content before rendering the new message
    if (!existingElement) {
        // Append the new <li> to the list container
        listCont.appendChild(element);
    } else {
        // Clear existing content
        element.innerHTML = '';
    }

    // Call renderMarkdownWordByWord or renderMarkdown to render the message inside the new element
    // Make sure renderMarkdownWordByWord or renderMarkdown is defined in the global scope
    if (message.message.role === "assistant") {
        renderMarkdownWordByWord(message.message.content, element, () => {
            renderRating(message.rating, element);
        });
    } else {
        renderMarkdown(message.message.content, element, () => {
            if (message.message.role === "assistant") {
                renderRating(message.rating, element);
            }
        });
    }
}

async function loadConversation(conversationId) {
    try {
        // Fetch conversation data from the server
        const response = await fetch(`/conversation/${conversationId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch conversation data.');
        }

        const conversation = await response.json();
        const listCont = document.querySelector('.list_cont');
        listCont.innerHTML = "";
        // Iterate over the history object
        conversation.history.forEach(message => {
            // Generate a unique ID for the new message, if not provided
            const messageId = message._id || `msg-${new Date().getTime()}`;
            // If an existing element is provided, use it; otherwise, create a new <li> element
            const element = document.createElement('li');
            element.id = messageId;
            element.className = message.message.role; // Assuming 'role' is part of the message object for styling purposes
            listCont.appendChild(element);
            renderMarkdown(message.message.content, element, () => {
                if (message.message.role === "assistant") {
                    renderRating(message.rating, element);
                }
            });
        });
        document.getElementById('conversationId').value = conversationId;
        // Update the address bar with the conversation ID
        window.history.pushState({}, '', '/conversation/' + conversationId);
    } catch (error) {
        console.error('Error loading conversation:', error);
        // Handle error (e.g., show error message)
    }
}

function renderRating(rating, element) {
    const ratingContainer = document.createElement('div');
    ratingContainer.classList.add('rating-container');

    const starsContainer = document.createElement('div');
    starsContainer.classList.add('stars');

    const messageId = element.getAttribute('id');

    if (rating) {
        // Render filled stars based on the rating
        for (let i = 0; i < rating.rating; i++) {
            const star = document.createElement('span');
            star.classList.add('star');
            star.innerHTML = '&#9733; '; // Unicode for filled star symbol
            starsContainer.appendChild(star);
        }
        // Render empty stars for the remaining
        for (let i = rating.rating; i < 5; i++) {
            const star = document.createElement('span');
            star.classList.add('star');
            star.innerHTML = '&#9734; '; // Unicode for empty star symbol
            starsContainer.appendChild(star);
        }
    } else {
        // Render rating stars for user to rate the message
        starsContainer.textContent = 'Rate?: ';
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('span');
            star.classList.add('star');
            star.innerHTML = '☆ '; // Unicode for empty star symbol
            star.onmouseenter = () => handleRatingHover(messageId, i + 1);
            star.onmouseleave = () => handleRatingHover(messageId, 0);
            star.onclick = () => handleRating(messageId, i + 1);
            starsContainer.appendChild(star);
        }
    }
    ratingContainer.appendChild(starsContainer);
    element.appendChild(ratingContainer);
    scrollToBottom('msgs_cont');
}

function handleRatingHover(messageId, rating) {
    console.log('in here');
    console.log(messageId);
    console.log(rating);
    // Get the message container element by its ID
    const messageContainer = document.getElementById(messageId);
    if (!messageContainer) return; // Exit if message container not found

    // Get all star elements within the message container
    const stars = messageContainer.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.innerHTML = '★ '; // Fill in star to indicate selection
        } else {
            star.innerHTML = '☆ '; // Reset star to empty
        }
    });
}

function createResponseNode() {
    const listCont = document.querySelector('.list_cont');
    // Create a new <li> element
    const newLi = document.createElement('li');
    newLi.className = 'assistant';

    // Create a <div> element for the typing animation
    const typingAnimationDiv = document.createElement('div');
    typingAnimationDiv.className = 'typing-animation';

    // Add three dots for the typing animation
    for (let i = 0; i < 3; i++) {
        const dotSpan = document.createElement('span');
        dotSpan.className = 'dot';
        typingAnimationDiv.appendChild(dotSpan);
    }

    // Append the typing animation <div> to the new <li> element
    newLi.appendChild(typingAnimationDiv);
    listCont.appendChild(newLi);

    return newLi;
}

async function newConversation() {
    try {
        // Make a POST request to /conversation/create
        const response = await fetch('/conversation/create', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to create conversation.');
        }

        const data = await response.json();

        // Update the address bar with the conversation ID
        window.history.pushState({}, '', '/conversation/' + data.id);

        // Return the conversation ID
        return data.id;
    } catch (error) {
        console.error('Error creating conversation:', error);
        throw error; // Propagate the error to the calling function
    }
}

async function handleSubmit(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    const form = event.target; // Get the form element
    const messageInput = form.querySelector('#txt'); // Get the message input field within the form
    const content = messageInput.value.trim(); // Get the message content from the input field

    if (content === '') {
        alert('Please enter a message.');
        return;
    }

    const conversationIdInput = form.querySelector('#conversationId'); // Get the conversation ID input field within the form
    let conversationId = conversationIdInput.value; // Get the conversation ID value from the input field

    const messageData = {
        content: content,
        role: 'user'
    };

    // If there's no existing conversation ID, call newConversation to get it
    if (!conversationId) {
        try {
            // Call newConversation to get the conversation ID
            conversationId = await newConversation();

            // Update the conversation ID input field with the new conversation ID
            conversationIdInput.value = conversationId;
        } catch (error) {
            console.error('Error creating conversation:', error);
            alert('Failed to create conversation. Please try again.');
            return; // Exit the function early if there's an error
        }
    }

    // Continue with sending the message
    sendMessage(conversationId, messageData);
}

async function sendMessage(conversationId, message) {
    let newMessage = {};
    newMessage.message = message;
    renderMessage(newMessage);
    const messageInput = document.getElementById('txt');
    const responseLi = createResponseNode();
    messageInput.value = ''; // Clear the input field

    try {
        const response = await fetch(`/openai-completion/${conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            throw new Error('Failed to send message.');
        }

        const responseMessage = await response.json();
        renderMessage(responseMessage, responseLi); // Render the message
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
        responseLi.remove();
    }
}
