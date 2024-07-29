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

function renderMessage(entry, existingElement = null, newMessage = false) {
    const listCont = document.querySelector('.list_cont');

    // Generate a unique ID for the new message, if not provided
    const messageId = entry._id || `msg-${new Date().getTime()}`;

    // If an existing element is provided, use it; otherwise, create a new <li> element
    const element = existingElement || document.createElement('li');
    element.innerHTML = '';
    element.id = messageId;
    element.className = entry.content.sender; // Assuming 'sender' is part of the message object for styling purposes

    // Create three divs inside the list item for message, sources, and rating with respective classes
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    const sourcesDiv = document.createElement('div');
    sourcesDiv.classList.add('sources');
    const ratingDiv = document.createElement('div');
    ratingDiv.id = messageId;
    ratingDiv.classList.add('rating');

    // Append the three divs to the list item
    element.appendChild(messageDiv);

    // Create the copy button and append only if sender is "AI"
    if (entry.content.sender === "AI") {
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.innerHTML = '<i class="fa fa-copy"></i>'; // Add your desired icon here

        // Add event listener to copy the message to the clipboard
        copyButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent form submission
            navigator.clipboard.writeText(entry.content.message).then(() => {
                console.log('Message copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy message: ', err);
            });
        });

        element.appendChild(copyButton); // Insert copy button before sourcesDiv
    }

    element.appendChild(sourcesDiv);
    element.appendChild(ratingDiv);

    // If an existing element is provided, clear its content before rendering the new message
    if (!existingElement) {
        // Append the new <li> to the list container
        listCont.appendChild(element);
    } else {
        // Clear existing content of message, sources, and rating divs
        messageDiv.innerHTML = '';
        sourcesDiv.innerHTML = '';
        ratingDiv.innerHTML = '';
    }

    // Call renderMarkdownWordByWord or renderMarkdown to render the message inside the message div
    // Make sure renderMarkdownWordByWord or renderMarkdown is defined in the global scope
    if (entry.content.sender === "AI" && newMessage) {
        renderMarkdownWordByWord(entry.content.message, messageDiv, () => {
            renderSources(entry.sources, sourcesDiv);
            renderRating(entry.rating, ratingDiv);
        });
    } else {
        renderMarkdown(entry.content.message, messageDiv, () => {
            if (entry.content.sender === "AI") {
                renderSources(entry.sources, sourcesDiv);
                renderRating(entry.rating, ratingDiv);
            }
        });
    }
}


