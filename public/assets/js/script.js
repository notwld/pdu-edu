let currentStep = 0;
let timer;
const timerDuration = 600; 
let timeRemaining = timerDuration;

document.addEventListener("DOMContentLoaded", () => {
    showStep(currentStep);
    updateTimerDisplay(); 
    startOverallTimer(); 
});

function showStep(step) {
    const steps = document.querySelectorAll(".step");
    steps.forEach((s, index) => {
        s.classList.toggle("active", index === step);
    });

    document.getElementById("prevBtn").style.display = step === 0 ? "none" : "flex";
    document.getElementById("nextBtn").innerText = step === steps.length - 1 ? "Submit" : "Next";
}

function nextStep() {
    const steps = document.querySelectorAll(".step");
    
    // Check if at least one option is selected in the current step
    if (currentStep < steps.length - 1) {
        const radios = steps[currentStep].querySelectorAll('input[type="radio"]');
        const isAnyRadioChecked = Array.from(radios).some(radio => radio.checked);
        
        // if (!isAnyRadioChecked) {
        //     alert("Please select at least one option before proceeding.");
        //     return;
        // }

        currentStep++;
    } else {
        submitForm();
    }
    
    showStep(currentStep);
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
    }
    showStep(currentStep);
}

function startOverallTimer() {
    timer = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateTimerDisplay();
        } else {
            submitForm(); //
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById("time").textContent = formattedTime; 
}

function submitForm() {
    clearInterval(timer);
    window.location.href = "submitted.html";
}

// Match the following
const svgCanvas = document.getElementById('svgCanvas');
let selectedQuestion = null;
let tempLine = null;

// Arrays to track matched questions and answers
const matchedQuestions = [];
const matchedAnswers = [];

// Skip option checkbox
const skipCheckbox = document.getElementById('skip');

// Question selection
document.querySelectorAll('.questions li').forEach((question) => {
    question.addEventListener('click', function () {
        const questionId = this.querySelector('input').id;

        // Check if this question is already matched
        if (matchedQuestions.includes(questionId)) {
            alert("This question is already matched.");
            return;
        }

        selectedQuestion = this;
        skipCheckbox.checked = false;  // Uncheck skip if question is selected
        startLine(this);
    });
});

// Answer selection
document.querySelectorAll('.answers li').forEach((answer) => {
    answer.addEventListener('click', function () {
        const answerId = this.querySelector('input').id;

        // Ensure a question is selected before clicking the answer
        if (!selectedQuestion) {
            alert("Please select a question first.");
            return;
        }

        // Check if the answer is already matched
        if (matchedAnswers.includes(answerId)) {
            alert("This answer is already matched.");
            return;
        }

        completeLine(this);

        // Mark question and answer as matched
        const questionId = selectedQuestion.querySelector('input').id;
        matchedQuestions.push(questionId);
        matchedAnswers.push(answerId);

        selectedQuestion = null; // Reset selected question after matching
    });
});

// Skip question functionality
skipCheckbox.addEventListener('change', function () {
    if (this.checked) {
        alert("You chose to skip this question.");
        selectedQuestion = null;  // Deselect any selected question
    }
});

// Start line drawing from the selected question
function startLine(question) {
    const questionRect = question.getBoundingClientRect();
    const startX = questionRect.right - svgCanvas.getBoundingClientRect().left;
    const startY = questionRect.top + questionRect.height / 2 - svgCanvas.getBoundingClientRect().top;

    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tempLine.setAttribute('x1', startX);
    tempLine.setAttribute('y1', startY);
    tempLine.setAttribute('x2', startX);
    tempLine.setAttribute('y2', startY);
    tempLine.classList.add('line');
    svgCanvas.appendChild(tempLine);

    document.addEventListener('mousemove', moveLine);
}

// Move the line with the mouse
function moveLine(event) {
    if (tempLine) {
        const mouseX = event.clientX - svgCanvas.getBoundingClientRect().left;
        const mouseY = event.clientY - svgCanvas.getBoundingClientRect().top;
        tempLine.setAttribute('x2', mouseX);
        tempLine.setAttribute('y2', mouseY);
    }
}

// Complete the line when an answer is selected
function completeLine(answer) {
    const answerRect = answer.getBoundingClientRect();
    const endX = answerRect.left - svgCanvas.getBoundingClientRect().left;
    const endY = answerRect.top + answerRect.height / 2 - svgCanvas.getBoundingClientRect().top;

    if (tempLine) {
        tempLine.setAttribute('x2', endX);
        tempLine.setAttribute('y2', endY);
    }

    document.removeEventListener('mousemove', moveLine);
    tempLine = null;
}

// Reset function to clear the canvas and unmatched questions/answers
function resetStep() {
    matchedQuestions.length = 0;
    matchedAnswers.length = 0;

    const svgCanvas = document.getElementById('svgCanvas');
    while (svgCanvas.firstChild) {
        svgCanvas.removeChild(svgCanvas.firstChild);
    }
}
function resetStep() {
    const currentQuestionStep = document.querySelectorAll('.step')[currentStep];        
    const radios = currentQuestionStep.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.checked = false;
    });           
    const svgCanvas = document.getElementById('svgCanvas');
    while (svgCanvas.firstChild) {
        svgCanvas.removeChild(svgCanvas.firstChild);
    }
}