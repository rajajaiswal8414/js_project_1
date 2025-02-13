const checkBoxList = document.querySelectorAll('.custom-checkbox');
const userInput = document.querySelectorAll('.goal-input');
const errorLabel = document.querySelector('.error-label');
const progressValue = document.querySelector('.progress-value');
const progressLabel = document.querySelector('.progress-label');

const allQuotes = [
    "Raise the bar by completing your goals!",
    "Well begun is half done!",
    "Just a step away, keep going!",
    "Whoa! You just completed all the goals, time for chill :D"
]

const allGoals = JSON.parse(localStorage.getItem('allGoals')) || {};

// const allGoals = JSON.parse(localStorage.getItem('allGoals')) || {
//     first: {
//         name: '',
//         completed: false,
//     },
//     second: {
//         name: '',
//         completed: false,
//     },
//     third: {
//         name: '',
//         completed: false,
//     }
// };
let completedGoalsCount = Object.values(allGoals).filter((goal) => goal.completed).length;
progressValue.style.width = `${(completedGoalsCount / userInput.length) * 100}%`;
progressValue.firstElementChild.innerText = `${completedGoalsCount}/${userInput.length} completed`
progressLabel.innerHTML = allQuotes[completedGoalsCount];

checkBoxList.forEach((checkbox) => {
    checkbox.addEventListener('click', () => {
        const allGoalsAdded = [...userInput].every((input) => {
            return input.value;
        })

        if (allGoalsAdded) {
            checkbox.parentElement.classList.toggle('completed');
            const inputId = checkbox.nextElementSibling.id;
            allGoals[inputId].completed = !allGoals[inputId].completed;
            completedGoalsCount = Object.values(allGoals).filter((goal) => goal.completed).length;
            progressValue.style.width = `${(completedGoalsCount / userInput.length) * 100}%`;
            progressValue.firstElementChild.innerText = `${completedGoalsCount}/${userInput.length} completed`;
            progressLabel.innerHTML = allQuotes[completedGoalsCount];
            localStorage.setItem('allGoals', JSON.stringify(allGoals));
        }
        else {
            errorLabel.classList.add('show-error');
        }
    });
});

userInput.forEach((input) => {
    if (allGoals[input.id]) {
        input.value = allGoals[input.id].name;

        if (allGoals[input.id].completed) {
            input.parentElement.classList.add('completed');
        }
    }


    input.addEventListener('focus', () => {
        errorLabel.classList.remove('show-error');
    });

    input.addEventListener('input', (e) => {
        if (allGoals[input.id] && allGoals[input.id].completed) {
            input.value = allGoals[input.id].name;
            return;
        }

        if (allGoals[input.id]) {
            allGoals[e.target.id].name = input.value;
        }
        else {
            allGoals[e.target.id] = {
                name: input.value,
                completed: false,
            }
        }

        localStorage.setItem('allGoals', JSON.stringify(allGoals));
    });
});