async function loadConversation(conversationId) {
    const listCont = document.querySelector('.list_cont');
    listCont.innerHTML = "";
    document.getElementById('conversationId').value = null;
    const instanceId = getInstanceIdFromPath();
    try {
        // Fetch conversation data from the server
        const response = await fetch(`/instances/${instanceId}/conversations/${conversationId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch conversation data.');
        }

        const conversation = await response.json();
        // Iterate over the entries object
        conversation.entries.forEach(entry => {
            renderMessage(entry, null, false);
        });
        document.getElementById('conversationId').value = conversationId;
        // Update the address bar with the conversation ID
        window.history.pushState({}, '', `/instances/${instanceId}/conversations/${conversationId}`);
    } catch (error) {
        console.error('Error loading conversation:', error);
        // Handle error (e.g., show error message)
    }
}

async function renderSources(sources, element) {
    const instanceId = getInstanceIdFromPath();
    if (sources && sources.length > 0) {
        const sourcesHeading = document.createElement('h3');
        sourcesHeading.textContent = 'Sources';

        const tooltipIcon = document.createElement('span');
        tooltipIcon.textContent = '?';
        tooltipIcon.classList.add('tooltip-icon');
        tooltipIcon.setAttribute('data-tooltip', 'Sources are shown for the last three queries you have made. You might need to refine your query if the sources are missing or innacurate.');

        sourcesHeading.appendChild(tooltipIcon);
        element.appendChild(sourcesHeading);

        const sourcesList = document.createElement('ul');
        sourcesList.classList.add('sources-list');

        for (const sourceObj of sources) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');

            // If loaderId is present, fetch title from /instances/sources/:loaderId
            if (sourceObj.loaderId) {
                try {
                    const response = await fetch(`/instances/${instanceId}/sources/${sourceObj.loaderId}`);
                    const data = await response.json();
                    // Set link text to the title if available, otherwise use source URL
                    link.textContent = data.loader.title || sourceObj.source;

                    // Set href to overrideUrl if available, otherwise use source URL
                    link.href = data.loader.overrideUrl || sourceObj.source;
                } catch (error) {
                    console.error('Error fetching source title:', error);
                    // If there's an error, use source URL for both link text and href
                    link.textContent = sourceObj.source;
                    link.href = sourceObj.source;
                }
            } else {
                // If loaderId is not present, use source URL for both link text and href
                link.textContent = sourceObj.source;
                link.href = sourceObj.source;
            }

            link.target = '_blank'; // Open link in a new tab
            listItem.appendChild(link);

            sourcesList.appendChild(listItem);
        }

        element.appendChild(sourcesList);

        // Initialize tooltips using plain JavaScript for simplicity
        tooltipIcon.addEventListener('mouseover', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            tooltip.textContent = tooltipText;
            this.appendChild(tooltip);
        });

        tooltipIcon.addEventListener('mouseout', function() {
            const tooltip = this.querySelector('.tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    }
}

 // Need to move this somewhere.
const defaultRatingResponses = {
    1: [
        "Don't like the style",
        "Not factually correct",
        "Didn't fully follow instructions",
        "Refused when it shouldn't have",
        "Wrong or no sources"
    ],
    2: [
        "Not helpful",
        "Confusing response",
        "Didn't provide enough detail",
        "Incomplete information",
        "Wrong or no sources",
    ],
    3: [
        "Somewhat helpful",
        "Partially correct",
        "Room for improvement",
        "Average response",
        "Needs more detail"
    ],
    4: [
        "Quite helpful",
        "Mostly correct",
        "Good response",
        "Well-written",
        "Informative"
    ],
    5: [
        "Very helpful",
        "Completely correct",
        "Excellent response",
        "Clear and concise",
        "Highly informative"
    ]
};

function renderRating(rating, element) {
    console.log(rating);
    element.innerHTML = '';
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
            star.onclick = () => {
                const rating = i + 1;
                handleRating(element, messageId, rating, "");
            };
            starsContainer.appendChild(star);
        }
    }
    ratingContainer.appendChild(starsContainer);
    element.appendChild(ratingContainer);
}

function displayResponseChoices(element, messageId, rating) {
    const responses = defaultRatingResponses[rating.rating];
    const choicesContainer = document.createElement('div');
    choicesContainer.classList.add('response-choices');

    const closeButton = document.createElement('span');
    closeButton.classList.add('closeButton');
    closeButton.innerHTML = 'X';
    closeButton.onclick = () => {
        renderRating(rating, element);
    };
    choicesContainer.appendChild(closeButton);

    const heading = document.createElement('h3');
    heading.innerHTML = 'Tell us more?';
    choicesContainer.appendChild(heading);

    // Create buttons for each response choice
    responses.forEach(response => {
        const choiceButton = document.createElement('button');
        choiceButton.type = 'button';
        choiceButton.textContent = response;
        choiceButton.onclick = () => {
            handleRating(element, messageId, rating.rating, response);
        };

        choicesContainer.appendChild(choiceButton);
    });

    // Create "Other" button
    const otherButton = document.createElement('button');
    otherButton.type = 'button';
    otherButton.textContent = 'Other';
    otherButton.onclick = () => {
        clearChoicesAndDisplayInput(element, messageId, rating);
    };
    choicesContainer.appendChild(otherButton);

    element.appendChild(choicesContainer);
}

function clearChoicesAndDisplayInput(element, messageId, rating) {
    // Remove all buttons
    element.innerHTML = '';

    // Create a text input field
    const inputContainer = document.createElement('div');
    inputContainer.classList.add('other-input-container');

    const heading = document.createElement('h3');
    heading.innerHTML = 'Tell us more?';

    const inputField = document.createElement('textarea');
    inputField.placeholder = 'Enter your own comment...';

    const submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.textContent = 'Submit';
    submitButton.onclick = () => {
        const customComment = inputField.value.trim();
        if (customComment) {
            handleRating(element, messageId, rating.rating, customComment);
        }
    };

    // Create close button (X)
    const closeButton = document.createElement('span');
    closeButton.classList.add('closeButton');
    closeButton.innerHTML = 'X';
    closeButton.onclick = () => {
        renderRating(rating, element);
    };

    inputContainer.appendChild(closeButton);
    inputContainer.appendChild(heading);
    inputContainer.appendChild(inputField);
    inputContainer.appendChild(submitButton);
    element.appendChild(inputContainer);
}

async function handleRating(element, entryId, starRating, message) {
    try {
        // Get the conversation ID from the hidden input field
        const conversationId = document.getElementById('conversationId').value;
        const instanceId = getInstanceIdFromPath();

        // Construct the rating object
        const ratingData = {
            rating: starRating,
            comment: message
        };

        // Perform a POST request to update the rating
        const response = await fetch(`/instances/${instanceId}/conversations/${conversationId}/messages/${entryId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rating: ratingData })
        });

        if (!response.ok) {
            throw new Error('Failed to update rating');
        }

        const responseData = await response.json();
        renderRating(ratingData, element);
        if (message === "") {
            displayResponseChoices(element, entryId, ratingData);
        }

        // Optionally, handle success response

    } catch (error) {
        console.error('Error handling rating:', error);
        // Optionally, handle error
    }
}

function handleRatingHover(messageId, rating) {
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
    newLi.className = 'AI';

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
        const instanceId = getInstanceIdFromPath();
        // Make a POST request to /conversations/create
        const response = await fetch(`/instances/${instanceId}/conversations/create`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to create conversation.');
        }

        const data = await response.json();

        // Update the address bar with the conversation ID
        window.history.pushState({}, '', `/instances/${instanceId}/conversations/${data.id}`);

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
        message: content,
        sender: 'HUMAN'
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
    newMessage.content = message;
    renderMessage(newMessage, null, true);
    const messageInput = document.getElementById('txt');
    const responseLi = createResponseNode();
    messageInput.value = ''; // Clear the input field

    const instanceId = getInstanceIdFromPath();

    try {
        const response = await fetch(`/instances/${instanceId}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message, sender: 'HUMAN' }) // Ensure correct format
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send message.');
        }

        const responseMessage = await response.json();
        renderMessage(responseMessage, responseLi, true); // Render the message
    } catch (error) {
        console.error('Error sending message:', error);
        alert(`Failed to send message: ${error.message}`); // Display the specific error message
        responseLi.remove();
    }
}

function getInstanceIdFromPath() {
    const pathSegments = window.location.pathname.split('/');
    return pathSegments[2]; // Assumes /instances/:instanceId/... structure
}