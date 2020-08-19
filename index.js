window.onscroll = function() {myFunction()};

let navBar = document.querySelector('nav');

let sticky = navBar.offsetTop;

function myFunction() {
    if (window.pageYOffset >= sticky) {
        navBar.classList.add ('sticky')
        console.log('just checking');
    } else {
        navBar.classList.remove('sticky');
    }
}