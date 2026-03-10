const myButton = document.getElementById("myButton");
const myButton2 = document.getElementById("myButton2");

const egyjatekos = document.getElementById("egyjatekos");
const tobbjatekos = document.getElementById("tobbjatekos");

function fadeIn(element) {
    element.style.opacity = 0;
    element.style.display = 'block';
    let opacity = 0;
    const interval = setInterval(() => {
        if (opacity >= 1) {
            clearInterval(interval);
        }
        element.style.opacity = opacity;
        opacity += 0.1;
    }, 50);
}

myButton.addEventListener("click", () => {
    alert("Egyjátékos mód kiválasztva!");
    myButton.style.display = "none";
    myButton2.style.display = "none";
    egyjatekos.style.display = "none";
    tobbjatekos.style.display = "none";

    fadeIn(konnyu);
    fadeIn(kozepes);
    fadeIn(nehez);
});